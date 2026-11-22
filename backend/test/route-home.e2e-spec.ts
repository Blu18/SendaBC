import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configurarHttp } from './../src/configurar-http.js';
import { PrismaService } from './../src/prisma.service.js';

// Spec 013 — T5. Rutas de Inicio: `limit` en nearby y rutas populares. Corre contra la base de
// DATABASE_URL. Las populares son de todo el estado (RN-6), así que la base puede tener otras
// rutas con favoritas: la prueba cuenta cuántas tiene la más guardada y crea más cuentas que
// esa, para que sus rutas queden arriba sin depender de los datos que ya existen.

type Centro = { lat: number; lng: number };

// En el océano Pacífico, lejos de las rutas de ejemplo y de los centros de route.e2e-spec.
const CENTRO_INICIO: Centro = { lat: 24.0, lng: -127.0 };
const KM_POR_GRADO_LAT = 110.9;
const HORA_MS = 60 * 60 * 1000;

type Popular = {
  id: string;
  name: string;
  favoritesCount: number;
  isMine: boolean;
  [campo: string]: unknown;
};

describe('Rutas de Inicio (e2e, spec 013)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const sufijo = randomUUID();
  const emailA = `e2e-inicio-a-${sufijo}@senda.bc`;
  const emailB = `e2e-inicio-b-${sufijo}@senda.bc`;
  const password = 'contrasena-e2e';
  let userA: string;
  let tokenA: string;
  let tokenB: string;
  const fans: string[] = [];

  const http = () => request(app.getHttpServer());
  const get = (path: string, token: string, query = {}) =>
    http().get(path).query(query).set('Authorization', `Bearer ${token}`);
  const populares = async (token: string) =>
    (await get('/routes/popular', token).expect(200)).body as Popular[];

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

  async function insertarRuta(o: {
    name: string;
    inicio?: Centro;
    status?: 'PUBLISHED' | 'ARCHIVED';
    createdAt?: Date;
  }) {
    const inicio = o.inicio ?? CENTRO_INICIO;
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO routes (id, name, type, status, region, "createdByUserId", "distanceMeters",
                          "elevationGainMeters", "createdAt", "updatedAt", path, "startPoint")
      VALUES (${id}::uuid, ${o.name}, 'HIKING'::"ActivityType",
              ${o.status ?? 'PUBLISHED'}::"RouteStatus", 'Pacífico', ${userA}::uuid, 2500, 120,
              ${o.createdAt ?? new Date()}, now(),
              ST_SetSRID(ST_MakeLine(ST_MakePoint(${inicio.lng}, ${inicio.lat}),
                                     ST_MakePoint(${inicio.lng + 0.001}, ${inicio.lat + 0.001})), 4326),
              ST_SetSRID(ST_MakePoint(${inicio.lng}, ${inicio.lat}), 4326)::geography)`;
    return id;
  }

  async function darFavoritas(routeId: string, cuantas: number) {
    for (const userId of fans.slice(0, cuantas)) {
      await prisma.routeFavorite.create({ data: { userId, routeId } });
    }
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configurarHttp(app);
    await app.init();
    prisma = app.get(PrismaService);

    ({ id: userA, token: tokenA } = await crearUsuario(
      emailA,
      'Autora Inicio',
    ));
    ({ token: tokenB } = await crearUsuario(emailB, 'Visitante Inicio'));
  }, 60_000);

  afterAll(async () => {
    // Las favoritas se borran en cascada con sus rutas y sus cuentas.
    if (userA) {
      await prisma?.route.deleteMany({ where: { createdByUserId: userA } });
    }
    await prisma?.user.deleteMany({
      where: {
        OR: [{ email: { in: [emailA, emailB] } }, { id: { in: fans } }],
      },
    });
    await app?.close();
  });

  describe('GET /routes/nearby con limit (CA-9)', () => {
    let ids: string[];

    beforeAll(async () => {
      ids = [];
      for (let km = 1; km <= 7; km++) {
        const inicio = {
          lat: CENTRO_INICIO.lat + km / KM_POR_GRADO_LAT,
          lng: CENTRO_INICIO.lng,
        };
        ids.push(await insertarRuta({ name: `Cercana ${km} km`, inicio }));
      }
    }, 60_000);

    it('con limit=5 devuelve las 5 más cercanas en un radio de 25 km', async () => {
      const res = await get('/routes/nearby', tokenA, {
        ...CENTRO_INICIO,
        radiusKm: 25,
        limit: 5,
      }).expect(200);

      expect(res.body.map((r: { id: string }) => r.id)).toEqual(
        ids.slice(0, 5),
      );
    });

    it('sin limit devuelve todas las del radio', async () => {
      const res = await get('/routes/nearby', tokenA, {
        ...CENTRO_INICIO,
        radiusKm: 25,
      }).expect(200);

      expect(res.body.map((r: { id: string }) => r.id)).toEqual(ids);
    });

    it('limit=0, limit=51 y limit=cinco responden 400 con el mensaje en español', async () => {
      for (const limit of ['0', '51', 'cinco']) {
        const res = await get('/routes/nearby', tokenA, {
          ...CENTRO_INICIO,
          limit,
        }).expect(400);
        expect(JSON.stringify(res.body)).toContain(
          'El límite debe ser un entero entre 1 y 50',
        );
      }
    });
  });

  describe('GET /routes/popular (CA-13 a CA-15, CA-17)', () => {
    let k: number;
    let primera: string;
    let empateVieja: string;
    let empateNueva: string;
    let archivada: string;
    let sinFavoritas: string;

    beforeAll(async () => {
      // La ruta publicada con más favoritas que ya existe en la base.
      const [{ max }] = await prisma.$queryRaw<{ max: number }[]>`
        SELECT COALESCE(MAX(c), 0)::int AS max
        FROM (SELECT COUNT(*) AS c FROM route_favorites f
              JOIN routes r ON r.id = f."routeId"
              WHERE r.status = 'PUBLISHED' GROUP BY r.id) t`;
      k = max + 3;
      for (let i = 0; i < k; i++) {
        const fan = await prisma.user.create({
          data: {
            email: `e2e-inicio-fan-${i}-${sufijo}@senda.bc`,
            displayName: `Fan ${i}`,
            passwordHash: randomUUID(),
          },
        });
        fans.push(fan.id);
      }

      const ahora = Date.now();
      primera = await insertarRuta({
        name: 'Popular primera',
        createdAt: new Date(ahora - 3 * HORA_MS),
      });
      empateVieja = await insertarRuta({
        name: 'Popular empate vieja',
        createdAt: new Date(ahora - 2 * HORA_MS),
      });
      empateNueva = await insertarRuta({
        name: 'Popular empate nueva',
        createdAt: new Date(ahora - HORA_MS),
      });
      archivada = await insertarRuta({
        name: 'Popular archivada',
        status: 'ARCHIVED',
      });
      sinFavoritas = await insertarRuta({ name: 'Popular sin favoritas' });

      await darFavoritas(primera, k);
      await darFavoritas(empateVieja, k - 1);
      await darFavoritas(empateNueva, k - 1);
      await darFavoritas(archivada, k);
    }, 120_000);

    it('sin token responde 401', async () => {
      await http().get('/routes/popular').expect(401);
    });

    it('de más a menos favoritas y, si empatan, la publicada más reciente primero (CA-13, CA-14)', async () => {
      const body = await populares(tokenB);

      expect(body.length).toBeLessThanOrEqual(5);
      expect(body.slice(0, 3).map((r) => r.id)).toEqual([
        primera,
        empateNueva,
        empateVieja,
      ]);
      expect(body.slice(0, 3).map((r) => r.favoritesCount)).toEqual([
        k,
        k - 1,
        k - 1,
      ]);
      const conteos = body.map((r) => r.favoritesCount);
      expect(conteos).toEqual([...conteos].sort((a, b) => b - a));
    });

    it('deja fuera las archivadas y las que no tienen favoritas (RN-5, CA-15)', async () => {
      const ids = (await populares(tokenB)).map((r) => r.id);

      expect(ids).not.toContain(archivada);
      expect(ids).not.toContain(sinFavoritas);
    });

    it('trae los datos de la tarjeta, sin quién guardó la ruta, e isMine solo para su autora (RN-8)', async () => {
      const [deB] = await populares(tokenB);
      const [deA] = await populares(tokenA);

      expect(Object.keys(deB).sort()).toEqual(
        [
          'difficulty',
          'distanceMeters',
          'elevationGainMeters',
          'favoritesCount',
          'id',
          'isMine',
          'name',
          'region',
          'type',
        ].sort(),
      );
      expect(deB).toMatchObject({
        name: 'Popular primera',
        type: 'HIKING',
        region: 'Pacífico',
        distanceMeters: 2500,
        isMine: false,
      });
      expect(typeof deB.favoritesCount).toBe('number');
      expect(deA.isMine).toBe(true);
    });

    it('el número cambia al guardar y al quitar una favorita (CA-17)', async () => {
      await http()
        .put(`/routes/${empateVieja}/favorite`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(204);

      let body = await populares(tokenB);
      // Ahora empata con la primera (k) y es más reciente, así que va antes.
      expect(body.slice(0, 3).map((r) => [r.id, r.favoritesCount])).toEqual([
        [empateVieja, k],
        [primera, k],
        [empateNueva, k - 1],
      ]);

      await http()
        .delete(`/routes/${empateVieja}/favorite`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(204);

      body = await populares(tokenB);
      expect(body.find((r) => r.id === empateVieja)?.favoritesCount).toBe(
        k - 1,
      );
    });
  });
});
