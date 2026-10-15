import { apiFetch } from '../api/client';
import type { ActivityPointInput, ActivityType, DownloadedActivity } from '../db/activities';
import type { UploadPayload } from './payload';
import type { Failure, SyncResult } from './results';

// Límites de tiempo de las peticiones de sincronización (spec 005, D10). Sin límite, un backend
// inalcanzable tarda más de un minuto en fallar y retrasa el reintento.
export const UPLOAD_TIMEOUT_MS = 30_000;
export const LIST_TIMEOUT_MS = 10_000;
export const DETAIL_TIMEOUT_MS = 30_000;

// Contrato de GET /activities y GET /activities/:id (spec 005, plan).
export type RemoteActivitySummary = {
  id: string;
  clientGeneratedId: string | null;
  type: ActivityType;
  startedAt: string;
  endedAt: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  elevationGainMeters: number | null;
  elevationLossMeters: number | null;
  elevationSource: 'BAROMETER' | 'GPS' | null;
  pointCount: number;
};

export type RemoteActivityDetail = RemoteActivitySummary & { points: ActivityPointInput[] };

// El motor nunca recibe excepciones: un fallo se describe para classifyFailure().
export type ApiResult<T> = { ok: true; data: T } | { ok: false; failure: Failure };

export function uploadBatch(token: string, batch: UploadPayload[]) {
  return pedir(
    '/activities/sync',
    token,
    { method: 'POST', body: JSON.stringify({ activities: batch }) },
    UPLOAD_TIMEOUT_MS,
    (body) => {
      const results = (body as { results?: unknown })?.results;
      if (!Array.isArray(results)) throw new Error('Respuesta de sincronización inválida');
      return results as SyncResult[];
    }
  );
}

export function listRemoteActivities(token: string) {
  return pedir('/activities', token, {}, LIST_TIMEOUT_MS, (body) => {
    if (!Array.isArray(body)) throw new Error('Lista de actividades inválida');
    return body as RemoteActivitySummary[];
  });
}

export function getRemoteActivity(token: string, id: string) {
  return pedir(
    `/activities/${encodeURIComponent(id)}`,
    token,
    {},
    DETAIL_TIMEOUT_MS,
    (body) => {
      if (!Array.isArray((body as { points?: unknown })?.points)) {
        throw new Error('Detalle de actividad inválido');
      }
      return body as RemoteActivityDetail;
    }
  );
}

// Convierte una actividad del servidor en lo que guarda insertDownloadedActivity (CA-20, CA-21).
// Devuelve null si le falta algo para mostrarse completa; esa actividad no se recupera.
export function toDownloadedActivity(detail: RemoteActivityDetail): DownloadedActivity | null {
  const {
    clientGeneratedId,
    endedAt,
    distanceMeters,
    durationSeconds,
    elevationGainMeters,
    elevationLossMeters,
  } = detail;
  if (
    clientGeneratedId === null ||
    endedAt === null ||
    distanceMeters === null ||
    durationSeconds === null ||
    elevationGainMeters === null ||
    elevationLossMeters === null
  ) {
    return null;
  }

  return {
    serverId: detail.id,
    clientGeneratedId,
    type: detail.type,
    startedAt: detail.startedAt,
    endedAt,
    distanceMeters,
    durationSeconds,
    elevationGainMeters,
    elevationLossMeters,
    elevationSource: detail.elevationSource ?? 'GPS',
    points: detail.points.map((p) => ({
      sequence: p.sequence,
      latitude: p.latitude,
      longitude: p.longitude,
      altitude: p.altitude,
      accuracy: p.accuracy,
      recordedAt: p.recordedAt,
    })),
  };
}

// Hace la petición y convierte cualquier problema en un Failure: sin red o tiempo agotado
// ({ error }), respuesta HTTP no exitosa ({ status }) o cuerpo inesperado ({ error }).
async function pedir<T>(
  path: string,
  token: string,
  init: RequestInit,
  timeoutMs: number,
  parse: (body: unknown) => T
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await apiFetch(path, token, init, timeoutMs);
  } catch (error) {
    return { ok: false, failure: { error } };
  }
  if (!response.ok) return { ok: false, failure: { status: response.status } };

  try {
    return { ok: true, data: parse(await response.json()) };
  } catch (error) {
    return { ok: false, failure: { error } };
  }
}
