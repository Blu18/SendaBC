import type { Activity, ActivityPointInput } from '../db/activities';

// Lo que recibe POST /activities/sync por cada actividad (spec 005, plan: ActivityUpload).
// No lleva userId (el servidor lo toma del token, CA-18), ni localId, ni lecturas del
// barómetro (CA-8).
export type UploadPayload = {
  clientGeneratedId: string;
  type: Activity['type'];
  startedAt: string;
  endedAt: string;
  distanceMeters: number;
  durationSeconds: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  elevationSource: 'BAROMETER' | 'GPS';
  points: ActivityPointInput[];
};

// Límites de un lote. El servidor acepta hasta 5 actividades y 5 MB; 4 MB deja margen para
// el envoltorio {"activities": [...]} (plan: splitIntoBatches).
export const MAX_ACTIVITIES_PER_BATCH = 5;
export const MAX_BATCH_BYTES = 4 * 1024 * 1024;

// Arma el cuerpo de una actividad terminada. listUploadable() solo devuelve actividades con
// métricas; si falta alguna es un error de programación, no un dato a corregir.
export function toUploadPayload(
  activity: Activity,
  points: ActivityPointInput[]
): UploadPayload {
  const {
    endedAt,
    distanceMeters,
    durationSeconds,
    elevationGainMeters,
    elevationLossMeters,
  } = activity;
  if (
    endedAt === null ||
    distanceMeters === null ||
    durationSeconds === null ||
    elevationGainMeters === null ||
    elevationLossMeters === null
  ) {
    throw new Error(`La actividad ${activity.localId} no tiene métricas calculadas`);
  }

  return {
    clientGeneratedId: activity.clientGeneratedId,
    type: activity.type,
    startedAt: activity.startedAt,
    endedAt,
    distanceMeters,
    durationSeconds,
    elevationGainMeters,
    elevationLossMeters,
    // Las actividades anteriores a la v3 se calcularon con GPS (spec 004, finalizeMetrics).
    elevationSource: activity.elevationSource ?? 'GPS',
    // Solo los campos del punto: nada de columnas locales.
    points: points.map((p) => ({
      sequence: p.sequence,
      latitude: p.latitude,
      longitude: p.longitude,
      altitude: p.altitude,
      accuracy: p.accuracy,
      recordedAt: p.recordedAt,
    })),
  };
}

// Tamaño aproximado en bytes del JSON de una actividad. El contenido es ASCII (UUID, enums,
// números, fechas ISO), así que un carácter es un byte.
export function payloadBytes(payload: UploadPayload) {
  return JSON.stringify(payload).length;
}

// Agrupa las actividades en lotes, en el mismo orden, sin pasar de 5 actividades ni de
// ~4 MB por lote. Una actividad más grande que el límite va sola: el servidor decidirá
// (413) y se reintenta más tarde (CA-2, CA-7).
export function splitIntoBatches(
  payloads: UploadPayload[],
  { maxCount = MAX_ACTIVITIES_PER_BATCH, maxBytes = MAX_BATCH_BYTES } = {}
): UploadPayload[][] {
  const batches: UploadPayload[][] = [];
  let actual: UploadPayload[] = [];
  let bytes = 0;

  for (const payload of payloads) {
    const size = payloadBytes(payload);
    const lleno = actual.length >= maxCount || (actual.length > 0 && bytes + size > maxBytes);
    if (lleno) {
      batches.push(actual);
      actual = [];
      bytes = 0;
    }
    actual.push(payload);
    bytes += size;
  }
  if (actual.length > 0) batches.push(actual);
  return batches;
}
