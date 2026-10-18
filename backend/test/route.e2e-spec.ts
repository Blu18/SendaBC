import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configurarHttp } from './../src/configurar-http.js';
import { PrismaService } from './../src/prisma.service.js';

// Spec 006 — T5. Corre contra la base de DATABASE_URL (con la migración
// routes_start_point_geography). Crea dos usuarios con correo único e inserta rutas con SQL
// alrededor de centros en el océano Pacífico, lejos de las rutas de ejemplo. Al final borra
// primero sus rutas (la relación con el creador no se borra en cascada) y luego a los usuarios.

type Centro = { lat: number; lng: number };

// Un centro por grupo de pruebas para que no se mezclen sus rutas.
const CENTRO_ESTADO: Centro = { lat: 27.0, lng: -121.0 };
const CENTRO_LIMITE: Centro = { lat: 26.0, lng: -123.0 };
const CENTRO_TIPOS: Centro = { lat: 25.0, lng: -125.0 };

const KM_POR_GRADO_LAT = 110.9;

// Punto a `km` al norte del centro.
function alNorte(c: Centro, km: number): Centro {
  return { lat: c.lat + km / KM_POR_GRADO_LAT, lng: c.lng };
}

describe('Rutas cercanas (e2e, spec 006)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const emailA = `e2e-rutas-a-${randomUUID()}@senda.bc`;
  const emailB = `e2e-rutas-b-${randomUUID()}@senda.bc`;
  const password = 'contrasena-e2e';
  let userA: string;
  let userB: string;
  let tokenA: string;
  let tokenB: string;

  const http = () => request(app.getHttpServer());
  const nearby = (token: string, query: Record<string, string | number>) =>
    http()
      .get('/routes/nearby')
      .query(query)
      .set('Authorization', `Bearer ${token}`);

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

  // Inserta una ruta cuyo recorrido sale de `inicio` en línea recta, con `puntos` puntos.
  async function insertarRuta(opciones: {
    inicio: Centro;
    owner: string;
    name: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    type?: 'HIKING' | 'TRAIL_RUNNING' | 'CYCLING';
    puntos?: number;
  }) {
    const { inicio, owner, name } = opciones;
    const status = opciones.status ?? 'PUBLISHED';
    const type = opciones.type ?? 'HIKING';
    const n = opciones.puntos ?? 3;
    const lngs = Array.from({ length: n }, (_, i) => inicio.lng + i * 0.0005);
    const lats = Array.from({ length: n }, (_, i) => inicio.lat + i * 0.0005);
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO routes (id, name, type, status, "createdByUserId", "distanceMeters",
                          "elevationGainMeters", "updatedAt", path, "startPoint")
      VALUES (${id}::uuid, ${name}, ${type}::"ActivityType", ${status}::"RouteStatus",
              ${owner}::uuid, 1234.5, 210, now(),
              ST_SetSRID(ST_MakeLine(ARRAY(
                SELECT ST_MakePoint(x, y)
                FROM unnest(${lngs}::float8[], ${lats}::float8[]) AS t(x, y))), 4326),
              ST_SetSRID(ST_MakePoint(${inicio.lng}, ${inicio.lat}), 4326)::geography)`;
    return id;
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

  it('sin token responde 401 (CA-17)', async () => {
    await http()
      .get('/routes/nearby')
      .query({ lat: CENTRO_ESTADO.lat, lng: CENTRO_ESTADO.lng })
      .expect(401);
  });

  describe('estado, radio, autor e isMine', () => {
    let publicada: string;
    let borrador: string;
    let archivada: string;
    let lejana: string;
    let deB: string;

    beforeAll(async () => {
      const a3km = alNorte(CENTRO_ESTADO, 3);
      publicada = await insertarRuta({
        inicio: a3km,
        owner: userA,
        name: 'Publicada 3 km',
        puntos: 20,
      });
      borrador = await insertarRuta({
        inicio: a3km,
        owner: userA,
        name: 'Borrador 3 km',
        status: 'DRAFT',
      });
      archivada = await insertarRuta({
        inicio: a3km,
        owner: userA,
        name: 'Archivada 3 km',
        status: 'ARCHIVED',
      });
      lejana = await insertarRuta({
        inicio: alNorte(CENTRO_ESTADO, 40),
        owner: userA,
        name: 'Publicada 40 km',
      });
      deB = await insertarRuta({
        inicio: alNorte(CENTRO_ESTADO, 2),
        owner: userB,
        name: 'De B 2 km',
      });
    }, 60_000);

    it('solo devuelve rutas publicadas (CA-3)', async () => {
      const res = await nearby(tokenA, CENTRO_ESTADO).expect(200);
      const ids = res.body.map((r: { id: string }) => r.id);

      expect(ids).toContain(publicada);
      expect(ids).not.toContain(borrador);
      expect(ids).not.toContain(archivada);
    });

    it('una ruta a 40 km no aparece con 25 km y sí con 50 y 100 km (CA-4, CA-11)', async () => {
      const ids = async (radiusKm?: number) => {
        const query = radiusKm ? { ...CENTRO_ESTADO, radiusKm } : CENTRO_ESTADO;
        const res = await nearby(tokenA, query).expect(200);
        return res.body.map((r: { id: string }) => r.id);
      };

      expect(await ids()).not.toContain(lejana); // 25 km por defecto
      expect(await ids(25)).not.toContain(lejana);
      expect(await ids(50)).toContain(lejana);
      expect(await ids(100)).toContain(lejana);
    });

    it('un radio de 101 km responde 400 (RN-5)', async () => {
      const res = await nearby(tokenA, {
        ...CENTRO_ESTADO,
        radiusKm: 101,
      }).expect(400);
      expect(res.body.errors.radiusKm).toEqual([
        'El radio debe estar entre 1 y 100 km',
      ]);
    });

    it('marca como mías solo las rutas del usuario del token (CA-6)', async () => {
      const res = await nearby(tokenB, CENTRO_ESTADO).expect(200);
      const porId = new Map(
        res.body.map((r: { id: string; isMine: boolean }) => [r.id, r.isMine]),
      );

      expect(porId.get(deB)).toBe(true);
      expect(porId.get(publicada)).toBe(false);
    });

    it('devuelve el autor, el inicio, la distancia al centro y un recorrido simplificado (CA-2, CA-19)', async () => {
      const res = await nearby(tokenA, CENTRO_ESTADO).expect(200);
      const ruta = res.body.find((r: { id: string }) => r.id === publicada);
      const inicio = alNorte(CENTRO_ESTADO, 3);

      expect(ruta).toMatchObject({
        name: 'Publicada 3 km',
        type: 'HIKING',
        difficulty: null,
        distanceMeters: 1234.5,
        elevationGainMeters: 210,
        author: 'Autora A',
        isMine: true,
      });
      expect(ruta.start.latitude).toBeCloseTo(inicio.lat, 6);
      expect(ruta.start.longitude).toBeCloseTo(inicio.lng, 6);
      expect(ruta.distanceFromCenterMeters).toBeGreaterThan(2900);
      expect(ruta.distanceFromCenterMeters).toBeLessThan(3100);

      // 20 puntos en línea recta se simplifican a sus extremos, en orden [lng, lat].
      expect(ruta.path.length).toBeGreaterThanOrEqual(2);
      expect(ruta.path.length).toBeLessThan(20);
      expect(ruta.path[0][0]).toBeCloseTo(inicio.lng, 6);
      expect(ruta.path[0][1]).toBeCloseTo(inicio.lat, 6);
    });
  });

  it('con 55 rutas dentro del radio devuelve las 50 más cercanas, en orden (CA-5)', async () => {
    const ids: string[] = [];
    for (let i = 1; i <= 55; i++) {
      ids.push(
        await insertarRuta({
          inicio: alNorte(CENTRO_LIMITE, i * 0.1),
          owner: userA,
          name: `Límite ${i}`,
        }),
      );
    }

    const res = await nearby(tokenA, CENTRO_LIMITE).expect(200);
    const distancias = res.body.map(
      (r: { distanceFromCenterMeters: number }) => r.distanceFromCenterMeters,
    );

    expect(res.body).toHaveLength(50);
    expect(res.body.map((r: { id: string }) => r.id)).toEqual(ids.slice(0, 50));
    expect(distancias).toEqual([...distancias].sort((a, b) => a - b));
  }, 120_000);

  it('el filtro por tipo devuelve solo el tipo pedido (CA-12)', async () => {
    const tipos = ['HIKING', 'TRAIL_RUNNING', 'CYCLING'] as const;
    for (const [i, type] of tipos.entries()) {
      await insertarRuta({
        inicio: alNorte(CENTRO_TIPOS, i + 1),
        owner: userB,
        name: `Tipo ${type}`,
        type,
      });
    }

    const todas = await nearby(tokenA, CENTRO_TIPOS).expect(200);
    expect(todas.body.map((r: { type: string }) => r.type).sort()).toEqual(
      [...tipos].sort(),
    );

    for (const type of tipos) {
      const res = await nearby(tokenA, { ...CENTRO_TIPOS, type }).expect(200);
      expect(res.body.map((r: { type: string }) => r.type)).toEqual([type]);
    }
  }, 60_000);
});
