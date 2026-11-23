import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configurarHttp } from './../src/configurar-http.js';
import { PrismaService } from './../src/prisma.service.js';

// Spec 005 — T6. Corre contra la base de DATABASE_URL (con la migración activity_sync).
// Crea dos usuarios con correo único y los borra al final; sus actividades y puntos se
// borran en cascada.

type Punto = {
  sequence: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  recordedAt: string;
};

function puntos(n: number): Punto[] {
  return Array.from({ length: n }, (_, i) => ({
    sequence: i + 1,
    latitude: 31.8667123 + i * 1.234567e-5,
    longitude: -116.5964321 - i * 7.654321e-6,
    altitude: i % 7 === 0 ? null : 100.25 + i / 100,
    accuracy: i % 11 === 0 ? null : 4.8,
    recordedAt: new Date(Date.UTC(2026, 9, 9, 10) + i * 2000).toISOString(),
  }));
}

function actividad(points: Punto[], extra: object = {}) {
  return {
    clientGeneratedId: randomUUID(),
    type: 'HIKING',
    startedAt: points[0]?.recordedAt ?? '2026-10-09T10:00:00.000Z',
    endedAt: points.at(-1)?.recordedAt ?? '2026-10-09T10:05:00.000Z',
    distanceMeters: 4321.987,
    durationSeconds: 3600,
    elevationGainMeters: 312.4,
    elevationLossMeters: 298.1,
    elevationSource: 'BAROMETER',
    points,
    ...extra,
  };
}

describe('Sincronización de actividades (e2e, spec 005)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const emailA = `e2e-sync-a-${randomUUID()}@senda.bc`;
  const emailB = `e2e-sync-b-${randomUUID()}@senda.bc`;
  const password = 'contrasena-e2e';
  let userA: string;
  let userB: string;
  let tokenA: string;
  let tokenB: string;

  // Actividades compartidas entre pruebas, en el orden en que corren.
  const corta = actividad(puntos(3));
  const larga = actividad(puntos(5400), { type: 'TRAIL_RUNNING' });
  let idCorta: string;
  let idLarga: string;

  const http = () => request(app.getHttpServer());
  const sync = (token: string, activities: unknown[]) =>
    http()
      .post('/activities/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ activities });

  async function crearUsuario(email: string) {
    const creado = await http()
      .post('/user')
      .send({ email, displayName: 'Prueba sync', password })
      .expect(201);
    const login = await http()
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return { id: creado.body.id as string, token: login.body.token as string };
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configurarHttp(app);
    await app.init();
    prisma = app.get(PrismaService);

    ({ id: userA, token: tokenA } = await crearUsuario(emailA));
    ({ id: userB, token: tokenB } = await crearUsuario(emailB));
  });

  afterAll(async () => {
    await prisma?.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await app?.close();
  });

  it('sin token responde 401 en las tres rutas y no guarda nada (CA-18)', async () => {
    await http()
      .post('/activities/sync')
      .send({ activities: [corta] })
      .expect(401);
    await http().get('/activities').expect(401);
    await http().get(`/activities/${randomUUID()}`).expect(401);

    expect(
      await prisma.activity.count({
        where: { clientGeneratedId: corta.clientGeneratedId },
      }),
    ).toBe(0);
  });

  it('un lote con una válida y una inválida guarda la válida y rechaza la otra (CA-11)', async () => {
    const invalida = actividad(puntos(3), {
      endedAt: '2026-10-09T09:00:00.000Z',
    });

    const res = await sync(tokenA, [corta, invalida]).expect(200);

    expect(res.body.results).toEqual([
      {
        clientGeneratedId: corta.clientGeneratedId,
        status: 'CREATED',
        id: expect.any(String),
      },
      {
        clientGeneratedId: invalida.clientGeneratedId,
        status: 'REJECTED',
        errors: ['El fin de la actividad no puede ser anterior al inicio'],
      },
    ]);
    idCorta = res.body.results[0].id;
    expect(
      await prisma.activity.count({
        where: { clientGeneratedId: invalida.clientGeneratedId },
      }),
    ).toBe(0);
  });

  it('una actividad con 2 puntos válidos se rechaza y no guarda actividad ni puntos (spec 012, CA-26)', async () => {
    // 3 puntos, pero uno con precisión peor que 20 m: cuentan los válidos, no los puntos.
    const points = puntos(3).map((p, i) =>
      i === 1 ? { ...p, accuracy: 35 } : p,
    );
    const pocos = actividad(points);
    const puntosAntes = await prisma.activityPoint.count({
      where: { activity: { userId: userA } },
    });

    const res = await sync(tokenA, [pocos]).expect(200);

    expect(res.body.results).toEqual([
      {
        clientGeneratedId: pocos.clientGeneratedId,
        status: 'REJECTED',
        errors: [
          'La actividad necesita al menos 3 puntos con buena precisión para guardarse',
        ],
      },
    ]);
    expect(
      await prisma.activity.count({
        where: { clientGeneratedId: pocos.clientGeneratedId },
      }),
    ).toBe(0);
    expect(
      await prisma.activityPoint.count({
        where: { activity: { userId: userA } },
      }),
    ).toBe(puntosAntes);
  });

  it('un reenvío responde ALREADY_EXISTS con el mismo id y no duplica (CA-10)', async () => {
    const res = await sync(tokenA, [corta]).expect(200);

    expect(res.body.results).toEqual([
      {
        clientGeneratedId: corta.clientGeneratedId,
        status: 'ALREADY_EXISTS',
        id: idCorta,
      },
    ]);
    expect(
      await prisma.activity.count({
        where: { clientGeneratedId: corta.clientGeneratedId },
      }),
    ).toBe(1);
  });

  it('una actividad de 3 h (5 400 puntos) se sube correctamente (CA-7)', async () => {
    const res = await sync(tokenA, [larga]).expect(200);

    expect(res.body.results[0].status).toBe('CREATED');
    idLarga = res.body.results[0].id;
  }, 60_000);

  it('el recorrido queda como LineString SRID 4326 con todos los puntos (CA-6)', async () => {
    const [geo] = await prisma.$queryRaw<
      { tipo: string; srid: number; vertices: number; puntos: number }[]
    >`
      SELECT ST_GeometryType(a.path) AS tipo,
             ST_SRID(a.path) AS srid,
             ST_NPoints(a.path) AS vertices,
             (SELECT count(*)::int FROM activity_points p WHERE p."activityId" = a.id) AS puntos
      FROM activities a
      WHERE a.id = ${idLarga}::uuid`;

    expect(geo).toEqual({
      tipo: 'ST_LineString',
      srid: 4326,
      vertices: 5400,
      puntos: 5400,
    });
  });

  it('la lista devuelve mis actividades con las métricas enviadas, la más reciente primero (CA-20)', async () => {
    const res = await http()
      .get('/activities')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.map((a: { id: string }) => a.id).sort()).toEqual(
      [idCorta, idLarga].sort(),
    );
    const resumen = res.body.find((a: { id: string }) => a.id === idLarga);
    const { points: _points, ...enviado } = larga;
    expect(resumen).toEqual({ ...enviado, id: idLarga, pointCount: 5400 });
    // Orden por inicio, de la más reciente a la más antigua.
    const inicios = res.body.map((a: { startedAt: string }) => a.startedAt);
    expect(inicios).toEqual([...inicios].sort().reverse());
  });

  it('el detalle devuelve los mismos puntos enviados (CA-5, CA-21)', async () => {
    const res = await http()
      .get(`/activities/${idLarga}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const { points: recibidos, ...resumen } = res.body;
    const { points: enviados, ...enviado } = larga;
    expect(resumen).toEqual({ ...enviado, id: idLarga, pointCount: 5400 });
    expect(recibidos).toHaveLength(5400);
    recibidos.forEach((p: Punto, i: number) => {
      const e = enviados[i];
      expect(p.sequence).toBe(e.sequence);
      // La conexión de Supabase devuelve float8 con 15 dígitos significativos (nota de T4).
      expect(p.latitude).toBeCloseTo(e.latitude, 9);
      expect(p.longitude).toBeCloseTo(e.longitude, 9);
      if (e.altitude === null) expect(p.altitude).toBeNull();
      else expect(p.altitude).toBeCloseTo(e.altitude, 9);
      expect(p.accuracy).toBe(e.accuracy);
      expect(p.recordedAt).toBe(e.recordedAt);
    });
  }, 30_000);

  it('un userId en el body no cambia el dueño (CA-18)', async () => {
    const conUserId = actividad(puntos(3), { userId: userB });

    const res = await sync(tokenA, [conUserId]).expect(200);
    expect(res.body.results[0].status).toBe('CREATED');

    const guardada = await prisma.activity.findUnique({
      where: { clientGeneratedId: conUserId.clientGeneratedId },
      select: { userId: true },
    });
    expect(guardada?.userId).toBe(userA);
  });

  it('otra cuenta no ve mis actividades: lista vacía y 404 en el detalle (CA-18)', async () => {
    const lista = await http()
      .get('/activities')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(lista.body).toEqual([]);

    const detalle = await http()
      .get(`/activities/${idLarga}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
    expect(detalle.body.message).toBe('Actividad no encontrada');
  });

  it('otra cuenta no puede reusar mi identificador (CA-10, CA-18)', async () => {
    const res = await sync(tokenB, [corta]).expect(200);

    expect(res.body.results).toEqual([
      {
        clientGeneratedId: corta.clientGeneratedId,
        status: 'REJECTED',
        errors: ['Identificador de actividad inválido'],
      },
    ]);
  });
});
