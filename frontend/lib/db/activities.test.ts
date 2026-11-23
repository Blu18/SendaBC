import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb } from './testing';

// Las consultas reales corren contra el esquema real (schema.ts) en una base en memoria.
let testDb: ReturnType<typeof createTestDb>;
vi.mock('./sqlite', () => ({ getDb: async () => testDb }));
vi.mock('expo-crypto', () => ({ randomUUID: () => randomUUID() }));

const {
  closeOrphanActivities,
  countValidPoints,
  discardActivity,
  insertBarometerReading,
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
  listRecentActivities,
  listUploadable,
  markSynced,
  markSyncError,
  repararFinAntesDelInicio,
  saveMetrics,
  savePeak,
  listActivityIdsMissingPeak,
  summarizeSince,
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
      peakAltitudeMeters: null, // se calcula después (spec 015, plan D1)
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
    // Lotes de pocos puntos volverían a alargar la transacción (T48).
    expect(PUNTOS_POR_LOTE).toBeGreaterThanOrEqual(100);
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

describe('Cerrar sin "Detener" (spec 003, CA-10; spec 011, F1)', () => {
  const INICIO = '2026-11-07T10:00:00.000Z';
  const punto = (sequence: number, recordedAt: string) => ({
    sequence,
    latitude: 31.86,
    longitude: -116.59,
    altitude: null,
    accuracy: 5,
    recordedAt,
  });

  it('closeOrphanActivities cierra con la hora del último punto, o el inicio sin puntos', async () => {
    const conPuntos = await createActivity(A, 'HIKING', 'GPS', INICIO);
    await insertPoint(conPuntos, punto(1, '2026-11-07T10:01:00.000Z'));
    await insertPoint(conPuntos, punto(2, '2026-11-07T10:02:00.000Z'));
    const sinPuntos = await createActivity(A, 'HIKING', 'GPS', INICIO);

    expect(await closeOrphanActivities()).toEqual([conPuntos, sinPuntos]);

    expect(await getActivity(conPuntos)).toMatchObject({
      status: 'PENDING_SYNC',
      endedAt: '2026-11-07T10:02:00.000Z',
    });
    expect(await getActivity(sinPuntos)).toMatchObject({ status: 'PENDING_SYNC', endedAt: INICIO });
  });

  it('closeOrphanActivities nunca deja el fin antes del inicio', async () => {
    const id = await createActivity(A, 'HIKING', 'GPS', INICIO);
    await insertPoint(id, punto(1, '2026-11-07T09:59:59.905Z'));

    await closeOrphanActivities();

    expect((await getActivity(id))!.endedAt).toBe(INICIO);
  });

  it('repararFinAntesDelInicio corrige el fin, borra las métricas y quita el error', async () => {
    const id = await createActivity(A, 'HIKING', 'GPS', INICIO);
    await insertPoint(id, punto(1, '2026-11-07T09:59:59.905Z'));
    await finishActivity(id, '2026-11-07T09:59:59.905Z'); // como cerraba antes de F1
    await saveMetrics(id, metricas);
    await markSyncError(id, 'El fin de la actividad no puede ser anterior al inicio');
    const sana = await terminada(A, '2026-10-09T10:00:00.000Z');
    await markSyncError(sana, 'otro motivo');

    expect(await repararFinAntesDelInicio()).toBe(1);

    expect(await getActivity(id)).toMatchObject({
      status: 'PENDING_SYNC',
      endedAt: INICIO,
      distanceMeters: null,
      durationSeconds: null,
      elevationGainMeters: null,
      elevationLossMeters: null,
      elevationSource: 'GPS', // la fuente elegida al iniciar se conserva
      syncError: null,
    });
    // Las demás no cambian.
    expect(await getActivity(sana)).toMatchObject({
      syncError: 'otro motivo',
      distanceMeters: 1234.5,
    });
    expect(await repararFinAntesDelInicio()).toBe(0);
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

describe('Inicio: listRecentActivities y summarizeSince (spec 013, CA-3, CA-6, RN-2 a RN-4)', () => {
  it('las 3 terminadas más recientes del usuario, de la más nueva a la más vieja', async () => {
    const vieja = await terminada(A, '2026-11-10T10:00:00.000Z');
    const media = await terminada(A, '2026-11-15T10:00:00.000Z');
    const nueva = await terminada(A, '2026-11-19T10:00:00.000Z');
    const otra = await terminada(A, '2026-11-12T10:00:00.000Z');
    await terminada(B, '2026-11-20T10:00:00.000Z');
    await createActivity(A, 'HIKING', 'GPS', '2026-11-20T09:00:00.000Z'); // en grabación

    const ids = (await listRecentActivities(A, 3)).map((a) => a.localId);

    expect(ids).toEqual([nueva, media, otra]);
    expect(ids).not.toContain(vieja);
  });

  it('con menos actividades que el límite devuelve las que hay; sin ninguna, una lista vacía', async () => {
    const id = await terminada(A, '2026-11-19T10:00:00.000Z');
    expect((await listRecentActivities(A, 3)).map((a) => a.localId)).toEqual([id]);
    expect(await listRecentActivities(B, 3)).toEqual([]);
  });

  it('suma las métricas guardadas de las que empezaron desde la fecha, subidas o pendientes', async () => {
    await terminada(A, '2026-11-12T10:00:00.000Z'); // antes del periodo
    const subida = await terminada(A, '2026-11-14T10:00:00.000Z');
    await markSynced(subida, 'srv-1');
    await terminada(A, '2026-11-19T10:00:00.000Z'); // pendiente
    await terminada(B, '2026-11-19T10:00:00.000Z'); // otra cuenta
    await createActivity(A, 'HIKING', 'GPS', '2026-11-20T09:00:00.000Z'); // en grabación

    expect(await summarizeSince(A, '2026-11-13T12:00:00.000Z')).toEqual({
      count: 2,
      distanceMeters: 2 * metricas.distanceMeters,
      durationSeconds: 2 * metricas.durationSeconds,
      elevationGainMeters: 2 * metricas.elevationGainMeters,
    });
  });

  it('una actividad que empezó justo en el límite cuenta; una sin métricas cuenta sin sumar', async () => {
    await terminada(A, '2026-11-13T10:00:00.000Z');
    await terminada(A, '2026-11-15T10:00:00.000Z', false);

    expect(await summarizeSince(A, '2026-11-13T10:00:00.000Z')).toEqual({
      count: 2,
      distanceMeters: metricas.distanceMeters,
      durationSeconds: metricas.durationSeconds,
      elevationGainMeters: metricas.elevationGainMeters,
    });
  });

  it('sin actividades en el periodo, todo en cero', async () => {
    await terminada(A, '2026-11-01T10:00:00.000Z');

    expect(await summarizeSince(A, '2026-11-13T00:00:00.000Z')).toEqual({
      count: 0,
      distanceMeters: 0,
      durationSeconds: 0,
      elevationGainMeters: 0,
    });
  });
});

describe('Cumbre para el filtro de altura (spec 015, CA-5, RN-5; plan, D1)', () => {
  it('una actividad terminada empieza sin cumbre y con la cumbre por calcular', async () => {
    const id = await terminada(A, '2026-11-12T10:00:00.000Z');
    await createActivity(A, 'HIKING', 'GPS', '2026-11-13T10:00:00.000Z'); // grabando: no cuenta

    expect((await getActivity(id))?.peakAltitudeMeters).toBeNull();
    expect(await listActivityIdsMissingPeak()).toEqual([id]);
  });

  it('savePeak guarda la cumbre y la saca de las pendientes, sin tocar el estado ni las métricas', async () => {
    const id = await terminada(A, '2026-11-12T10:00:00.000Z');
    const antes = await getActivity(id);

    await savePeak(id, 1176.4);

    expect(await getActivity(id)).toEqual({ ...antes, peakAltitudeMeters: 1176.4 });
    expect(await listActivityIdsMissingPeak()).toEqual([]);
  });

  it('una actividad sin perfil queda calculada con cumbre null', async () => {
    const id = await terminada(A, '2026-11-12T10:00:00.000Z');

    await savePeak(id, null);

    expect((await getActivity(id))?.peakAltitudeMeters).toBeNull();
    expect(await listActivityIdsMissingPeak()).toEqual([]);
  });

  it('una actividad recuperada del servidor queda por calcular', async () => {
    const id = await insertDownloadedActivity(
      {
        serverId: 'srv-15',
        clientGeneratedId: randomUUID(),
        type: 'HIKING',
        startedAt: '2026-11-01T10:00:00.000Z',
        endedAt: '2026-11-01T11:00:00.000Z',
        distanceMeters: 5000,
        durationSeconds: 3600,
        elevationGainMeters: 100,
        elevationLossMeters: 100,
        elevationSource: 'GPS',
        points: [],
      },
      A
    );

    expect(await listActivityIdsMissingPeak()).toEqual([id]);
  });
});

describe('Actividades con menos de 3 puntos válidos (spec 012)', () => {
  const INICIO = '2026-11-22T10:00:00.000Z';
  const punto = (sequence: number, accuracy: number | null) => ({
    sequence,
    latitude: 31.86 + sequence / 10_000,
    longitude: -116.59,
    altitude: 20,
    accuracy,
    recordedAt: `2026-11-22T10:00:0${sequence}.000Z`,
  });
  const cuenta = (tabla: string, columna: string, id: number) =>
    (
      testDb.raw.prepare(`SELECT COUNT(*) AS n FROM ${tabla} WHERE ${columna} = ?`).get(id) as {
        n: number;
      }
    ).n;

  // Actividad con puntos de las precisiones dadas, una lectura del barómetro y su sesión de
  // seguridad (spec 008), cerrada con "Detener" salvo que se pida dejarla grabando.
  async function grabada(precisiones: (number | null)[], { cerrar = true } = {}) {
    const id = await createActivity(A, 'HIKING', 'BAROMETER', INICIO);
    for (const [i, accuracy] of precisiones.entries())
      await insertPoint(id, punto(i + 1, accuracy));
    await insertBarometerReading(id, {
      recordedAt: INICIO,
      pressureHpa: 1013,
      relativeAltitudeM: 0,
    });
    testDb.raw
      .prepare(
        'INSERT INTO safety_sessions (activity_local_id, client_generated_id, user_id) VALUES (?, ?, ?)'
      )
      .run(id, randomUUID(), A);
    testDb.raw
      .prepare('INSERT INTO safety_detector (activity_local_id, state) VALUES (?, ?)')
      .run(id, '{}');
    if (cerrar) await finishActivity(id, '2026-11-22T10:05:00.000Z');
    return id;
  }

  it('countValidPoints cuenta solo los de 20 m o mejor y los que no traen precisión (RN-1)', async () => {
    expect(await countValidPoints(await grabada([]))).toBe(0);
    expect(await countValidPoints(await grabada([4, 25, 8]))).toBe(2);
    expect(await countValidPoints(await grabada([20, null, 21, 80, 3]))).toBe(3);
  });

  it('countValidPoints solo cuenta los puntos de esa actividad', async () => {
    const una = await grabada([4, 4, 4, 4]);
    const otra = await grabada([4]);
    expect(await countValidPoints(una)).toBe(4);
    expect(await countValidPoints(otra)).toBe(1);
  });

  it('discardActivity borra la actividad, sus puntos, el barómetro y la sesión, pero no safety_outbox (CA-19, D3)', async () => {
    const id = await grabada([4, 30]);
    const otra = await grabada([4, 4, 4]);
    // El aviso de fin ya encolado: no depende de la actividad.
    testDb.raw
      .prepare(
        `INSERT INTO safety_outbox (user_id, kind, client_id, payload, created_at)
         VALUES (?, 'finish', ?, '{}', 0)`
      )
      .run(A, randomUUID());

    expect(await discardActivity(id)).toBe(true);

    expect(await getActivity(id)).toBeNull();
    expect(cuenta('activity_points', 'activity_id', id)).toBe(0);
    expect(cuenta('barometer_readings', 'activity_id', id)).toBe(0);
    expect(cuenta('safety_sessions', 'activity_local_id', id)).toBe(0);
    expect(cuenta('safety_detector', 'activity_local_id', id)).toBe(0);
    const outbox = testDb.raw.prepare('SELECT COUNT(*) AS n FROM safety_outbox').get() as {
      n: number;
    };
    expect(outbox.n).toBe(1);
    // La otra actividad no cambia.
    expect(await getActivity(otra)).not.toBeNull();
    expect(cuenta('activity_points', 'activity_id', otra)).toBe(3);
  });

  it('discardActivity deja fuera de Mis actividades, Inicio, los totales y la cola de subida (CA-19)', async () => {
    const id = await grabada([4]);
    await saveMetrics(id, metricas);
    expect(await countPendingUploads(A)).toBe(1);

    await discardActivity(id);

    expect(await listFinishedActivities(A)).toEqual([]);
    expect(await listRecentActivities(A, 3)).toEqual([]);
    expect((await summarizeSince(A, '2026-11-01T00:00:00.000Z')).count).toBe(0);
    expect(await listUploadable(A, { includeRejected: true })).toEqual([]);
    expect(await countPendingUploads(A)).toBe(0);
  });

  it('discardActivity no borra una actividad que el servidor ya guardó (plan R3)', async () => {
    const id = await grabada([4]);
    await saveMetrics(id, metricas);
    await markSynced(id, 'srv-1');

    expect(await discardActivity(id)).toBe(false);
    expect(await getActivity(id)).toMatchObject({ status: 'SYNCED', serverId: 'srv-1' });
    expect(cuenta('activity_points', 'activity_id', id)).toBe(1);
  });

  it('discardActivity no borra una actividad que se está grabando: primero se cierra', async () => {
    const id = await grabada([4], { cerrar: false });

    expect(await discardActivity(id)).toBe(false);
    expect(await getRecordingActivity()).toMatchObject({ localId: id });
  });

  it('closeOrphanActivities devuelve solo las que cerró, para descartar las cortas (CA-22)', async () => {
    const cerrada = await grabada([4]);
    const corta = await grabada([4], { cerrar: false });
    const larga = await grabada([4, 4, 4], { cerrar: false });

    const ids = await closeOrphanActivities();

    expect(ids.sort()).toEqual([corta, larga].sort());
    expect(ids).not.toContain(cerrada);
    expect(await closeOrphanActivities()).toEqual([]);
  });
});
