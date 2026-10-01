import * as Crypto from 'expo-crypto';
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

// Crea la actividad en RECORDING y devuelve su local_id (CA-4).
export async function createActivity(
  userId: string,
  type: ActivityType,
  startedAt: string = new Date().toISOString()
) {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO activities (client_generated_id, user_id, type, status, startedAt)
     VALUES (?, ?, ?, 'RECORDING', ?)`,
    [Crypto.randomUUID(), userId, type, startedAt]
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
