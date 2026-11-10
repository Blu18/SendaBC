import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeDistance } from '../metrics/distance';
import { at, path } from '../metrics/testing';
import { createTestDb } from './testing';

// Las consultas reales corren contra el esquema real (schema.ts) en una base en memoria.
let testDb: ReturnType<typeof createTestDb>;
vi.mock('./sqlite', () => ({ getDb: async () => testDb }));
vi.mock('expo-crypto', () => ({ randomUUID: () => randomUUID() }));

const { createActivity, finishActivity, getActivity, insertPoint, markSynced } = await import('./activities');
const { finalizeMetrics, recalcularDistanciasViejas, RECALCULATED_DISTANCES_KEY } = await import(
  './activityMetrics'
);
const { getSetting, setSetting } = await import('./settings');

// Mismo inicio que lib/metrics/testing.ts: 500 m caminando hacia el norte.
const STARTED_AT = '2026-10-05T15:00:00.000Z';
const WALK = path([[0, 0], [0, 500]], 2.6);
// Ubicación guardada de 25 minutos antes, a 300 m: a 0.2 m/s no es un salto, así que la
// distancia de la spec 004 la suma (spec 011, P7).
const OLD = at(300, 0, 5, -25 * 60);

async function finished(points = [OLD, ...WALK]) {
  const id = await createActivity('usuario-a', 'HIKING', 'GPS', STARTED_AT);
  for (const [i, p] of points.entries()) {
    await insertPoint(id, { ...p, sequence: i + 1, altitude: null });
  }
  await finishActivity(id, '2026-10-05T15:10:00.000Z');
  await finalizeMetrics(id);
  return id;
}

beforeEach(() => {
  testDb = createTestDb();
});

describe('recalcularDistanciasViejas (spec 011, CA-17, RN-11)', () => {
  it('quita los puntos viejos de la distancia y no cambia el estado ni las demás métricas', async () => {
    const id = await finished();
    await markSynced(id, 'server-1');
    const before = (await getActivity(id))!;
    expect(before.distanceMeters).toBeGreaterThan(computeDistance(WALK) + 200);

    expect(await recalcularDistanciasViejas()).toBe(1);

    const after = (await getActivity(id))!;
    expect(after.distanceMeters).toBeCloseTo(computeDistance(WALK), 6);
    expect(after).toEqual({ ...before, distanceMeters: after.distanceMeters });
    expect(after.status).toBe('SYNCED');
  });

  it('no toca las actividades sin puntos viejos', async () => {
    const id = await finished(WALK);
    const before = await getActivity(id);

    expect(await recalcularDistanciasViejas()).toBe(0);
    expect(await getActivity(id)).toEqual(before);
  });

  it('corre una sola vez por teléfono', async () => {
    await finished();
    expect(await recalcularDistanciasViejas()).toBe(1);
    expect(await getSetting('', RECALCULATED_DISTANCES_KEY)).not.toBeNull();

    // Una actividad vieja que llegue después ya no se recalcula.
    await finished();
    expect(await recalcularDistanciasViejas()).toBe(0);
  });

  it('recalcular dos veces da lo mismo', async () => {
    const id = await finished();
    await recalcularDistanciasViejas();
    const once = (await getActivity(id))!.distanceMeters;

    testDb.raw.exec(`DELETE FROM app_settings`);
    expect(await recalcularDistanciasViejas()).toBe(0);
    expect((await getActivity(id))!.distanceMeters).toBe(once);
  });

  it('con un error no se marca, para repetirlo en la siguiente apertura', async () => {
    await finished();
    const spy = vi.spyOn(testDb, 'runAsync').mockRejectedValueOnce(new Error('database is locked'));
    vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(await recalcularDistanciasViejas()).toBe(0);
    expect(await getSetting('', RECALCULATED_DISTANCES_KEY)).toBeNull();

    spy.mockRestore();
    expect(await recalcularDistanciasViejas()).toBe(1);
  });

  it('no se cruza con los ajustes de una cuenta', async () => {
    await setSetting('usuario-a', RECALCULATED_DISTANCES_KEY, 'x');
    await finished();
    expect(await recalcularDistanciasViejas()).toBe(1);
  });
});
