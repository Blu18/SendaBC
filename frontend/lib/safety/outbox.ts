import type { ActivityType } from '../db/activities';

// Bandeja de salida de seguridad (spec 008, plan D6): lo que el teléfono le debe al servidor
// cuando no hay red. Se guarda en SQLite (T14) y safetySync la envía en cuanto hay conexión.
// Este archivo solo tiene los tipos y las reglas, sin acceso a la base ni a la red.

export type SessionPayload = {
  type: ActivityType;
  startedAt: string;
  returnBy: string | null;
};

export type AlertPayload = {
  clientAlertId: string;
  reason: 'INACTIVITY' | 'SOS';
  triggeredAt: string;
  latitude: number | null;
  longitude: number | null;
  locationAt: string | null;
};

export type LocationPayload = { latitude: number; longitude: number; recordedAt: string };

export type OutboxEntry =
  | { kind: 'session'; clientId: string; payload: SessionPayload }
  | { kind: 'alert'; clientId: string; payload: AlertPayload }
  // Se cancela por clientAlertId: la alerta puede no tener id del servidor todavía.
  | { kind: 'cancel'; clientId: string; payload: { clientAlertId: string } }
  | { kind: 'location'; clientId: string; payload: LocationPayload }
  | { kind: 'finish'; clientId: string; payload: { endedAt: string } };

export type OutboxItem = OutboxEntry & { id: number; createdAt: number; attempts: number };

export type PlanDeEnvio = {
  // En el orden en que hay que enviarlos.
  enviar: OutboxItem[];
  // Ids que ya no hace falta enviar: se pueden borrar de la bandeja.
  descartar: number[];
};

// Qué se envía y en qué orden:
// - Orden cronológico. No se ordena por tipo: una alerta cancelada seguida de otra nueva tiene
//   que llegar en ese orden, o la nueva se toparía con la anterior aún activa (RN-8).
// - De cada sesión, solo la última versión (PUT completo, idempotente), en el lugar de la
//   primera: la sesión tiene que existir en el servidor antes que sus ubicaciones y alertas.
// - De las ubicaciones de una sesión, solo la más reciente (CA-20, plan D7).
// - Una alerta y su cancelación que no se han enviado se descartan juntas: los contactos no
//   tienen por qué recibir una alerta que el usuario ya canceló.
export function planDeEnvio(items: OutboxItem[]): PlanDeEnvio {
  const ordenados = [...items].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id);
  const descartar = new Set<number>();

  const ultimaSesion = new Map<string, OutboxItem>();
  const ultimaUbicacion = new Map<string, OutboxItem>();
  const alertas = new Map<string, OutboxItem>();
  for (const item of ordenados) {
    if (item.kind === 'session') ultimaSesion.set(item.clientId, item);
    if (item.kind === 'location') ultimaUbicacion.set(item.clientId, item);
    if (item.kind === 'alert') alertas.set(item.payload.clientAlertId, item);
  }

  for (const item of ordenados) {
    if (item.kind === 'location' && ultimaUbicacion.get(item.clientId) !== item) {
      descartar.add(item.id);
    }
    if (item.kind === 'cancel') {
      const alerta = alertas.get(item.payload.clientAlertId);
      if (alerta) {
        descartar.add(item.id);
        descartar.add(alerta.id);
      }
    }
  }

  const enviar: OutboxItem[] = [];
  const sesionPuesta = new Set<string>();
  for (const item of ordenados) {
    if (descartar.has(item.id)) continue;
    if (item.kind !== 'session') {
      enviar.push(item);
      continue;
    }
    const ultima = ultimaSesion.get(item.clientId)!;
    if (item !== ultima) descartar.add(item.id);
    // La primera aparición de la sesión ocupa su lugar con la última versión.
    if (!sesionPuesta.has(item.clientId)) {
      sesionPuesta.add(item.clientId);
      enviar.push(ultima);
    }
  }

  return { enviar, descartar: [...descartar] };
}

export type ResultadoEnvio =
  | { ok: true }
  | { ok: false; status: number }
  | { ok: false; status: 'red' };

export type DecisionFallo =
  // Se queda en la bandeja y se detiene el envío para no romper el orden; se reintenta.
  | 'reintentar'
  // Sin sesión: se detiene todo hasta que el usuario vuelva a entrar (como en la spec 005).
  | 'sesion'
  // El servidor no la va a aceptar nunca (datos inválidos, sesión terminada, alerta que ya no
  // está activa, de otra cuenta): se borra y se sigue con la siguiente.
  | 'descartar';

// Qué hacer con un envío que falló. Un fallo de red o del servidor nunca borra datos
// (constitución 2.4).
export function decidirFallo(status: number | 'red'): DecisionFallo {
  if (status === 'red') return 'reintentar';
  if (status === 401) return 'sesion';
  if (status === 408 || status === 429 || status >= 500) return 'reintentar';
  return 'descartar';
}

// Cada cuánto se reintenta la bandeja mientras haya red (D6): mucho menos que la espera de
// hasta 15 min de la sincronización de actividades, porque una alerta no puede esperar.
export const REINTENTO_MS = 30_000;

// Cada cuánto se encola la ubicación para el servidor (D7): 5 min, o 1 min con alerta activa.
export const UBICACION_CADA_MS = 5 * 60_000;
export const UBICACION_CON_ALERTA_MS = 60_000;

export function tocaEncolarUbicacion(ultimaEncolada: number | null, ahora: number, alertaActiva: boolean) {
  if (ultimaEncolada === null) return true;
  return ahora - ultimaEncolada >= (alertaActiva ? UBICACION_CON_ALERTA_MS : UBICACION_CADA_MS);
}
