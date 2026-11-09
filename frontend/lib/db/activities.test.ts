import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb } from './testing';

// Las consultas reales corren contra el esquema real (schema.ts) en una base en memoria.
let testDb: ReturnType<typeof createTestDb>;
vi.mock('./sqlite', () => ({ getDb: async () => testDb }));
vi.mock('expo-crypto', () => ({ randomUUID: () => randomUUID() }));

const {
  countPendingUploads,
  createActivity,
  finishActivity,
  getActivity,
  getActivityPoints,
  getLastPoint,
  getRecordingActivity,
  insertDownloadedActivity,
  insertPoint,
  listClientIds,
  listFinishedActivities,
  listUploadable,
  markSynced,
  markSyncError,
  saveMetrics,
  PUNTOS_POR_LOTE,
} = await import('./activities');

const A = 'usuario-a';
const B = 'usuario-b';

const metricas = {
  distanceMeters: 1234.5,
  durationSeconds: 600,
  elevationGainMeters: 40,
  elevationLossMeters: 35,
  elevationSource: 'GPS' as const,
};

// Actividad terminada con métricas, como la deja la spec 004 al detener.
async function terminada(userId: string, startedAt: string, conMetricas = true) {
  const id = await createActivity(userId, 'HIKING', 'GPS', startedAt);
  await insertPoint(id, {
    sequence: 1,
    latitude: 31.86,
    longitude: -116.59,
    altitude: 20,
    accuracy: 4,
    recordedAt: startedAt,
  });
  await finishActivity(id, startedAt.replace('T10', 'T11'));
  if (conMetricas) await saveMetrics(id, metricas);
  return id;
}

beforeEach(() => {
  testDb = createTestDb();
});

describe('listUploadable (spec 005, CA-3, CA-17, CA-19)', () => {
  it('devuelve solo las terminadas con métricas del usuario, la más antigua primero', async () => {
    const nueva = await terminada(A, '2026-10-09T10:00:00.000Z');
    const vieja = await terminada(A, '2026-10-08T10:00:00.000Z');
    await terminada(A, '2026-10-07T10:00:00.000Z', false); // métricas pendientes
    await createActivity(A, 'HIKING', 'GPS', '2026-10-06T10:00:00.000Z'); // grabando
    await terminada(B, '2026-10-05T10:00:00.000Z'); // de otra persona
    const sinDueno = await terminada(A, '2026-10-04T10:00:00.000Z');
    testDb.raw.exec(`UPDATE activities SET user_id = NULL WHERE local_id = ${sinDueno}`);

    const lista = await listUploadable(A);

    expect(lista.map((a) => a.localId)).toEqual([vieja, nueva]);
  });

  it('no incluye las sincronizadas', async () => {
    const id = await terminada(A, '2026-10-09T10:00:00.000Z');
    await markSynced(id, 'srv-1');

    expect(await listUploadable(A)).toEqual([]);
  });

  it('las rechazadas solo entran con includeRejected (CA-16)', async () => {
    const id = await terminada(A, '2026-10-09T10:00:00.000Z');
    await markSyncError(id, 'El fin de la actividad no puede ser anterior al inicio');

    expect(await listUploadable(A)).toEqual([]);
    expect((await listUploadable(A, { includeRejected: true })).map((a) => a.localId)).toEqual([
      id,
    ]);
  });
});

describe('markSynced y markSyncError (spec 005, CA-11, CA-13)', () => {
  it('markSynced pasa a SYNCED, guarda el server_id y borra el error', async () => {
    const id = await terminada(A, '2026-10-09T10:00:00.000Z');
    await markSyncError(id, 'motivo');

    await markSynced(id, 'srv-1');

    expect(await getActivity(id)).toMatchObject({
      status: 'SYNCED',
      serverId: 'srv-1',
      syncError: null,
    });
  });

  it('markSyncError guarda el motivo sin cambiar el estado', async () => {
    const id = await terminada(A, '2026-10-09T10:00:00.000Z');

    await markSyncError(id, 'motivo');

    expect(await getActivity(id)).toMatchObject({
      status: 'PENDING_SYNC',
      syncError: 'motivo',
      serverId: null,
    });
  });

  it('no tocan una actividad que sigue grabando (constitución 2.3)', async () => {
    const id = await createActivity(A, 'HIKING', 'GPS');

    await markSynced(id, 'srv-1');
    await markSyncError(id, 'motivo');

    expect(await getActivity(id)).toMatchObject({
      status: 'RECORDING',
      serverId: null,
      syncError: null,
    });
  });
});

describe('countPendingUploads (spec 005, CA-24)', () => {
  it('cuenta las pendientes del usuario, rechazadas y sin métricas incluidas', async () => {
    await terminada(A, '2026-10-09T10:00:00.000Z');
    const rechazada = await terminada(A, '2026-10-08T10:00:00.000Z');
    await markSyncError(rechazada, 'motivo');
    await terminada(A, '2026-10-07T10:00:00.000Z', false);
    const subida = await terminada(A, '2026-10-06T10:00:00.000Z');
    await markSynced(subida, 'srv-1');
    await terminada(B, '2026-10-05T10:00:00.000Z');

    expect(await countPendingUploads(A)).toBe(3);
    expect(await countPendingUploads(B)).toBe(1);
  });
});

describe('Recuperar actividades (spec 005, CA-20 a CA-22)', () => {
  const descargada = {
    serverId: 'srv-9',
    clientGeneratedId: randomUUID(),
    type: 'CYCLING' as const,
    startedAt: '2026-10-01T10:00:00.000Z',
    endedAt: '2026-10-01T11:00:00.000Z',
    distanceMeters: 18400,
    durationSeconds: 3600,
    elevationGainMeters: 210,
    elevationLossMeters: 205,
    elevationSource: 'BAROMETER' as const,
    points: [1, 2, 3].map((sequence) => ({
      sequence,
      latitude: 31.8 + sequence / 1000,
      longitude: -116.6,
      altitude: sequence === 2 ? null : 100,
      accuracy: null,
      recordedAt: `2026-10-01T10:00:0${sequence}.000Z`,
    })),
  };

  it('guarda la actividad como SYNCED con métricas, fuente, server_id y puntos', async () => {
    const id = await insertDownloadedActivity(descargada, A);

    expect(await getActivity(id)).toEqual({
      localId: id,
      clientGeneratedId: descargada.clientGeneratedId,
      userId: A,
      type: 'CYCLING',
      status: 'SYNCED',
      startedAt: descargada.startedAt,
      endedAt: descargada.endedAt,
      elevationSource: 'BAROMETER',
      distanceMeters: 18400,
      durationSeconds: 3600,
      elevationGainMeters: 210,
      elevationLossMeters: 205,
      serverId: 'srv-9',
      syncError: null,
    });
    expect(await getActivityPoints(id)).toEqual(descargada.points);
    // Aparece en el historial y no se vuelve a subir.
    expect((await listFinishedActivities(A)).map((a) => a.localId)).toEqual([id]);
    expect(await listUploadable(A)).toEqual([]);
  });

  it('listClientIds incluye las actividades de cualquier usuario', async () => {
    await insertDownloadedActivity(descargada, A);
    const otra = await createActivity(B, 'HIKING', 'GPS');
    const deB = (await getActivity(otra))!.clientGeneratedId;

    expect(await listClientIds()).toEqual(new Set([descargada.clientGeneratedId, deB]));
  });

  it('una actividad repetida no se guarda dos veces y no deja puntos sueltos', async () => {
    await insertDownloadedActivity(descargada, A);

    await expect(insertDownloadedActivity(descargada, A)).rejects.toThrow(/UNIQUE/);
    const puntos = testDb.raw.prepare('SELECT COUNT(*) AS n FROM activity_points').get() as {
      n: number;
    };
    expect(puntos.n).toBe(3);
  });

  // Spec 011, CA-13 (plan, R2): los puntos van por lotes para que la transacción sea corta.
  function larga(n: number) {
    return {
      ...descargada,
      clientGeneratedId: randomUUID(),
      points: Array.from({ length: n }, (_, i) => ({
        sequence: i + 1,
        latitude: 31.8 + i / 100000,
        longitude: -116.6,
        altitude: 100,
        accuracy: 4,
        recordedAt: new Date(Date.parse('2026-10-01T10:00:00.000Z') + i * 3000).toISOString(),
      })),
    };
  }

  it('guarda una actividad larga completa y en orden, con un INSERT por lote', async () => {
    const actividad = larga(PUNTOS_POR_LOTE * 2 + 1);
    const runAsync = vi.spyOn(testDb, 'runAsync');

    const id = await insertDownloadedActivity(actividad, A);

    expect(await getActivityPoints(id)).toEqual(actividad.points);
    const inserts = runAsync.mock.calls.filter(([sql]) => sql.includes('activity_points'));
    expect(inserts).toHaveLength(3);
    runAsync.mockRestore();
  });

  it('si falla un lote no queda nada de la actividad', async () => {
    const actividad = larga(PUNTOS_POR_LOTE + 10);
    // Un punto inválido en el segundo lote (latitude es NOT NULL).
    (actividad.points[PUNTOS_POR_LOTE + 5] as { latitude: number | null }).latitude = null;

    await expect(insertDownloadedActivity(actividad, A)).rejects.toThrow(/NOT NULL/);
    expect(await listClientIds()).toEqual(new Set());
    const puntos = testDb.raw.prepare('SELECT COUNT(*) AS n FROM activity_points').get() as {
      n: number;
    };
    expect(puntos.n).toBe(0);
  });
});

describe('getRecordingActivity y getLastPoint (spec 008)', () => {
  it('devuelve la actividad en curso y su último punto', async () => {
    expect(await getRecordingActivity()).toBeNull();
    await terminada(A, '2026-10-09T10:00:00.000Z');
    expect(await getRecordingActivity()).toBeNull();

    const id = await createActivity(A, 'HIKING', 'GPS', '2026-10-26T10:00:00.000Z');
    expect(await getRecordingActivity()).toEqual({
      localId: id,
      userId: A,
      startedAt: '2026-10-26T10:00:00.000Z',
    });
    expect(await getLastPoint(id)).toBeNull();

    for (const sequence of [1, 2]) {
      await insertPoint(id, {
        sequence,
        latitude: 31.86 + sequence / 1000,
        longitude: -116.59,
        altitude: null,
        accuracy: 5,
        recordedAt: `2026-10-26T10:0${sequence}:00.000Z`,
      });
    }
    expect(await getLastPoint(id)).toMatchObject({
      sequence: 2,
      latitude: 31.862,
    });

    await finishActivity(id);
    expect(await getRecordingActivity()).toBeNull();
  });
});
