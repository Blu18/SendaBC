import type { SyncSession } from '../sync/syncEngine';
import { statusDe, type SafetyAlert, type SafetyResult } from './api';
import {
  decidirFallo,
  planDeEnvio,
  REINTENTO_MS,
  type AlertPayload,
  type LocationPayload,
  type OutboxEntry,
  type OutboxItem,
  type SessionPayload,
} from './outbox';

// Envío de la bandeja de seguridad (spec 008, plan D6). Aparte del syncEngine de actividades:
// intenta al encolar, reintenta cada 30 s mientras haya red y no espera los hasta 15 min de la
// spec 005, porque una alerta no puede esperar (CA-15). Comparte con él la detección de red y el
// manejo del 401.

// Lo que el motor necesita del resto de la app; la instancia real se arma en lib/safety/index.ts.
export type SafetySyncDeps = {
  isOnline(): Promise<boolean>;
  enqueueOutbox(userId: string, entry: OutboxEntry): Promise<number>;
  listOutbox(userId: string): Promise<OutboxItem[]>;
  deleteOutbox(ids: number[]): Promise<void>;
  incrementOutboxAttempts(id: number): Promise<void>;
  markSessionAck(clientId: string, returnBy: string | null): Promise<void>;
  markAlertSent(clientAlertId: string, serverId: string): Promise<void>;
  getAlertServerId(clientAlertId: string): Promise<string | null>;
  upsertSession(token: string, clientId: string, p: SessionPayload): Promise<SafetyResult<unknown>>;
  createAlert(token: string, clientId: string, p: AlertPayload): Promise<SafetyResult<SafetyAlert>>;
  cancelAlert(token: string, alertId: string): Promise<SafetyResult<unknown>>;
  postLocation(token: string, clientId: string, p: LocationPayload): Promise<SafetyResult<unknown>>;
  finishSession(token: string, clientId: string, endedAt: string): Promise<SafetyResult<unknown>>;
  log?(mensaje: string, error?: unknown): void;
};

// Cómo terminó un envío (como SyncOutcome de la spec 005).
// - done: la bandeja quedó vacía.
// - offline: sin conexión; no se hizo ninguna petición. La vuelta de la red dispara otro envío.
// - retry: falló la red o el servidor; hay un reintento en 30 s.
// - auth: el token ya no sirve (401); se espera a que cambie la sesión.
// - no-session: no hay usuario con sesión.
export type SafetySyncOutcome = 'done' | 'offline' | 'retry' | 'auth' | 'no-session';

// data-changed: algo se envió o se descartó; las pantallas recargan "enviada / pendiente".
export type SafetySyncEvent = { type: 'data-changed' };

type Envio = { ok: true } | { ok: false; status: number | 'red' };

export function createSafetySync(deps: SafetySyncDeps) {
  const log = deps.log ?? (() => {});
  const listeners = new Set<(event: SafetySyncEvent) => void>();

  let session: SyncSession | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<SafetySyncOutcome> | null = null;
  let pendiente = false;

  const emit = (event: SafetySyncEvent) => {
    for (const listener of listeners) listener(event);
  };

  function cancelRetry() {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
  }

  function scheduleRetry() {
    cancelRetry();
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void requestSend();
    }, REINTENTO_MS);
  }

  const resultado = (r: SafetyResult<unknown>): Envio =>
    r.ok ? { ok: true } : { ok: false, status: statusDe(r.failure) };

  // Envía una entrada y aplica su efecto local si el servidor la aceptó.
  async function enviar(token: string, item: OutboxItem): Promise<Envio> {
    switch (item.kind) {
      case 'session': {
        const r = await deps.upsertSession(token, item.clientId, item.payload);
        // La hora de regreso ya cuenta para el servidor (CA-23).
        if (r.ok) await deps.markSessionAck(item.clientId, item.payload.returnBy);
        return resultado(r);
      }
      case 'alert': {
        const r = await deps.createAlert(token, item.clientId, item.payload);
        if (r.ok) await deps.markAlertSent(item.payload.clientAlertId, r.data.id);
        return resultado(r);
      }
      case 'cancel': {
        const serverId = await deps.getAlertServerId(item.payload.clientAlertId);
        // La alerta nunca llegó al servidor (se descartó): no hay nada que cancelar.
        if (serverId === null) return { ok: false, status: 404 };
        return resultado(await deps.cancelAlert(token, serverId));
      }
      case 'location':
        return resultado(await deps.postLocation(token, item.clientId, item.payload));
      case 'finish':
        return resultado(await deps.finishSession(token, item.clientId, item.payload.endedAt));
    }
  }

  async function ciclo(): Promise<SafetySyncOutcome> {
    const s = session;
    if (!s) return 'no-session';
    if (!(await deps.isOnline())) return 'offline';

    cancelRetry();
    try {
      const plan = planDeEnvio(await deps.listOutbox(s.userId));
      if (plan.descartar.length > 0) {
        await deps.deleteOutbox(plan.descartar);
        emit({ type: 'data-changed' });
      }

      for (const item of plan.enviar) {
        // La sesión cambió a medio envío: lo demás se manda con la cuenta correcta después.
        if (session !== s) return 'no-session';
        const envio = await enviar(s.token, item);
        if (envio.ok) {
          await deps.deleteOutbox([item.id]);
          emit({ type: 'data-changed' });
          continue;
        }

        const decision = decidirFallo(envio.status);
        if (decision === 'sesion') return 'auth';
        if (decision === 'reintentar') {
          // Se detiene para no romper el orden; nada se borra (constitución 2.4).
          await deps.incrementOutboxAttempts(item.id);
          scheduleRetry();
          return 'retry';
        }
        log(`Se descarta ${item.kind} de ${item.clientId}: el servidor respondió ${envio.status}`);
        await deps.deleteOutbox([item.id]);
        emit({ type: 'data-changed' });
      }
    } catch (error) {
      // Error inesperado (p. ej. de SQLite): nada se perdió; se reintenta.
      log('Error inesperado al enviar la bandeja de seguridad', error);
      scheduleRetry();
      return 'retry';
    }
    return 'done';
  }

  // Pide un envío. Si ya hay uno corriendo, se repite al terminar y la promesa resuelve con el
  // resultado final (como requestSync de la spec 005).
  function requestSend(): Promise<SafetySyncOutcome> {
    if (!session) return Promise.resolve('no-session');
    pendiente = true;
    if (running) return running;

    running = (async () => {
      let outcome: SafetySyncOutcome = 'done';
      try {
        while (pendiente) {
          pendiente = false;
          outcome = await ciclo();
          if (outcome !== 'done') pendiente = false;
        }
      } finally {
        running = null;
      }
      return outcome;
    })();
    return running;
  }

  // Encola y, si hay red, envía en el momento (plan D6). Sin sesión no se encola nada: la
  // seguridad necesita una cuenta para avisar.
  async function encolar(entry: OutboxEntry): Promise<SafetySyncOutcome> {
    if (!session) return 'no-session';
    await deps.enqueueOutbox(session.userId, entry);
    emit({ type: 'data-changed' });
    return requestSend();
  }

  // Cambia la sesión (inicio o cierre). Cancela el reintento de la anterior.
  function configure(nueva: SyncSession | null) {
    const igual =
      nueva !== null &&
      session !== null &&
      nueva.token === session.token &&
      nueva.userId === session.userId;
    if (igual) return;
    session = nueva;
    cancelRetry();
  }

  function subscribe(listener: (event: SafetySyncEvent) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { configure, encolar, requestSend, subscribe };
}

export type SafetySync = ReturnType<typeof createSafetySync>;
