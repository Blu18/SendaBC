import * as Crypto from 'expo-crypto';
import { MAX_ACCURACY_M } from '../metrics/constants';
import type { ActivityMetrics, BarometerReading, ElevationSource } from '../metrics/summary';
import { transaccionExclusiva } from './espera';
import { getDb } from './sqlite';

// Mismos valores que los enums ActivityType / ActivityStatus de Prisma (spec 005 los sube tal cual).
export type ActivityType = 'HIKING' | 'TRAIL_RUNNING' | 'CYCLING';
export type ActivityStatus = 'RECORDING' | 'PENDING_SYNC' | 'SYNCED';

export type ActivityPointInput = {
  sequence: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  recordedAt: string; // ISO 8601, hora del GPS
};

export type BarometerReadingInput = BarometerReading & {
  recordedAt: string; // ISO 8601, hora del teléfono al recibir la lectura
};

// Actividad guardada en el teléfono. Las métricas son null mientras no se calculen
// (actividad en curso, o terminada antes de la v3 o al cerrarse la app) (spec 004).
export type Activity = {
  localId: number;
  clientGeneratedId: string;
  userId: string | null;
  type: ActivityType;
  status: ActivityStatus;
  startedAt: string;
  endedAt: string | null;
  elevationSource: ElevationSource | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  elevationGainMeters: number | null;
  elevationLossMeters: number | null;
  serverId: string | null; // id en el servidor, al subirla o recuperarla (spec 005)
  syncError: string | null; // motivo si el servidor la rechazó: "No se pudo subir" (spec 005, CA-11)
  // Cumbre del perfil (spec 014), para el filtro de altura (spec 015, CA-5, RN-5). null si no tiene
  // perfil o si todavía no se calcula.
  peakAltitudeMeters: number | null;
};

const ACTIVITY_COLUMNS = `
  local_id AS localId,
  client_generated_id AS clientGeneratedId,
  user_id AS userId,
  type,
  status,
  startedAt,
  endedAt,
  elevation_source AS elevationSource,
  distance_meters AS distanceMeters,
  duration_seconds AS durationSeconds,
  elevation_gain_meters AS elevationGainMeters,
  elevation_loss_meters AS elevationLossMeters,
  server_id AS serverId,
  sync_error AS syncError,
  peak_altitude_meters AS peakAltitudeMeters`;

// Crea la actividad en RECORDING y devuelve su local_id (CA-4).
// La fuente de la elevación se decide al iniciar (spec 004, RN-3).
export async function createActivity(
  userId: string,
  type: ActivityType,
  elevationSource: ElevationSource,
  startedAt: string = new Date().toISOString()
) {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO activities (client_generated_id, user_id, type, status, startedAt, elevation_source)
     VALUES (?, ?, ?, 'RECORDING', ?, ?)`,
    [Crypto.randomUUID(), userId, type, startedAt, elevationSource]
  );
  return result.lastInsertRowId;
}

// Guarda un punto GPS (CA-6). La secuencia la lleva quien llama, empezando en 1.
export async function insertPoint(activityId: number, point: ActivityPointInput) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO activity_points
     (activity_id, sequence, latitude, longitude, altitude, accuracy, recordedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      activityId,
      point.sequence,
      point.latitude,
      point.longitude,
      point.altitude,
      point.accuracy,
      point.recordedAt,
    ]
  );
}

// Guarda una lectura del barómetro durante la grabación (spec 004, CA-14).
export async function insertBarometerReading(activityId: number, reading: BarometerReadingInput) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO barometer_readings (activity_id, recorded_at, pressure_hpa, relative_altitude_m)
     VALUES (?, ?, ?, ?)`,
    [activityId, reading.recordedAt, reading.pressureHpa, reading.relativeAltitudeM]
  );
}

// Cierra la actividad: endedAt y PENDING_SYNC (CA-8). Solo avanza desde RECORDING (constitución 2.3).
export async function finishActivity(localId: number, endedAt: string = new Date().toISOString()) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE activities SET endedAt = ?, status = 'PENDING_SYNC'
     WHERE local_id = ? AND status = 'RECORDING'`,
    [endedAt, localId]
  );
}

// Número de puntos guardados en SQLite (CA-8: "Actividad guardada: N puntos").
export async function countPoints(localId: number) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM activity_points WHERE activity_id = ?',
    [localId]
  );
  return row?.n ?? 0;
}

// Cierra las actividades que quedaron en RECORDING (app cerrada o pantalla abandonada).
// endedAt = hora del último punto, o startedAt si no tiene puntos o si el último punto es
// anterior al inicio (CA-10, F1 de la spec 011). Las horas son ISO 8601 en UTC con el mismo
// formato, así que MAX compara bien como texto. Devuelve los local_id que cerró, para descartar
// después las que tengan menos de 3 puntos válidos (spec 012, CA-22, plan D3).
export async function closeOrphanActivities() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ localId: number }>(
    `UPDATE activities
     SET status = 'PENDING_SYNC',
         endedAt = MAX(
           COALESCE(
             (SELECT p.recordedAt FROM activity_points p
              WHERE p.activity_id = activities.local_id
              ORDER BY p.sequence DESC LIMIT 1),
             startedAt
           ),
           startedAt
         )
     WHERE status = 'RECORDING'
     RETURNING local_id AS localId`
  );
  return rows.map((r) => r.localId);
}

// Puntos que cuentan para la distancia por su precisión: la regla isAccurate de
// lib/metrics/validPoints.ts, contada en SQL (spec 012, RN-1, plan D1, D2).
export async function countValidPoints(localId: number) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM activity_points
     WHERE activity_id = ? AND (accuracy IS NULL OR accuracy <= ?)`,
    [localId, MAX_ACCURACY_M]
  );
  return row?.n ?? 0;
}

// Borra una actividad cerrada con menos de 3 puntos válidos y, en cascada, sus puntos, sus
// lecturas del barómetro y su sesión de seguridad (spec 012, RN-4). El aviso de fin de la sesión
// tiene que estar ya en safety_outbox, que no depende de la actividad (plan D3).
// No borra una que el servidor ya guardó (server_id, plan R3) ni una que se está grabando:
// esas primero se cierran. Devuelve si la borró.
export async function discardActivity(localId: number) {
  const db = await getDb();
  const result = await db.runAsync(
    `DELETE FROM activities
     WHERE local_id = ? AND server_id IS NULL AND status != 'RECORDING'`,
    [localId]
  );
  return result.changes > 0;
}

// Corrige las actividades pendientes que ya quedaron con el fin antes del inicio, como cerraba
// closeOrphanActivities antes de la spec 011 (F1): el servidor las rechaza y nunca suben. El fin
// pasa a ser el inicio, sus métricas se borran para que computeMissingMetrics las recalcule y se
// quita el error, para que vuelvan a intentar subirse (spec 003, CA-10). Devuelve cuántas corrigió.
export async function repararFinAntesDelInicio() {
  const db = await getDb();
  const result = await db.runAsync(
    `UPDATE activities
     SET endedAt = startedAt, distance_meters = NULL, duration_seconds = NULL,
         elevation_gain_meters = NULL, elevation_loss_meters = NULL, sync_error = NULL
     WHERE status = 'PENDING_SYNC' AND endedAt < startedAt`
  );
  return result.changes;
}

export async function getActivity(localId: number) {
  const db = await getDb();
  return db.getFirstAsync<Activity>(
    `SELECT ${ACTIVITY_COLUMNS} FROM activities WHERE local_id = ?`,
    [localId]
  );
}

// Puntos GPS en el orden en que se registraron.
export async function getActivityPoints(localId: number) {
  const db = await getDb();
  return db.getAllAsync<ActivityPointInput>(
    `SELECT sequence, latitude, longitude, altitude, accuracy, recordedAt
     FROM activity_points WHERE activity_id = ? ORDER BY sequence`,
    [localId]
  );
}

// La actividad que se está grabando, si hay una (spec 008). La tarea de ubicación en segundo
// plano la busca aquí y no en memoria, porque puede correr sin la pantalla montada.
export async function getRecordingActivity() {
  const db = await getDb();
  return db.getFirstAsync<{ localId: number; userId: string | null; startedAt: string }>(
    `SELECT local_id AS localId, user_id AS userId, startedAt
     FROM activities WHERE status = 'RECORDING' ORDER BY local_id DESC LIMIT 1`
  );
}

// Último punto guardado de una actividad, o null si todavía no tiene (spec 008).
export async function getLastPoint(localId: number) {
  const db = await getDb();
  return db.getFirstAsync<ActivityPointInput>(
    `SELECT sequence, latitude, longitude, altitude, accuracy, recordedAt
     FROM activity_points WHERE activity_id = ? ORDER BY sequence DESC LIMIT 1`,
    [localId]
  );
}

// Lecturas del barómetro en el orden en que se registraron (spec 004, CA-14).
export async function getBarometerReadings(localId: number) {
  const db = await getDb();
  return db.getAllAsync<BarometerReadingInput>(
    `SELECT recorded_at AS recordedAt, pressure_hpa AS pressureHpa,
            relative_altitude_m AS relativeAltitudeM
     FROM barometer_readings WHERE activity_id = ? ORDER BY recorded_at, local_id`,
    [localId]
  );
}

// Guarda las métricas calculadas junto a la actividad, para que la sincronización (005)
// las suba sin recalcular. No cambia el estado (spec 004, CA-18).
export async function saveMetrics(localId: number, metrics: ActivityMetrics) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE activities
     SET distance_meters = ?, duration_seconds = ?, elevation_gain_meters = ?,
         elevation_loss_meters = ?, elevation_source = ?
     WHERE local_id = ?`,
    [
      metrics.distanceMeters,
      metrics.durationSeconds,
      metrics.elevationGainMeters,
      metrics.elevationLossMeters,
      metrics.elevationSource,
      localId,
    ]
  );
}

// Actividades terminadas del usuario de la sesión, la más reciente primero.
// Las que no tienen dueño (anteriores a v2) no aparecen (spec 004, CA-20, CA-24, RN-6).
export async function listFinishedActivities(userId: string) {
  const db = await getDb();
  return db.getAllAsync<Activity>(
    `SELECT ${ACTIVITY_COLUMNS} FROM activities
     WHERE status != 'RECORDING' AND user_id = ?
     ORDER BY startedAt DESC`,
    [userId]
  );
}

// --- Inicio (spec 013) ---

// Las `limit` actividades terminadas más recientes del usuario de la sesión, subidas o no (CA-3,
// RN-2). Una actividad en grabación no aparece.
export async function listRecentActivities(userId: string, limit: number) {
  const db = await getDb();
  return db.getAllAsync<Activity>(
    `SELECT ${ACTIVITY_COLUMNS} FROM activities
     WHERE status != 'RECORDING' AND user_id = ?
     ORDER BY startedAt DESC
     LIMIT ?`,
    [userId, limit]
  );
}

export type ActivityTotals = {
  count: number;
  distanceMeters: number;
  durationSeconds: number;
  elevationGainMeters: number;
};

// Totales de las actividades terminadas del usuario que empezaron en `desdeIso` o después (CA-6,
// RN-2 a RN-4). Suma las métricas ya guardadas (spec 004) sin recalcularlas; una actividad sin
// métricas cuenta en el número y no suma nada. startedAt se guarda en ISO 8601 UTC, así que la
// comparación de texto respeta el orden de las fechas.
export async function summarizeSince(userId: string, desdeIso: string): Promise<ActivityTotals> {
  const db = await getDb();
  const row = await db.getFirstAsync<ActivityTotals>(
    `SELECT COUNT(*) AS count,
            COALESCE(SUM(distance_meters), 0) AS distanceMeters,
            COALESCE(SUM(duration_seconds), 0) AS durationSeconds,
            COALESCE(SUM(elevation_gain_meters), 0) AS elevationGainMeters
     FROM activities
     WHERE status != 'RECORDING' AND user_id = ? AND startedAt >= ?`,
    [userId, desdeIso]
  );
  return row ?? { count: 0, distanceMeters: 0, durationSeconds: 0, elevationGainMeters: 0 };
}

// --- Sincronización (spec 005) ---

// Actividad recuperada del servidor, lista para guardarse en el teléfono (CA-20, CA-21).
export type DownloadedActivity = {
  serverId: string;
  clientGeneratedId: string;
  type: ActivityType;
  startedAt: string;
  endedAt: string;
  distanceMeters: number;
  durationSeconds: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  elevationSource: ElevationSource;
  points: ActivityPointInput[];
};

// Actividades que se pueden subir: terminadas, con métricas calculadas y del usuario de la
// sesión, la más antigua primero (CA-3, CA-17, CA-19). Las que el servidor rechazó solo entran
// en una sincronización manual (CA-16).
export async function listUploadable(userId: string, { includeRejected = false } = {}) {
  const db = await getDb();
  return db.getAllAsync<Activity>(
    `SELECT ${ACTIVITY_COLUMNS} FROM activities
     WHERE status = 'PENDING_SYNC' AND user_id = ? AND distance_meters IS NOT NULL
       AND (sync_error IS NULL OR ?)
     ORDER BY startedAt ASC`,
    [userId, includeRejected ? 1 : 0]
  );
}

// El servidor confirmó que la guardó (CA-13). Solo avanza desde PENDING_SYNC (constitución 2.3).
export async function markSynced(localId: number, serverId: string) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE activities SET status = 'SYNCED', server_id = ?, sync_error = NULL
     WHERE local_id = ? AND status = 'PENDING_SYNC'`,
    [serverId, localId]
  );
}

// El servidor la rechazó por datos inválidos: queda pendiente con el motivo (CA-11, D6).
export async function markSyncError(localId: number, message: string) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE activities SET sync_error = ? WHERE local_id = ? AND status = 'PENDING_SYNC'`,
    [message, localId]
  );
}

// Actividades del usuario que todavía no están en el servidor, rechazadas incluidas (CA-24).
export async function countPendingUploads(userId: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM activities WHERE status = 'PENDING_SYNC' AND user_id = ?`,
    [userId]
  );
  return row?.n ?? 0;
}

// Todos los client_generated_id del teléfono, de cualquier usuario: la columna es única, así
// que una actividad que ya existe no se vuelve a guardar al recuperar (CA-22).
export async function listClientIds() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string }>(
    'SELECT client_generated_id AS id FROM activities'
  );
  return new Set(rows.map((r) => r.id));
}

// Puntos por INSERT al guardar una actividad recuperada. Con 7 columnas son 3 500
// parámetros, lejos del tope de SQLite (32 766).
export const PUNTOS_POR_LOTE = 500;

// Guarda una actividad recuperada como SYNCED, con sus métricas y puntos, en una sola
// transacción. No trae lecturas del barómetro (RN-6). Devuelve su local_id.
export async function insertDownloadedActivity(activity: DownloadedActivity, userId: string) {
  const db = await getDb();
  let localId = 0;
  await transaccionExclusiva(db, async (tx) => {
    const result = await tx.runAsync(
      `INSERT INTO activities
         (client_generated_id, user_id, type, status, startedAt, endedAt, elevation_source,
          distance_meters, duration_seconds, elevation_gain_meters, elevation_loss_meters, server_id)
       VALUES (?, ?, ?, 'SYNCED', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activity.clientGeneratedId,
        userId,
        activity.type,
        activity.startedAt,
        activity.endedAt,
        activity.elevationSource,
        activity.distanceMeters,
        activity.durationSeconds,
        activity.elevationGainMeters,
        activity.elevationLossMeters,
        activity.serverId,
      ]
    );
    localId = result.lastInsertRowId;

    // Los miles de puntos de una actividad larga van en lotes: con un INSERT por punto la
    // transacción duraba más que la espera de las otras escrituras (spec 011, CA-13; plan, R2).
    for (let i = 0; i < activity.points.length; i += PUNTOS_POR_LOTE) {
      const lote = activity.points.slice(i, i + PUNTOS_POR_LOTE);
      await tx.runAsync(
        `INSERT INTO activity_points
         (activity_id, sequence, latitude, longitude, altitude, accuracy, recordedAt)
         VALUES ${lote.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
        lote.flatMap((p) => [
          localId,
          p.sequence,
          p.latitude,
          p.longitude,
          p.altitude,
          p.accuracy,
          p.recordedAt,
        ])
      );
    }
  });
  return localId;
}

// Actividades terminadas con métricas pendientes: cerradas al abrir la app o
// grabadas antes de la v3 (spec 004, CA-19).
// Actividades terminadas que ya tienen distancia, para recalcular las que tienen puntos viejos
// (spec 011, RN-11). Incluye las de cualquier cuenta y las sincronizadas.
export async function listActivityIdsWithDistance() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ localId: number }>(
    `SELECT local_id AS localId FROM activities
     WHERE status != 'RECORDING' AND distance_meters IS NOT NULL`
  );
  return rows.map((r) => r.localId);
}

// Guarda solo la distancia: ni el estado ni las demás métricas cambian (spec 011, RN-11).
export async function saveDistance(localId: number, distanceMeters: number) {
  const db = await getDb();
  await db.runAsync(`UPDATE activities SET distance_meters = ? WHERE local_id = ?`, [
    distanceMeters,
    localId,
  ]);
}

export async function listActivityIdsMissingMetrics() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ localId: number }>(
    `SELECT local_id AS localId FROM activities
     WHERE status != 'RECORDING' AND distance_meters IS NULL`
  );
  return rows.map((r) => r.localId);
}

// Guarda la cumbre del perfil y la marca como calculada, aunque sea null (sin perfil) (spec 015,
// CA-5, RN-5; plan, D1). Solo cambia estas dos columnas: el estado y las métricas no se tocan.
export async function savePeak(localId: number, peakAltitudeMeters: number | null) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE activities SET peak_altitude_meters = ?, peak_calculated = 1 WHERE local_id = ?`,
    [peakAltitudeMeters, localId]
  );
}

// Actividades terminadas cuya cumbre falta calcular: las de antes de la v7 y las recuperadas del
// servidor (spec 015, plan D1). Incluye las de cualquier cuenta, como las métricas pendientes.
export async function listActivityIdsMissingPeak() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ localId: number }>(
    `SELECT local_id AS localId FROM activities
     WHERE status != 'RECORDING' AND peak_calculated = 0`
  );
  return rows.map((r) => r.localId);
}
