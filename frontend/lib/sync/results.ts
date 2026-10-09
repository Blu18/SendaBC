import type { UploadPayload } from './payload';

// Resultado por actividad de POST /activities/sync (mismo contrato que el backend, spec 005 D1).
export type SyncResult =
  | { clientGeneratedId: string; status: 'CREATED' | 'ALREADY_EXISTS'; id: string }
  | { clientGeneratedId: string | null; status: 'REJECTED'; errors: string[] };

// Qué hacer con una actividad según su resultado.
export type ResultAction =
  | { kind: 'synced'; serverId: string } // markSynced (CA-10, CA-13)
  | { kind: 'rejected'; message: string }; // markSyncError: "No se pudo subir" (CA-11)

export const RECHAZO_GENERICO = 'El servidor rechazó la actividad';

export function classifyResult(result: SyncResult): ResultAction {
  if (result.status === 'REJECTED') {
    const message = result.errors.filter(Boolean).join('\n') || RECHAZO_GENERICO;
    return { kind: 'rejected', message };
  }
  // ALREADY_EXISTS también es éxito: el servidor ya la tenía (reenvío).
  return { kind: 'synced', serverId: result.id };
}

// Empareja los resultados con las actividades enviadas por clientGeneratedId. Una actividad
// sin resultado reconocible se queda pendiente: solo se marca lo que el servidor confirmó
// (CA-13).
export function classifyBatchResponse(
  batch: UploadPayload[],
  results: SyncResult[]
): Map<string, ResultAction> {
  const enviadas = new Set(batch.map((p) => p.clientGeneratedId));
  const acciones = new Map<string, ResultAction>();
  for (const result of results) {
    const id = result.clientGeneratedId;
    if (id !== null && enviadas.has(id)) acciones.set(id, classifyResult(result));
  }
  return acciones;
}

// Qué hacer cuando falla la petición completa.
// - auth: 401, la sesión expiró. Se detiene sin marcar nada; apiFetch ya avisa para cerrar la
//   sesión (spec 002, T7) y se sincroniza al volver a iniciarla (CA-12).
// - retry: todo lo demás (sin red, tiempo agotado, 5xx, 413...). La actividad sigue pendiente y
//   se reintenta con espera creciente (CA-9). Un 4xx inesperado también se reintenta: así nunca
//   se pierde una actividad, y la espera de hasta 15 min evita saturar al servidor.
export type FailureKind = 'retry' | 'auth';

export type Failure = { status: number } | { error: unknown };

export function classifyFailure(failure: Failure): FailureKind {
  if ('status' in failure && failure.status === 401) return 'auth';
  return 'retry';
}
