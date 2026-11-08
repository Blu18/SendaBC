import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma.service.js';
import {
  AUTOR_CUENTA_ELIMINADA,
  esVisible,
  MAX_NEARBY_ROUTES,
  RouteService,
} from './route.service.js';

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

describe('RouteService.publish (spec 007)', () => {
  const ACTIVIDAD = '0b6f6c2e-6f3a-4d1b-9a4e-2f7c8d9e0a1b';
  const dto = { activityId: ACTIVIDAD, name: 'Cañón de Doña Petra' };

  // 3 km hacia el este, en el ecuador, con altitud en cada punto.
  const INICIO = new Date('2026-11-06T16:00:00Z');
  const PUNTOS = Array.from({ length: 28 }, (_, i) => ({
    lat: 0,
    lng: i / 1000,
    altitudeMeters: 100 + i,
    sequence: i + 1,
    recordedAt: new Date(INICIO.getTime() + i * 10_000),
  }));

  function actividad(overrides: Record<string, unknown> = {}) {
    return {
      id: ACTIVIDAD,
      type: 'HIKING',
      startedAt: INICIO,
      distanceMeters: 3_000,
      elevationGainMeters: 800,
      route: null,
      ...overrides,
    };
  }

  // Prisma simulado: todo pasa dentro de la transacción.
  function montarPublicar() {
    const tx = {
      activity: { findFirst: vi.fn().mockResolvedValue(actividad()) },
      $queryRaw: vi.fn().mockResolvedValue(PUNTOS),
      $executeRaw: vi.fn().mockResolvedValue(1),
    };
    const prisma = {
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    const service = new RouteService(prisma as unknown as PrismaService);
    return { service, prisma, tx };
  }

  // Texto y valores del INSERT de la ruta.
  function insertDe(tx: ReturnType<typeof montarPublicar>['tx']) {
    const [textos, ...valores] = tx.$executeRaw.mock.calls[0] as [
      string[],
      ...unknown[],
    ];
    return { sql: textos.join('?'), valores };
  }

  it('sin ubicación vieja, la ruta usa todos los puntos (CA-28)', async () => {
    const { service, tx } = montarPublicar();

    await service.publish(USUARIO, dto);

    const { sql, valores } = insertDe(tx);
    expect(sql).toContain('ST_MakeLine(location ORDER BY sequence)');
    expect(sql).toContain('ST_StartPoint(recorrido.path)');
    expect(valores).toContain(1);
  });

  it('quita la ubicación vieja del recorrido y del perfil (CA-28, RN-10)', async () => {
    const { service, tx } = montarPublicar();
    const viejo = {
      lat: 5,
      lng: 5,
      altitudeMeters: 900,
      sequence: 1,
      recordedAt: new Date(INICIO.getTime() - 25 * 60_000),
    };
    tx.$queryRaw.mockResolvedValue([
      viejo,
      ...PUNTOS.map((p) => ({ ...p, sequence: p.sequence + 1 })),
    ]);

    await service.publish(USUARIO, dto);

    const { valores } = insertDe(tx);
    expect(valores).toContain(2);
    const perfil = valores.find(
      (v): v is string => typeof v === 'string' && v.startsWith('[['),
    );
    expect(JSON.parse(perfil!)[0]).toEqual([0, 100]);
  });

  it('busca la actividad entre las sincronizadas del usuario del token (CA-9)', async () => {
    const { service, tx } = montarPublicar();

    await service.publish(USUARIO, dto);

    expect(tx.activity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ACTIVIDAD, userId: USUARIO, status: 'SYNCED' },
      }),
    );
  });

  it('una actividad ajena o inexistente responde 404 sin insertar (CA-9)', async () => {
    const { service, tx } = montarPublicar();
    tx.activity.findFirst.mockResolvedValue(null);

    await expect(service.publish(USUARIO, dto)).rejects.toThrow(
      new NotFoundException('Actividad no encontrada'),
    );
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('una actividad de menos de 1.5 km responde 400 (RN-5, CA-3, CA-9)', async () => {
    const { service, tx } = montarPublicar();
    tx.activity.findFirst.mockResolvedValue(
      actividad({ distanceMeters: 1_499.9 }),
    );

    await expect(service.publish(USUARIO, dto)).rejects.toThrow(
      new BadRequestException('Una ruta debe medir al menos 1.5 km'),
    );
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('acepta exactamente 1.5 km', async () => {
    const { service, tx } = montarPublicar();
    tx.activity.findFirst.mockResolvedValue(
      actividad({ distanceMeters: 1_500 }),
    );

    await service.publish(USUARIO, dto);

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('una actividad sin distancia se trata como 0 m y responde 400', async () => {
    const { service, tx } = montarPublicar();
    tx.activity.findFirst.mockResolvedValue(
      actividad({ distanceMeters: null }),
    );

    await expect(service.publish(USUARIO, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('una actividad que ya tiene ruta (publicada o archivada) responde 409 (RN-2, CA-8)', async () => {
    const { service, tx } = montarPublicar();
    tx.activity.findFirst.mockResolvedValue(
      actividad({ route: { id: 'r-1' } }),
    );

    await expect(service.publish(USUARIO, dto)).rejects.toThrow(
      new ConflictException('Esta actividad ya tiene una ruta publicada'),
    );
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('dos publicaciones simultáneas: el UNIQUE de sourceActivityId responde 409', async () => {
    const { service, prisma } = montarPublicar();
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.publish(USUARIO, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('un error inesperado se relanza', async () => {
    const { service, prisma } = montarPublicar();
    prisma.$transaction.mockRejectedValue(new Error('la base no responde'));

    await expect(service.publish(USUARIO, dto)).rejects.toThrow(
      'la base no responde',
    );
  });

  it('una actividad con menos de 2 puntos no tiene recorrido: 400', async () => {
    const { service, tx } = montarPublicar();
    tx.$queryRaw.mockResolvedValue(PUNTOS.slice(0, 1));

    await expect(service.publish(USUARIO, dto)).rejects.toThrow(
      new BadRequestException('La actividad no tiene recorrido para publicar'),
    );
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('lee los puntos de la actividad en orden', async () => {
    const { service, tx } = montarPublicar();

    await service.publish(USUARIO, dto);

    const [textos, ...valores] = tx.$queryRaw.mock.calls[0] as [
      string[],
      ...unknown[],
    ];
    expect(textos.join('?')).toContain('ORDER BY sequence');
    expect(valores).toEqual([ACTIVIDAD]);
  });

  it('sin descripción ni zona inserta null, y sin altitudes el perfil es null', async () => {
    const { service, tx } = montarPublicar();
    tx.$queryRaw.mockResolvedValue(
      PUNTOS.map((p) => ({ ...p, altitudeMeters: null })),
    );

    await service.publish(USUARIO, dto);

    const { valores } = insertDe(tx);
    expect(valores[2]).toBeNull();
    expect(valores[3]).toBeNull();
    expect(valores[7]).toBeNull();
  });

  it('inserta con los datos de la actividad, la dificultad y el perfil calculados (CA-6, RN-1)', async () => {
    const { service, tx } = montarPublicar();

    const id = await service.publish(USUARIO, {
      ...dto,
      description: 'Sube por el arroyo.',
      region: 'Ensenada',
    });

    const { sql, valores } = insertDe(tx);
    // Tipo, recorrido e inicio se copian de la fila de la actividad (RN-1).
    expect(sql).toContain('a.type');
    expect(sql).toContain(
      'recorrido.path, ST_StartPoint(recorrido.path)::geography',
    );
    expect(sql).toContain("'PUBLISHED'");
    expect(sql).toContain('FROM activities a');

    expect(valores).toEqual([
      id,
      'Cañón de Doña Petra',
      'Sube por el arroyo.',
      'Ensenada',
      // 3 km con 800 m a pie: Difícil por la elevación (RN-6).
      'HARD',
      3_000,
      800,
      expect.any(String),
      USUARIO,
      ACTIVIDAD,
      1,
      ACTIVIDAD,
    ]);
    const perfil = JSON.parse(valores[7] as string) as [number, number][];
    expect(perfil).toHaveLength(PUNTOS.length);
    expect(perfil[0]).toEqual([0, 100]);
    expect(perfil.at(-1)![1]).toBe(127);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('esVisible (spec 007, CA-14)', () => {
  it.each([
    ['PUBLISHED', false, true],
    ['PUBLISHED', true, true],
    ['ARCHIVED', true, true],
    ['ARCHIVED', false, false],
    ['DELETED', true, false],
    ['DELETED', false, false],
    ['DRAFT', true, false],
  ] as const)('%s (mía: %s) → %s', (status, esMia, esperado) => {
    expect(esVisible(status, esMia)).toBe(esperado);
  });
});

// Fila de la consulta del detalle (spec 007), con RUTA_DETALLE y ACTIVIDAD_DETALLE.
const RUTA_DETALLE = '7d9f3c1a-2b4e-4f6a-8c0d-1e2f3a4b5c6d';
const ACTIVIDAD_DETALLE = '0b6f6c2e-6f3a-4d1b-9a4e-2f7c8d9e0a1b';

function filaDetalle(overrides: Record<string, unknown> = {}) {
  return {
    id: RUTA_DETALLE,
    name: 'Cañón de Doña Petra',
    description: 'Sube por el arroyo.',
    region: 'Ensenada',
    type: 'HIKING',
    difficulty: 'MODERATE',
    distanceMeters: 5234.7,
    elevationGainMeters: 312,
    lat: 31.8667,
    lng: -116.5964,
    path: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [-116.5964, 31.8667],
        [-116.59, 31.87],
      ],
    }),
    elevationProfile: [
      [0, 100],
      [850.2, 140.5],
    ],
    author: 'Ana',
    isMine: false,
    isFavorite: true,
    status: 'PUBLISHED',
    sourceActivityId: ACTIVIDAD_DETALLE,
    createdAt: new Date('2026-10-20T18:30:00.000Z'),
    ...overrides,
  };
}

describe('RouteService.detail (spec 007)', () => {
  const RUTA = '7d9f3c1a-2b4e-4f6a-8c0d-1e2f3a4b5c6d';
  const ACTIVIDAD = '0b6f6c2e-6f3a-4d1b-9a4e-2f7c8d9e0a1b';

  it('convierte la fila a RouteDetail (CA-10, CA-11)', async () => {
    const { service, prisma } = montar();
    prisma.$queryRaw.mockResolvedValue([filaDetalle()]);

    expect(await service.detail(USUARIO, RUTA)).toEqual({
      id: RUTA,
      name: 'Cañón de Doña Petra',
      description: 'Sube por el arroyo.',
      region: 'Ensenada',
      type: 'HIKING',
      difficulty: 'MODERATE',
      distanceMeters: 5234.7,
      elevationGainMeters: 312,
      start: { latitude: 31.8667, longitude: -116.5964 },
      path: [
        [-116.5964, 31.8667],
        [-116.59, 31.87],
      ],
      elevationProfile: [
        [0, 100],
        [850.2, 140.5],
      ],
      author: 'Ana',
      isMine: false,
      isFavorite: true,
      status: 'PUBLISHED',
      // La actividad de origen solo la ve el dueño.
      sourceActivityId: null,
      publishedAt: '2026-10-20T18:30:00.000Z',
    });
  });

  it('al dueño le muestra isMine y la actividad de origen (CA-12)', async () => {
    const { service, prisma } = montar();
    prisma.$queryRaw.mockResolvedValue([filaDetalle({ isMine: true })]);

    const detalle = await service.detail(USUARIO, RUTA);

    expect(detalle.isMine).toBe(true);
    expect(detalle.sourceActivityId).toBe(ACTIVIDAD);
  });

  it('una ruta de ejemplo: sin actividad de origen y autor SendaBC (CA-12)', async () => {
    const { service, prisma } = montar();
    prisma.$queryRaw.mockResolvedValue([
      filaDetalle({ author: 'SendaBC', sourceActivityId: null }),
    ]);

    const detalle = await service.detail(USUARIO, RUTA);

    expect(detalle.author).toBe('SendaBC');
    expect(detalle.sourceActivityId).toBeNull();
  });

  it('el dueño ve su ruta archivada', async () => {
    const { service, prisma } = montar();
    prisma.$queryRaw.mockResolvedValue([
      filaDetalle({ isMine: true, status: 'ARCHIVED' }),
    ]);

    expect((await service.detail(USUARIO, RUTA)).status).toBe('ARCHIVED');
  });

  it.each([
    ['inexistente', []],
    ['archivada y ajena', [filaDetalle({ status: 'ARCHIVED' })]],
    ['borrada y ajena', [filaDetalle({ status: 'DELETED' })]],
    ['borrada y mía', [filaDetalle({ status: 'DELETED', isMine: true })]],
  ])(
    'una ruta %s responde 404 "ya no está disponible" (CA-14)',
    async (_, filas) => {
      const { service, prisma } = montar();
      prisma.$queryRaw.mockResolvedValue(filas);

      await expect(service.detail(USUARIO, RUTA)).rejects.toThrow(
        new NotFoundException('Esta ruta ya no está disponible'),
      );
    },
  );

  it('simplifica el recorrido a ~2 m y calcula isMine e isFavorite con el usuario del token', async () => {
    const { service, prisma } = montar();
    prisma.$queryRaw.mockResolvedValue([filaDetalle()]);

    await service.detail(USUARIO, RUTA);

    const sql = sqlDe(prisma);
    expect(sql).toContain('ST_Simplify(r.path, ?)');
    expect(sql).toContain('"createdByUserId" IS NOT DISTINCT FROM ?::uuid) AS "isMine"');
    expect(sql).toContain('route_favorites');
    expect(valoresDe(prisma)).toEqual([0.00002, USUARIO, USUARIO, RUTA]);
  });

  it('una ruta sin perfil devuelve elevationProfile null', async () => {
    const { service, prisma } = montar();
    prisma.$queryRaw.mockResolvedValue([
      filaDetalle({ elevationProfile: null }),
    ]);

    expect((await service.detail(USUARIO, RUTA)).elevationProfile).toBeNull();
  });
});

describe('RouteService.update y remove (spec 007)', () => {
  const RUTA = '7d9f3c1a-2b4e-4f6a-8c0d-1e2f3a4b5c6d';
  const OTRO = '22222222-2222-4222-8222-222222222222';

  function montarDueno(ruta: Record<string, unknown> | null) {
    const prisma = {
      route: {
        findUnique: vi.fn().mockResolvedValue(ruta),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: vi.fn(),
    };
    const service = new RouteService(prisma as unknown as PrismaService);
    const detalle = { id: RUTA } as never;
    const detail = vi.spyOn(service, 'detail').mockResolvedValue(detalle);
    return { service, prisma, detail, detalle };
  }

  const mia = { createdByUserId: USUARIO, status: 'PUBLISHED' };

  it('edita nombre, descripción y zona y devuelve el detalle (CA-22)', async () => {
    const { service, prisma, detail, detalle } = montarDueno(mia);
    const dto = { name: 'Nuevo nombre', description: null, region: 'Tecate' };

    expect(await service.update(USUARIO, RUTA, dto)).toBe(detalle);

    expect(prisma.route.updateMany).toHaveBeenCalledWith({
      where: { id: RUTA, createdByUserId: USUARIO, status: { not: 'DELETED' } },
      data: {
        name: 'Nuevo nombre',
        description: null,
        region: 'Tecate',
        status: undefined,
      },
    });
    expect(detail).toHaveBeenCalledWith(USUARIO, RUTA);
  });

  it('archiva una publicada y vuelve a publicar una archivada (CA-23, CA-24)', async () => {
    const archivar = montarDueno(mia);
    await archivar.service.update(USUARIO, RUTA, { status: 'ARCHIVED' });
    expect(archivar.prisma.route.updateMany.mock.calls[0][0].data.status).toBe(
      'ARCHIVED',
    );

    const publicar = montarDueno({ ...mia, status: 'ARCHIVED' });
    await publicar.service.update(USUARIO, RUTA, { status: 'PUBLISHED' });
    expect(publicar.prisma.route.updateMany.mock.calls[0][0].data.status).toBe(
      'PUBLISHED',
    );
  });

  it('lo que no se envía queda undefined y Prisma no lo cambia', async () => {
    const { service, prisma } = montarDueno(mia);

    await service.update(USUARIO, RUTA, { name: 'Solo el nombre' });

    expect(prisma.route.updateMany.mock.calls[0][0].data).toEqual({
      name: 'Solo el nombre',
      description: undefined,
      region: undefined,
      status: undefined,
    });
  });

  it('borrar es lógico: DELETED y suelta la actividad de origen (CA-25, RN-2)', async () => {
    const { service, prisma } = montarDueno({ ...mia, status: 'ARCHIVED' });

    await service.remove(USUARIO, RUTA);

    expect(prisma.route.updateMany).toHaveBeenCalledWith({
      where: { id: RUTA, createdByUserId: USUARIO, status: { not: 'DELETED' } },
      data: { status: 'DELETED', sourceActivityId: null },
    });
  });

  describe.each([
    ['editar', (s: RouteService) => s.update(USUARIO, RUTA, { name: 'X' })],
    ['borrar', (s: RouteService) => s.remove(USUARIO, RUTA)],
  ])('%s', (_, accion) => {
    it('una ruta publicada de otra cuenta responde 403 (CA-26)', async () => {
      const { service, prisma } = montarDueno({
        createdByUserId: OTRO,
        status: 'PUBLISHED',
      });

      await expect(accion(service)).rejects.toThrow(
        new ForbiddenException('Solo quien publicó esta ruta puede cambiarla'),
      );
      expect(prisma.route.updateMany).not.toHaveBeenCalled();
    });

    it.each([
      ['inexistente', null],
      ['archivada y ajena', { createdByUserId: OTRO, status: 'ARCHIVED' }],
      ['borrada y mía', { createdByUserId: USUARIO, status: 'DELETED' }],
    ])('una ruta %s responde 404', async (_, ruta) => {
      const { service, prisma } = montarDueno(ruta);

      await expect(accion(service)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.route.updateMany).not.toHaveBeenCalled();
    });
  });
});

describe('RouteService: Mis rutas y favoritas (spec 007)', () => {
  const RUTA = '7d9f3c1a-2b4e-4f6a-8c0d-1e2f3a4b5c6d';
  const OTRO = '22222222-2222-4222-8222-222222222222';

  function montarListas() {
    const prisma = {
      route: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
      },
      routeFavorite: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new RouteService(prisma as unknown as PrismaService);
    return { service, prisma };
  }

  describe('listMine (CA-21)', () => {
    it('pide las rutas del usuario del token, sin borradas, la más reciente primero', async () => {
      const { service, prisma } = montarListas();

      await service.listMine(USUARIO);

      expect(prisma.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdByUserId: USUARIO,
            status: { in: ['PUBLISHED', 'ARCHIVED'] },
          },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('convierte cada ruta a MyRoute con publishedAt en ISO 8601', async () => {
      const { service, prisma } = montarListas();
      prisma.route.findMany.mockResolvedValue([
        {
          id: RUTA,
          name: 'Cañón de Doña Petra',
          type: 'HIKING',
          distanceMeters: 3_000,
          status: 'ARCHIVED',
          sourceActivityId: 'act-1',
          createdAt: new Date('2026-10-20T18:30:00.000Z'),
        },
      ]);

      expect(await service.listMine(USUARIO)).toEqual([
        {
          id: RUTA,
          name: 'Cañón de Doña Petra',
          type: 'HIKING',
          distanceMeters: 3_000,
          status: 'ARCHIVED',
          sourceActivityId: 'act-1',
          publishedAt: '2026-10-20T18:30:00.000Z',
        },
      ]);
    });
  });

  describe('listFavorites (CA-18, CA-19, CA-20)', () => {
    function favorita(route: Record<string, unknown>, savedAt: string) {
      return {
        createdAt: new Date(savedAt),
        route: {
          id: RUTA,
          name: 'Ruta',
          type: 'CYCLING',
          distanceMeters: 20_000,
          elevationGainMeters: 450,
          status: 'PUBLISHED',
          createdByUserId: OTRO,
          ...route,
        },
      };
    }

    it('solo pide las favoritas del usuario del token, la guardada más reciente primero', async () => {
      const { service, prisma } = montarListas();

      await service.listFavorites(USUARIO);

      expect(prisma.routeFavorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USUARIO },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('convierte cada favorita con savedAt en ISO 8601', async () => {
      const { service, prisma } = montarListas();
      prisma.routeFavorite.findMany.mockResolvedValue([
        favorita({}, '2026-10-20T18:30:00.000Z'),
      ]);

      expect(await service.listFavorites(USUARIO)).toEqual([
        {
          id: RUTA,
          name: 'Ruta',
          type: 'CYCLING',
          distanceMeters: 20_000,
          elevationGainMeters: 450,
          available: true,
          savedAt: '2026-10-20T18:30:00.000Z',
        },
      ]);
    });

    it.each([
      ['publicada y ajena', { status: 'PUBLISHED' }, true],
      ['archivada y ajena', { status: 'ARCHIVED' }, false],
      [
        'archivada y mía',
        { status: 'ARCHIVED', createdByUserId: USUARIO },
        true,
      ],
      ['borrada', { status: 'DELETED' }, false],
    ])('una ruta %s queda con available: %s', async (_, route, available) => {
      const { service, prisma } = montarListas();
      prisma.routeFavorite.findMany.mockResolvedValue([
        favorita(route, '2026-10-20T18:30:00.000Z'),
      ]);

      const [resultado] = await service.listFavorites(USUARIO);

      expect(resultado.available).toBe(available);
    });

    it('conserva el orden de la consulta', async () => {
      const { service, prisma } = montarListas();
      prisma.routeFavorite.findMany.mockResolvedValue([
        favorita({ id: 'r-nueva' }, '2026-10-20T18:30:00.000Z'),
        favorita({ id: 'r-vieja' }, '2026-10-01T08:00:00.000Z'),
      ]);

      const ids = (await service.listFavorites(USUARIO)).map((f) => f.id);

      expect(ids).toEqual(['r-nueva', 'r-vieja']);
    });
  });

  describe('addFavorite (CA-15, CA-16)', () => {
    it('guarda una ruta visible sin duplicarla (skipDuplicates)', async () => {
      const { service, prisma } = montarListas();
      prisma.route.findUnique.mockResolvedValue({
        createdByUserId: OTRO,
        status: 'PUBLISHED',
      });

      await service.addFavorite(USUARIO, RUTA);

      expect(prisma.routeFavorite.createMany).toHaveBeenCalledWith({
        data: [{ userId: USUARIO, routeId: RUTA }],
        skipDuplicates: true,
      });
    });

    it('el dueño puede guardar su ruta archivada', async () => {
      const { service, prisma } = montarListas();
      prisma.route.findUnique.mockResolvedValue({
        createdByUserId: USUARIO,
        status: 'ARCHIVED',
      });

      await service.addFavorite(USUARIO, RUTA);

      expect(prisma.routeFavorite.createMany).toHaveBeenCalled();
    });

    it.each([
      ['inexistente', null],
      ['archivada y ajena', { createdByUserId: OTRO, status: 'ARCHIVED' }],
      ['borrada', { createdByUserId: OTRO, status: 'DELETED' }],
    ])('una ruta %s responde 404 sin guardar', async (_, ruta) => {
      const { service, prisma } = montarListas();
      prisma.route.findUnique.mockResolvedValue(ruta);

      await expect(service.addFavorite(USUARIO, RUTA)).rejects.toThrow(
        new NotFoundException('Esta ruta ya no está disponible'),
      );
      expect(prisma.routeFavorite.createMany).not.toHaveBeenCalled();
    });
  });

  describe('removeFavorite (CA-16, CA-19)', () => {
    it('borra solo la favorita del usuario del token, sin revisar la ruta', async () => {
      const { service, prisma } = montarListas();

      await service.removeFavorite(USUARIO, RUTA);

      expect(prisma.routeFavorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: USUARIO, routeId: RUTA },
      });
      expect(prisma.route.findUnique).not.toHaveBeenCalled();
    });

    it('quitar una que no está en favoritas no da error', async () => {
      const { service, prisma } = montarListas();
      prisma.routeFavorite.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.removeFavorite(USUARIO, RUTA),
      ).resolves.toBeUndefined();
    });
  });
});

describe('RouteService: rutas de una cuenta borrada (spec 011, CA-48, RN-16)', () => {
  const RUTA = '7d9f3c1a-2b4e-4f6a-8c0d-1e2f3a4b5c6d';
  const autorSql = `COALESCE(u."displayName", '${AUTOR_CUENTA_ELIMINADA}') AS author`;

  it('el autor por defecto es "Cuenta eliminada"', () => {
    expect(AUTOR_CUENTA_ELIMINADA).toBe('Cuenta eliminada');
  });

  it.each([
    ['nearby', (s: RouteService) => s.nearby(USUARIO, query)],
    ['detail', (s: RouteService) => s.detail(USUARIO, RUTA).catch(() => undefined)],
  ])('%s: LEFT JOIN, autor "Cuenta eliminada" e isMine falso sin autor', async (_, llamar) => {
    const { service, prisma } = montar();

    await llamar(service);

    const sql = sqlDe(prisma);
    expect(sql).toContain('FROM routes r LEFT JOIN users u ON u.id = r."createdByUserId"');
    expect(sql).not.toMatch(/FROM routes r JOIN users/);
    expect(sql).toContain(autorSql);
    // Con createdByUserId nulo, "=" daría NULL; IS NOT DISTINCT FROM da false.
    expect(sql).toContain('"createdByUserId" IS NOT DISTINCT FROM ?::uuid) AS "isMine"');
  });

  it('el detalle de una publicada sin autor la muestra a todos, sin actividad de origen', async () => {
    const { service, prisma } = montar();
    prisma.$queryRaw.mockResolvedValue([
      filaDetalle({ author: AUTOR_CUENTA_ELIMINADA, isMine: false, sourceActivityId: null }),
    ]);

    const detalle = await service.detail(USUARIO, RUTA);

    expect(detalle.author).toBe('Cuenta eliminada');
    expect(detalle.isMine).toBe(false);
    expect(detalle.sourceActivityId).toBeNull();
  });

  function montarSinAutor(status = 'PUBLISHED') {
    const prisma = {
      route: {
        findUnique: vi.fn().mockResolvedValue({ createdByUserId: null, status }),
        updateMany: vi.fn(),
      },
    };
    return { service: new RouteService(prisma as unknown as PrismaService), prisma };
  }

  it('nadie puede editarla, archivarla ni borrarla: 403 (RN-16)', async () => {
    const editar = montarSinAutor();
    await expect(
      editar.service.update(USUARIO, RUTA, { status: 'ARCHIVED' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(editar.prisma.route.updateMany).not.toHaveBeenCalled();

    const borrar = montarSinAutor();
    await expect(borrar.service.remove(USUARIO, RUTA)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(borrar.prisma.route.updateMany).not.toHaveBeenCalled();
  });

  it('una no publicada sin autor no la ve nadie: 404', async () => {
    const { service } = montarSinAutor('ARCHIVED');
    await expect(service.remove(USUARIO, RUTA)).rejects.toBeInstanceOf(NotFoundException);
  });
});
