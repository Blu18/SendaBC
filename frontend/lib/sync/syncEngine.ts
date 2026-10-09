import type {
  Activity,
  ActivityPointInput,
  DownloadedActivity,
} from '../db/activities';
import { toDownloadedActivity, type ApiResult, type RemoteActivityDetail, type RemoteActivitySummary } from './api';
import { retryDelayMs } from './backoff';
import { splitIntoBatches, toUploadPayload, type UploadPayload } from './payload';
import { classifyBatchResponse, classifyFailure, type Failure, type SyncResult } from './results';

// Lo que el motor necesita del resto de la app. Se inyecta para poder probarlo sin el teléfono:
// la instancia real se arma en lib/sync/index.ts.
export type SyncDeps = {
  isOnline(): Promise<boolean>;
  listUploadable(userId: string, opts: { includeRejected: boolean }): Promise<Activity[]>;
  getActivityPoints(localId: number): Promise<ActivityPointInput[]>;
  markSynced(localId: number, serverId: string): Promise<void>;
  markSyncError(localId: number, message: string): Promise<void>;
  listClientIds(): Promise<Set<string>>;
  insertDownloadedActivity(activity: DownloadedActivity, userId: string): Promise<number>;
  uploadBatch(token: string, batch: UploadPayload[]): Promise<ApiResult<SyncResult[]>>;
  listRemoteActivities(token: string): Promise<ApiResult<RemoteActivitySummary[]>>;
  getRemoteActivity(token: string, id: string): Promise<ApiResult<RemoteActivityDetail>>;
  log?(mensaje: string, error?: unknown): void;
};

export type SyncSession = { token: string; userId: string };

// Cómo terminó una sincronización.
// - done: todo subido y descargado.
// - offline: sin conexión; no se hizo ninguna petición. Se reintenta al volver la red (T15).
// - retry: falló la red o el servidor; hay un reintento programado (CA-9).
// - auth: el token ya no sirve (401); se espera a que cambie la sesión (CA-12).
// - no-session: no hay usuario con sesión.
export type SyncOutcome = 'done' | 'offline' | 'retry' | 'auth' | 'no-session';

export type SyncState = {
  isSyncing: boolean;
  lastOutcome: SyncOutcome | null;
  nextRetryAt: number | null; // epoch ms del próximo reintento, si hay uno programado
};

// state: cambió el estado del motor. data-changed: se marcó o guardó alguna actividad, las
// pantallas deben recargar (CA-15).
export type SyncEvent = { type: 'state'; state: SyncState } | { type: 'data-changed' };

export function createSyncEngine(deps: SyncDeps) {
  const log = deps.log ?? (() => {});
  const listeners = new Set<(event: SyncEvent) => void>();

  let session: SyncSession | null = null;
  let state: SyncState = { isSyncing: false, lastOutcome: null, nextRetryAt: null };
  let attempts = 0; // fallos seguidos, para la espera creciente
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<SyncOutcome> | null = null;
  // Peticiones que llegaron mientras otra sincronización corría: se atienden al terminar.
  let pendiente = { hay: false, manual: false };

  function emit(event: SyncEvent) {
    for (const listener of listeners) listener(event);
  }

  function setState(cambios: Partial<SyncState>) {
    state = { ...state, ...cambios };
    emit({ type: 'state', state });
  }

  function cancelRetry() {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
    if (state.nextRetryAt !== null) setState({ nextRetryAt: null });
  }

  function scheduleRetry() {
    const delay = retryDelayMs(attempts);
    attempts += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void requestSync();
    }, delay);
    setState({ nextRetryAt: Date.now() + delay });
  }

  // Un fallo de toda la petición: 401 detiene; lo demás programa un reintento.
  function fallo(failure: Failure): SyncOutcome {
    if (classifyFailure(failure) === 'auth') return 'auth';
    scheduleRetry();
    return 'retry';
  }

  async function subir(s: SyncSession, manual: boolean): Promise<SyncOutcome | null> {
    const actividades = await deps.listUploadable(s.userId, { includeRejected: manual });
    const localIds = new Map<string, number>();
    const payloads: UploadPayload[] = [];
    for (const actividad of actividades) {
      try {
        payloads.push(toUploadPayload(actividad, await deps.getActivityPoints(actividad.localId)));
        localIds.set(actividad.clientGeneratedId, actividad.localId);
      } catch (error) {
        // No debería pasar (listUploadable exige métricas): no se frena a las demás.
        log(`No se pudo preparar la actividad ${actividad.localId}`, error);
      }
    }

    for (const batch of splitIntoBatches(payloads)) {
      const respuesta = await deps.uploadBatch(s.token, batch);
      if (!respuesta.ok) return fallo(respuesta.failure);

      const acciones = classifyBatchResponse(batch, respuesta.data);
      for (const [clientGeneratedId, accion] of acciones) {
        const localId = localIds.get(clientGeneratedId)!;
        if (accion.kind === 'synced') await deps.markSynced(localId, accion.serverId);
        else await deps.markSyncError(localId, accion.message);
      }
      if (acciones.size > 0) emit({ type: 'data-changed' });
    }
    return null;
  }

  // Recupera las actividades del servidor que no están en el teléfono (CA-20, CA-22).
  async function descargar(s: SyncSession): Promise<SyncOutcome | null> {
    const lista = await deps.listRemoteActivities(s.token);
    if (!lista.ok) return fallo(lista.failure);

    const locales = await deps.listClientIds();
    const faltan = lista.data.filter(
      (a) => a.clientGeneratedId !== null && !locales.has(a.clientGeneratedId)
    );
    for (const remota of faltan) {
      const detalle = await deps.getRemoteActivity(s.token, remota.id);
      if (!detalle.ok) return fallo(detalle.failure);

      const actividad = toDownloadedActivity(detalle.data);
      if (!actividad) continue;
      try {
        await deps.insertDownloadedActivity(actividad, s.userId);
        emit({ type: 'data-changed' });
      } catch (error) {
        // Ya existía (p. ej. se guardó mientras tanto): no se duplica (CA-22).
        log(`No se pudo guardar la actividad recuperada ${remota.id}`, error);
      }
    }
    return null;
  }

  async function ciclo(manual: boolean): Promise<SyncOutcome> {
    const s = session;
    if (!s) return 'no-session';
    // Sin conexión no se hace ninguna petición (batería); la vuelta de la red dispara otra.
    if (!(await deps.isOnline())) return 'offline';

    cancelRetry();
    try {
      const subida = await subir(s, manual);
      if (subida) return subida;
      // La sesión cambió a media sincronización: no se descarga para otra cuenta.
      if (session !== s) return 'no-session';
      const descarga = await descargar(s);
      if (descarga) return descarga;
    } catch (error) {
      // Error inesperado (p. ej. de SQLite): nada se perdió; se reintenta más tarde.
      log('Error inesperado al sincronizar', error);
      scheduleRetry();
      return 'retry';
    }
    attempts = 0;
    return 'done';
  }

  // Pide una sincronización. Si ya hay una corriendo, se repite al terminar (en lugar de correr
  // dos a la vez) y la promesa resuelve con el resultado final. manual: también reintenta las
  // rechazadas (CA-16).
  function requestSync({ manual = false } = {}): Promise<SyncOutcome> {
    if (!session) return Promise.resolve('no-session');
    pendiente = { hay: true, manual: pendiente.manual || manual };
    if (running) return running;

    running = (async () => {
      setState({ isSyncing: true });
      let outcome: SyncOutcome = 'done';
      try {
        while (pendiente.hay) {
          const esManual = pendiente.manual;
          pendiente = { hay: false, manual: false };
          outcome = await ciclo(esManual);
          // Sin red o sin sesión válida, repetir de inmediato no serviría de nada.
          if (outcome === 'offline' || outcome === 'auth' || outcome === 'no-session') {
            pendiente = { hay: false, manual: false };
          }
        }
      } finally {
        running = null;
        setState({ isSyncing: false, lastOutcome: outcome });
      }
      return outcome;
    })();
    return running;
  }

  // Cambia la sesión (inicio o cierre). Cancela el reintento de la sesión anterior.
  function configure(nueva: SyncSession | null) {
    const igual =
      nueva !== null &&
      session !== null &&
      nueva.token === session.token &&
      nueva.userId === session.userId;
    if (igual) return;
    session = nueva;
    attempts = 0;
    cancelRetry();
    setState({ lastOutcome: null });
  }

  function subscribe(listener: (event: SyncEvent) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { configure, requestSync, subscribe, getState: () => state };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
