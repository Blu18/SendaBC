import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma.service.js';
import { MAX_NEARBY_ROUTES, RouteService } from './route.service.js';

const USUARIO = '11111111-1111-4111-8111-111111111111';

function montar() {
  const prisma = { $queryRaw: vi.fn().mockResolvedValue([]) };
  const service = new RouteService(prisma as unknown as PrismaService);
  return { service, prisma };
}

function fila(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r-1',
    name: 'Cañón de Doña Petra',
    type: 'HIKING',
    difficulty: 'MODERATE',
    distanceMeters: 5234.7,
    elevationGainMeters: 312,
    lat: 31.8667,
    lng: -116.5964,
    distanceFromCenterMeters: 1830.25,
    path: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [-116.5964, 31.8667],
        [-116.59, 31.87],
      ],
    }),
    author: 'SendaBC',
    isMine: false,
    ...overrides,
  };
}

// Texto de la consulta (los valores interpolados se marcan con ?).
function sqlDe(prisma: ReturnType<typeof montar>['prisma']) {
  return (prisma.$queryRaw.mock.calls[0][0] as string[]).join('?');
}

function valoresDe(prisma: ReturnType<typeof montar>['prisma']) {
  return prisma.$queryRaw.mock.calls[0].slice(1) as unknown[];
}

const query = { lat: 31.86, lng: -116.6, radiusKm: 25 };

describe('RouteService.nearby (spec 006)', () => {
  it('convierte cada fila a NearbyRoute con el recorrido como [lng, lat] (CA-2)', async () => {
    const { service, prisma } = montar();
    prisma.$queryRaw.mockResolvedValue([fila()]);

    expect(await service.nearby(USUARIO, query)).toEqual([
      {
        id: 'r-1',
        name: 'Cañón de Doña Petra',
        type: 'HIKING',
        difficulty: 'MODERATE',
        distanceMeters: 5234.7,
        elevationGainMeters: 312,
        start: { latitude: 31.8667, longitude: -116.5964 },
        distanceFromCenterMeters: 1830.25,
        path: [
          [-116.5964, 31.8667],
          [-116.59, 31.87],
        ],
        author: 'SendaBC',
        isMine: false,
      },
    ]);
  });

  it('respeta isMine, author y los datos nulos; sin recorrido devuelve []', async () => {
    const { service, prisma } = montar();
    prisma.$queryRaw.mockResolvedValue([
      fila({
        isMine: true,
        author: 'Ana',
        difficulty: null,
        distanceMeters: null,
        elevationGainMeters: null,
        path: null,
      }),
    ]);

    const [ruta] = await service.nearby(USUARIO, query);

    expect(ruta).toMatchObject({
      isMine: true,
      author: 'Ana',
      difficulty: null,
      distanceMeters: null,
      elevationGainMeters: null,
      path: [],
    });
  });

  it('sin rutas devuelve una lista vacía', async () => {
    const { service } = montar();
    expect(await service.nearby(USUARIO, query)).toEqual([]);
  });

  it('busca solo publicadas dentro del radio en metros, por cercanía y con límite (CA-3 a CA-5)', async () => {
    const { service, prisma } = montar();

    await service.nearby(USUARIO, { ...query, radiusKm: 50 });

    const sql = sqlDe(prisma);
    expect(sql).toContain(`r.status = 'PUBLISHED'`);
    expect(sql).toContain('ST_DWithin(r."startPoint", centro.g, ?)');
    expect(sql).toContain('ORDER BY "distanceFromCenterMeters"');
    expect(sql).toContain('ST_Simplify(r.path, ?)');
    const valores = valoresDe(prisma);
    expect(valores.slice(0, 2)).toEqual([-116.6, 31.86]); // longitud, latitud
    expect(valores).toContain(50_000);
    expect(valores).toContain(USUARIO);
    expect(valores.at(-1)).toBe(MAX_NEARBY_ROUTES);
  });

  it('filtra por tipo solo cuando se pide (CA-12)', async () => {
    const sinTipo = montar();
    await sinTipo.service.nearby(USUARIO, query);
    expect(valoresDe(sinTipo.prisma)).toContain(Prisma.empty);

    const conTipo = montar();
    await conTipo.service.nearby(USUARIO, { ...query, type: 'CYCLING' });
    const filtro = valoresDe(conTipo.prisma).find(
      (v) => v !== Prisma.empty && (v as Prisma.Sql)?.sql !== undefined,
    ) as Prisma.Sql;
    expect(filtro.sql).toContain('r.type = ');
    expect(filtro.values).toEqual(['CYCLING']);
  });
});
