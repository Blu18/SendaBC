import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FavoriteRoute, NearbyRoute, RouteDetail } from '../routes/api';
import { createTestDb } from './testing';

// Las consultas reales corren contra el esquema real (schema.ts) en una base en memoria.
let testDb: ReturnType<typeof createTestDb>;
vi.mock('./sqlite', () => ({ getDb: async () => testDb }));

const {
  MAX_DETALLES,
  deleteRouteDetail,
  getFavorites,
  getNearby,
  getRouteDetail,
  saveFavorites,
  saveNearby,
  saveRouteDetail,
  trimRouteDetails,
} = await import('./routeCache');

beforeEach(() => {
  testDb = createTestDb();
});

const nearby = (id: string): NearbyRoute => ({
  id,
  name: `Ruta ${id}`,
  type: 'HIKING',
  difficulty: 'EASY',
  distanceMeters: 1000,
  elevationGainMeters: 50,
  start: { latitude: 32.5, longitude: -116.9 },
  distanceFromCenterMeters: 200,
  path: [
    [-116.9, 32.5],
    [-116.91, 32.51],
  ],
  author: 'Ana',
  isMine: false,
});

const detail = (id: string): RouteDetail =>
  ({
    ...nearby(id),
    description: null,
    region: null,
    elevationProfile: null,
    isFavorite: false,
  }) as unknown as RouteDetail;

const favorite = (id: string): FavoriteRoute => ({
  id,
  name: `Ruta ${id}`,
  type: 'HIKING',
  distanceMeters: 1000,
  elevationGainMeters: 50,
  available: true,
  savedAt: '2026-11-01T00:00:00.000Z',
});

// Fechas distintas y crecientes para ordenar los detalles por antigüedad.
const minuto = (n: number) => new Date(Date.UTC(2026, 10, 8, 12, n));

describe('última búsqueda (CA-53, RN-14)', () => {
  it('sin nada guardado devuelve null (CA-54)', async () => {
    expect(await getNearby('a')).toBeNull();
  });

  it('guarda los resultados con su fecha', async () => {
    await saveNearby('a', [nearby('r1')], minuto(0));

    expect(await getNearby('a')).toEqual({ data: [nearby('r1')], savedAt: '2026-11-08T12:00:00.000Z' });
  });

  it('conserva solo la última búsqueda, no un historial', async () => {
    await saveNearby('a', [nearby('r1')], minuto(0));
    await saveNearby('a', [nearby('r2'), nearby('r3')], minuto(1));

    const guardado = await getNearby('a');
    expect(guardado?.data.map((r) => r.id)).toEqual(['r2', 'r3']);
    expect(guardado?.savedAt).toBe(minuto(1).toISOString());
    expect(await testDb.getAllAsync(`SELECT * FROM route_cache WHERE kind = 'nearby'`)).toHaveLength(1);
  });

  it('una búsqueda sin resultados también se guarda', async () => {
    await saveNearby('a', [], minuto(0));

    expect((await getNearby('a'))?.data).toEqual([]);
  });

  it('un valor dañado se trata como si no hubiera nada', async () => {
    await testDb.runAsync(
      `INSERT INTO route_cache (user_id, kind, cache_key, payload, saved_at) VALUES ('a', 'nearby', 'last', '{roto', 'x')`
    );

    expect(await getNearby('a')).toBeNull();
  });
});

describe('favoritas (CA-56)', () => {
  it('guarda y reemplaza la lista', async () => {
    expect(await getFavorites('a')).toBeNull();

    await saveFavorites('a', [favorite('f1'), favorite('f2')], minuto(0));
    await saveFavorites('a', [favorite('f2')], minuto(1));

    expect(await getFavorites('a')).toEqual({ data: [favorite('f2')], savedAt: minuto(1).toISOString() });
  });
});

describe('detalle (CA-55, CA-59)', () => {
  it('guarda, reemplaza y lee el detalle por id', async () => {
    await saveRouteDetail('a', detail('r1'), minuto(0));
    await saveRouteDetail('a', { ...detail('r1'), name: 'Nuevo nombre' }, minuto(1));

    const guardado = await getRouteDetail('a', 'r1');
    expect(guardado?.data.name).toBe('Nuevo nombre');
    expect(guardado?.savedAt).toBe(minuto(1).toISOString());
    expect(await getRouteDetail('a', 'otra')).toBeNull();
  });

  it('borrar quita solo esa ruta (404, CA-59)', async () => {
    await saveRouteDetail('a', detail('r1'), minuto(0));
    await saveRouteDetail('a', detail('r2'), minuto(1));

    await deleteRouteDetail('a', 'r1');

    expect(await getRouteDetail('a', 'r1')).toBeNull();
    expect(await getRouteDetail('a', 'r2')).not.toBeNull();
  });

  it(`conserva las últimas ${MAX_DETALLES} rutas abiertas y las favoritas`, async () => {
    // r0 y r1 son las más antiguas; r1 es favorita.
    await saveFavorites('a', [favorite('r1')], minuto(0));
    for (let i = 0; i < MAX_DETALLES + 2; i++) await saveRouteDetail('a', detail(`r${i}`), minuto(i));

    expect(await getRouteDetail('a', 'r0')).toBeNull();
    expect(await getRouteDetail('a', 'r1')).not.toBeNull();
    expect(await getRouteDetail('a', `r${MAX_DETALLES + 1}`)).not.toBeNull();
    const n = await testDb.getFirstAsync<{ n: number }>(`SELECT count(*) AS n FROM route_cache WHERE kind = 'detail'`);
    expect(n?.n).toBe(MAX_DETALLES + 1);
  });

  it('volver a abrir una ruta antigua la pone al día y no se recorta', async () => {
    await saveRouteDetail('a', detail('vieja'), minuto(0));
    await saveRouteDetail('a', detail('nueva'), minuto(1));
    await saveRouteDetail('a', detail('vieja'), minuto(2));

    await trimRouteDetails('a', 1);

    expect(await getRouteDetail('a', 'vieja')).not.toBeNull();
    expect(await getRouteDetail('a', 'nueva')).toBeNull();
  });
});

describe('separado por cuenta (CA-60, RN-14)', () => {
  it('otra cuenta no ve la búsqueda, los detalles ni las favoritas', async () => {
    await saveNearby('a', [nearby('r1')], minuto(0));
    await saveFavorites('a', [favorite('r1')], minuto(0));
    await saveRouteDetail('a', detail('r1'), minuto(0));

    expect(await getNearby('b')).toBeNull();
    expect(await getFavorites('b')).toBeNull();
    expect(await getRouteDetail('b', 'r1')).toBeNull();
  });

  it('recortar y borrar no tocan los detalles de otra cuenta', async () => {
    await saveRouteDetail('b', detail('r1'), minuto(0));
    await saveRouteDetail('a', detail('r1'), minuto(1));
    await saveRouteDetail('a', detail('r2'), minuto(2));

    await trimRouteDetails('a', 0);
    await deleteRouteDetail('a', 'r1');

    expect(await getRouteDetail('b', 'r1')).not.toBeNull();
  });
});
