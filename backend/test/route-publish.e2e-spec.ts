import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configurarHttp } from './../src/configurar-http.js';
import { PrismaService } from './../src/prisma.service.js';

// Spec 007 — T9. Corre contra la base de DATABASE_URL (con la migración routes_publish y las
// rutas de ejemplo cargadas). Crea dos usuarios con correo único; cada uno sube por
// POST /activities/sync una actividad de 3 km y otra de 1 km, en el océano Pacífico, lejos de
// las rutas de ejemplo y de los centros del e2e de la spec 006. Las pruebas corren en orden
// y comparten la ruta publicada. Al final borra las rutas de los usuarios (la relación con
// el creador y con la actividad no se borra en cascada; sus favoritas sí) y luego a los
// usuarios, que se llevan en cascada sus actividades y favoritas.

const INICIO = { lat: 24.0, lng: -127.0 };
const CATALOGO_EMAIL = 'catalogo@senda.bc';

// `n` puntos hacia el norte, ~111 m entre cada uno, con altitud creciente.
function puntos(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    sequence: i + 1,
    latitude: INICIO.lat + i * 0.001,
    longitude: INICIO.lng,
    altitude: 500 + i * 10,
    accuracy: 4.8,
    recordedAt: new Date(Date.UTC(2026, 9, 20, 15) + i * 30_000).toISOString(),
  }));
}

function actividad(distanceMeters: number, n: number) {
  const points = puntos(n);
  return {
    clientGeneratedId: randomUUID(),
    type: 'HIKING',
    startedAt: points[0].recordedAt,
    endedAt: points.at(-1)!.recordedAt,
    distanceMeters,
    durationSeconds: 3600,
    // 3 km con 350 m a pie: Moderada por la elevación (RN-6).
    elevationGainMeters: 350,
    elevationLossMeters: 0,
    elevationSource: 'GPS',
    points,
  };
}

describe('Publicar rutas, detalle y favoritas (e2e, spec 007)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const emailA = `e2e-publicar-a-${randomUUID()}@senda.bc`;
  const emailB = `e2e-publicar-b-${randomUUID()}@senda.bc`;
  const password = 'contrasena-e2e';
  let userA: string;
  let userB: string;
  let tokenA: string;
  let tokenB: string;

  // Actividades del servidor (id de POST /activities/sync).
  let larga: string; // A, 3 km, 28 puntos
  let corta: string; // A, 1 km
  let deB: string; // B, 3 km
  // La ruta que A publica con `larga`; la comparten las pruebas en orden.
  let ruta: string;
  let ejemplo: string;

  const http = () => request(app.getHttpServer());
  const como = (token: string) => ({
    get: (url: string) =>
      http().get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      http().post(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) =>
      http().patch(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) =>
      http().put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) =>
      http().delete(url).set('Authorization', `Bearer ${token}`),
  });

  async function crearUsuario(email: string, displayName: string) {
    const creado = await http()
      .post('/user')
      .send({ email, displayName, password })
      .expect(201);
    const login = await http()
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return { id: creado.body.id as string, token: login.body.token as string };
  }

  async function subir(token: string, activities: unknown[]) {
    const res = await como(token)
      .post('/activities/sync')
      .send({ activities })
      .expect(200);
    for (const r of res.body.results) expect(r.status).toBe('CREATED');
    return res.body.results.map((r: { id: string }) => r.id) as string[];
  }

  async function idsCercanos(token: string) {
    const res = await como(token)
      .get('/routes/nearby')
      .query({ lat: INICIO.lat, lng: INICIO.lng, radiusKm: 5 })
      .expect(200);
    return res.body.map((r: { id: string }) => r.id) as string[];
  }

  async function favoritaDe(token: string, id: string) {
    const res = await como(token).get('/routes/favorites').expect(200);
    return res.body.find((f: { id: string }) => f.id === id) as
      { available: boolean } | undefined;
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configurarHttp(app);
    await app.init();
    prisma = app.get(PrismaService);

    ({ id: userA, token: tokenA } = await crearUsuario(emailA, 'Autora A'));
    ({ id: userB, token: tokenB } = await crearUsuario(emailB, 'Autor B'));
    [larga, corta] = await subir(tokenA, [
      actividad(3_000, 28),
      actividad(1_000, 10),
    ]);
    [deB] = await subir(tokenB, [actividad(3_000, 28)]);

    const deEjemplo = await prisma.route.findFirst({
      where: { status: 'PUBLISHED', createdBy: { email: CATALOGO_EMAIL } },
      select: { id: true },
    });
    if (!deEjemplo) {
      throw new Error('Faltan las rutas de ejemplo: npm run seed:rutas');
    }
    ejemplo = deEjemplo.id;
  }, 60_000);

  afterAll(async () => {
    const usuarios = [userA, userB].filter(Boolean);
    await prisma?.route.deleteMany({
      where: { createdByUserId: { in: usuarios } },
    });
    await prisma?.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await app?.close();
  });

  it('sin token responde 401 en todos los endpoints nuevos (CA-27)', async () => {
    const id = randomUUID();
    await http().post('/routes').send({}).expect(401);
    await http().get('/routes/mine').expect(401);
    await http().get('/routes/favorites').expect(401);
    await http().get(`/routes/${id}`).expect(401);
    await http().patch(`/routes/${id}`).send({}).expect(401);
    await http().delete(`/routes/${id}`).expect(401);
    await http().put(`/routes/${id}/favorite`).expect(401);
    await http().delete(`/routes/${id}/favorite`).expect(401);
  });

  it('publica la actividad de 3 km: 201 con perfil, dificultad e isMine (CA-6, CA-11)', async () => {
    const res = await como(tokenA)
      .post('/routes')
      .send({
        activityId: larga,
        name: '  Cañada del Pacífico  ',
        description: 'Ruta de prueba e2e.',
        region: 'Océano',
        // Lo descarta el whitelist: sale de la actividad (RN-1).
        type: 'CYCLING',
        difficulty: 'EASY',
      })
      .expect(201);
    ruta = res.body.id;

    expect(res.body).toMatchObject({
      name: 'Cañada del Pacífico',
      description: 'Ruta de prueba e2e.',
      region: 'Océano',
      type: 'HIKING',
      difficulty: 'MODERATE',
      distanceMeters: 3_000,
      elevationGainMeters: 350,
      author: 'Autora A',
      isMine: true,
      isFavorite: false,
      status: 'PUBLISHED',
      sourceActivityId: larga,
    });
    expect(res.body.start.latitude).toBeCloseTo(INICIO.lat, 6);
    expect(res.body.start.longitude).toBeCloseTo(INICIO.lng, 6);
    // 28 puntos en línea recta se simplifican; el perfil conserva todos (≤ 200).
    expect(res.body.path.length).toBeGreaterThanOrEqual(2);
    expect(res.body.path.length).toBeLessThan(28);
    expect(res.body.elevationProfile).toHaveLength(28);
    expect(res.body.elevationProfile[0]).toEqual([0, 500]);
    expect(res.body.elevationProfile.at(-1)[1]).toBe(770);
    expect(res.body.elevationProfile.at(-1)[0]).toBeCloseTo(27 * 111.2, -1);
    expect(Date.parse(res.body.publishedAt)).not.toBeNaN();
  });

  it('la ruta aparece en nearby para todos, marcada como mía solo para A (CA-6)', async () => {
    expect(await idsCercanos(tokenB)).toContain(ruta);

    const res = await como(tokenA)
      .get('/routes/nearby')
      .query({ lat: INICIO.lat, lng: INICIO.lng, radiusKm: 5 })
      .expect(200);
    expect(res.body.find((r: { id: string }) => r.id === ruta)).toMatchObject({
      isMine: true,
      difficulty: 'MODERATE',
    });
  });

  it('el detalle para otro usuario no trae la actividad de origen', async () => {
    const res = await como(tokenB).get(`/routes/${ruta}`).expect(200);
    expect(res.body).toMatchObject({
      isMine: false,
      author: 'Autora A',
      sourceActivityId: null,
    });
  });

  it('publicar otra vez la misma actividad responde 409 (RN-2, CA-8)', async () => {
    const res = await como(tokenA)
      .post('/routes')
      .send({ activityId: larga, name: 'Otra vez' })
      .expect(409);
    expect(res.body.message).toBe('Esta actividad ya tiene una ruta publicada');
  });

  it('la actividad de 1 km responde 400 (RN-5, CA-9)', async () => {
    const res = await como(tokenA)
      .post('/routes')
      .send({ activityId: corta, name: 'Corta' })
      .expect(400);
    expect(res.body.message).toBe('Una ruta debe medir al menos 1.5 km');
  });

  it('una actividad de otra cuenta o inexistente responde 404 (CA-9)', async () => {
    await como(tokenA)
      .post('/routes')
      .send({ activityId: deB, name: 'Ajena' })
      .expect(404);
    await como(tokenA)
      .post('/routes')
      .send({ activityId: randomUUID(), name: 'No existe' })
      .expect(404);
    expect(await prisma.route.count({ where: { sourceActivityId: deB } })).toBe(
      0,
    );
  });

  it('un nombre vacío o de 41 caracteres responde 400 con el error del campo (CA-5)', async () => {
    for (const name of ['   ', 'n'.repeat(41)]) {
      const res = await como(tokenB)
        .post('/routes')
        .send({ activityId: deB, name })
        .expect(400);
      expect(Object.keys(res.body.errors)).toEqual(['name']);
    }
    expect(await prisma.route.count({ where: { sourceActivityId: deB } })).toBe(
      0,
    );
  });

  it('B guarda la ruta dos veces y queda una sola favorita (CA-15, CA-16)', async () => {
    await como(tokenB).put(`/routes/${ruta}/favorite`).expect(204);
    await como(tokenB).put(`/routes/${ruta}/favorite`).expect(204);

    expect(
      await prisma.routeFavorite.count({
        where: { userId: userB, routeId: ruta },
      }),
    ).toBe(1);
    const detalle = await como(tokenB).get(`/routes/${ruta}`).expect(200);
    expect(detalle.body.isFavorite).toBe(true);
  });

  it('la favorita está en la lista de B y no en la de A (CA-17, CA-20)', async () => {
    const deLaB = await como(tokenB).get('/routes/favorites').expect(200);
    expect(deLaB.body).toEqual([
      {
        id: ruta,
        name: 'Cañada del Pacífico',
        type: 'HIKING',
        distanceMeters: 3_000,
        elevationGainMeters: 350,
        available: true,
        savedAt: expect.any(String),
      },
    ]);

    const deA = await como(tokenA).get('/routes/favorites').expect(200);
    expect(deA.body).toEqual([]);
  });

  it('B la quita dos veces sin error y luego la vuelve a guardar (CA-15, CA-16)', async () => {
    await como(tokenB).delete(`/routes/${ruta}/favorite`).expect(204);
    await como(tokenB).delete(`/routes/${ruta}/favorite`).expect(204);
    expect(await favoritaDe(tokenB, ruta)).toBeUndefined();

    await como(tokenB).put(`/routes/${ruta}/favorite`).expect(204);
    expect(await favoritaDe(tokenB, ruta)).toMatchObject({ available: true });
  });

  it('B no puede editar ni borrar la ruta de A: 403 (CA-26)', async () => {
    await como(tokenB)
      .patch(`/routes/${ruta}`)
      .send({ name: 'Mía ahora' })
      .expect(403);
    await como(tokenB).delete(`/routes/${ruta}`).expect(403);

    const detalle = await como(tokenA).get(`/routes/${ruta}`).expect(200);
    expect(detalle.body.name).toBe('Cañada del Pacífico');
  });

  it('nadie puede editar ni borrar una ruta de ejemplo: 403 (CA-26)', async () => {
    await como(tokenA)
      .patch(`/routes/${ejemplo}`)
      .send({ status: 'ARCHIVED' })
      .expect(403);
    await como(tokenA).delete(`/routes/${ejemplo}`).expect(403);

    const detalle = await como(tokenA).get(`/routes/${ejemplo}`).expect(200);
    expect(detalle.body).toMatchObject({
      status: 'PUBLISHED',
      author: 'SendaBC',
      isMine: false,
    });
  });

  it('A edita el nombre: se ve en el detalle y en nearby; 41 caracteres responde 400 (CA-22, CA-5)', async () => {
    const res = await como(tokenA)
      .patch(`/routes/${ruta}`)
      .send({
        name: 'Cañada renombrada',
        region: '',
        // No se puede editar (RN-1): el whitelist lo descarta.
        distanceMeters: 1,
      })
      .expect(200);
    expect(res.body).toMatchObject({
      name: 'Cañada renombrada',
      region: null,
      description: 'Ruta de prueba e2e.',
      distanceMeters: 3_000,
    });

    const cercanas = await como(tokenB)
      .get('/routes/nearby')
      .query({ lat: INICIO.lat, lng: INICIO.lng, radiusKm: 5 })
      .expect(200);
    expect(cercanas.body.find((r: { id: string }) => r.id === ruta).name).toBe(
      'Cañada renombrada',
    );

    const largo = await como(tokenA)
      .patch(`/routes/${ruta}`)
      .send({ name: 'n'.repeat(41) })
      .expect(400);
    expect(largo.body.errors.name).toEqual([
      'El nombre debe tener como máximo 40 caracteres',
    ]);
  });

  it('archivar: sale de nearby, B ve 404 y su favorita no disponible; A la sigue viendo (CA-23, CA-14, CA-19)', async () => {
    const res = await como(tokenA)
      .patch(`/routes/${ruta}`)
      .send({ status: 'ARCHIVED' })
      .expect(200);
    expect(res.body.status).toBe('ARCHIVED');

    expect(await idsCercanos(tokenA)).not.toContain(ruta);
    const ajena = await como(tokenB).get(`/routes/${ruta}`).expect(404);
    expect(ajena.body.message).toBe('Esta ruta ya no está disponible');
    expect(await favoritaDe(tokenB, ruta)).toMatchObject({ available: false });
    await como(tokenB).put(`/routes/${ruta}/favorite`).expect(404);

    const mias = await como(tokenA).get('/routes/mine').expect(200);
    expect(mias.body.find((r: { id: string }) => r.id === ruta)).toMatchObject({
      status: 'ARCHIVED',
      sourceActivityId: larga,
    });
  });

  it('una actividad con su ruta archivada tampoco se puede publicar otra vez (RN-2)', async () => {
    await como(tokenA)
      .post('/routes')
      .send({ activityId: larga, name: 'Otra vez' })
      .expect(409);
  });

  it('volver a publicar: reaparece en nearby y la favorita de B vuelve a estar disponible (CA-24)', async () => {
    await como(tokenA)
      .patch(`/routes/${ruta}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    expect(await idsCercanos(tokenB)).toContain(ruta);
    expect(await favoritaDe(tokenB, ruta)).toMatchObject({ available: true });
    const mias = await como(tokenA).get('/routes/mine').expect(200);
    expect(mias.body.find((r: { id: string }) => r.id === ruta).status).toBe(
      'PUBLISHED',
    );
  });

  it('un estado DELETED por PATCH responde 400: borrar es DELETE', async () => {
    await como(tokenA)
      .patch(`/routes/${ruta}`)
      .send({ status: 'DELETED' })
      .expect(400);
  });

  it('borrar: 204, sale de nearby y de "Mis rutas" y la favorita de B queda no disponible (CA-25, CA-19)', async () => {
    await como(tokenA).delete(`/routes/${ruta}`).expect(204);

    expect(await idsCercanos(tokenB)).not.toContain(ruta);
    const mias = await como(tokenA).get('/routes/mine').expect(200);
    expect(mias.body.map((r: { id: string }) => r.id)).not.toContain(ruta);
    expect(await favoritaDe(tokenB, ruta)).toMatchObject({ available: false });
    await como(tokenA).get(`/routes/${ruta}`).expect(404);
    await como(tokenB).get(`/routes/${ruta}`).expect(404);
    // Borrar de nuevo: ya no existe para nadie.
    await como(tokenA).delete(`/routes/${ruta}`).expect(404);
  });

  it('la actividad sigue en el historial y se puede publicar de nuevo (CA-25, CA-8)', async () => {
    await como(tokenA).get(`/activities/${larga}`).expect(200);

    const res = await como(tokenA)
      .post('/routes')
      .send({ activityId: larga, name: 'Cañada otra vez' })
      .expect(201);
    expect(res.body.id).not.toBe(ruta);
    expect(res.body.sourceActivityId).toBe(larga);
  });

  it('B quita de favoritas la ruta borrada y desaparece de su lista (CA-19)', async () => {
    await como(tokenB).delete(`/routes/${ruta}/favorite`).expect(204);
    expect(await favoritaDe(tokenB, ruta)).toBeUndefined();
  });

  it('un id que no es UUID responde 404', async () => {
    await como(tokenA).get('/routes/no-es-uuid').expect(404);
    await como(tokenA).put('/routes/no-es-uuid/favorite').expect(404);
  });
});
