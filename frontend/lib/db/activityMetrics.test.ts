import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeDistance } from '../metrics/distance';
import { activityProfile } from '../metrics/profile';
import { at, path } from '../metrics/testing';
import { createTestDb } from './testing';

// Las consultas reales corren contra el esquema real (schema.ts) en una base en memoria.
let testDb: ReturnType<typeof createTestDb>;
vi.mock('./sqlite', () => ({ getDb: async () => testDb }));
vi.mock('expo-crypto', () => ({ randomUUID: () => randomUUID() }));

const { createActivity, finishActivity, getActivity, getActivityPoints, insertPoint, listActivityIdsMissingPeak, markSynced, saveMetrics } =
  await import('./activities');
const { computeMissingPeaks, computePeak, finalizeMetrics, recalcularDistanciasViejas, RECALCULATED_DISTANCES_KEY } = await import(
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

describe('Cumbre para el filtro de altura (spec 015, CA-5, RN-5; plan, D1)', () => {
  // 500 m hacia el norte subiendo de 100 a ~290 m: alcanza el mínimo del perfil (spec 014, RN-6).
  async function conSubida({ finalizar = true } = {}) {
    const id = await createActivity('usuario-a', 'HIKING', 'GPS', STARTED_AT);
    for (const [i, p] of WALK.entries()) {
      await insertPoint(id, { ...p, sequence: i + 1, altitude: 100 + i });
    }
    await finishActivity(id, '2026-10-05T15:10:00.000Z');
    if (finalizar) await finalizeMetrics(id);
    // Sin finalizeMetrics, como una actividad de antes de la v7: métricas sí, cumbre no.
    else await saveMetrics(id, { distanceMeters: 500, durationSeconds: 600, elevationGainMeters: 1, elevationLossMeters: 0, elevationSource: 'GPS' });
    return id;
  }

  // Lo que dibuja el resumen con los mismos puntos (spec 014, CA-5).
  async function cumbreDelResumen(id: number) {
    const profile = activityProfile({ points: await getActivityPoints(id), barometerReadings: [], source: 'GPS' });
    return profile!.cumbre.altitudM;
  }

  it('finalizeMetrics guarda la misma cumbre que marca el perfil del resumen', async () => {
    const id = await conSubida();

    const peak = (await getActivity(id))!.peakAltitudeMeters;
    expect(peak).not.toBeNull();
    expect(peak).toBeCloseTo(await cumbreDelResumen(id), 6);
    expect(await listActivityIdsMissingPeak()).toEqual([]);
  });

  it('una actividad de menos de 200 m queda calculada y sin cumbre (RN-5)', async () => {
    const id = await finished(path([[0, 0], [0, 150]], 2.6));

    expect((await getActivity(id))!.peakAltitudeMeters).toBeNull();
    expect(await listActivityIdsMissingPeak()).toEqual([]);
  });

  it('computeMissingPeaks calcula las que faltan, una sola vez, y no toca la que se graba', async () => {
    const vieja = await conSubida({ finalizar: false });
    const grabando = await createActivity('usuario-a', 'HIKING', 'GPS', '2026-10-06T15:00:00.000Z');
    const antes = (await getActivity(vieja))!;

    expect(await computeMissingPeaks()).toBe(1);

    const despues = (await getActivity(vieja))!;
    expect(despues.peakAltitudeMeters).toBeCloseTo(await cumbreDelResumen(vieja), 6);
    expect(despues).toEqual({ ...antes, peakAltitudeMeters: despues.peakAltitudeMeters });
    expect(await computeMissingPeaks()).toBe(0);
    expect(await computePeak(grabando)).toBe(false);
  });
});
