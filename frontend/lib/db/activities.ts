import * as Crypto from 'expo-crypto';
import type { ActivityMetrics, BarometerReading, ElevationSource } from '../metrics/summary';
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
  elevation_loss_meters AS elevationLossMeters`;

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
// endedAt = hora del último punto, o startedAt si no tiene puntos (CA-10). Devuelve cuántas cerró.
export async function closeOrphanActivities() {
  const db = await getDb();
  const result = await db.runAsync(
    `UPDATE activities
     SET status = 'PENDING_SYNC',
         endedAt = COALESCE(
           (SELECT p.recordedAt FROM activity_points p
            WHERE p.activity_id = activities.local_id
            ORDER BY p.sequence DESC LIMIT 1),
           startedAt
         )
     WHERE status = 'RECORDING'`
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

// Actividades terminadas con métricas pendientes: cerradas al abrir la app o
// grabadas antes de la v3 (spec 004, CA-19).
export async function listActivityIdsMissingMetrics() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ localId: number }>(
    `SELECT local_id AS localId FROM activities
     WHERE status != 'RECORDING' AND distance_meters IS NULL`
  );
  return rows.map((r) => r.localId);
}
