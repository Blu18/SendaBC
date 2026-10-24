import { apiFetch } from '../api/client';
import { parseApiError, type ApiError } from '../api/errors';
import type { ActivityType } from '../db/activities';
import type { EmergencyContact } from './contacts';
import type { AlertPayload, LocationPayload, SessionPayload } from './outbox';

// Cliente de los endpoints de seguridad (spec 008, plan "Endpoints").

// Sin límite, un backend inalcanzable tarda más de un minuto en fallar y retrasa la alerta.
export const SAFETY_REQUEST_TIMEOUT_MS = 10_000;

// Contratos de la API (plan).
export type SafetyAlert = {
  id: string;
  reason: 'INACTIVITY' | 'SOS' | 'RETURN_TIME';
  status: 'ACTIVE' | 'CANCELLED' | 'RESOLVED';
  triggeredAt: string;
  locationAt: string | null;
  deliveries: { contactName: string; status: 'SENT' | 'FAILED'; sentAt: string }[];
};

export type SafetySession = {
  clientId: string;
  type: ActivityType;
  startedAt: string;
  returnBy: string | null;
  endedAt: string | null;
  lastLocationAt: string | null;
  activeAlert: SafetyAlert | null;
};

export type TestMessageResult = { status: 'SENT' | 'FAILED'; error: string | null };

// Como en lib/routes/api.ts: una respuesta no exitosa trae su estado y el cuerpo de error ya
// convertido (mensaje del servidor y errores por campo); sin red o tiempo agotado, { error }.
export type SafetyFailure = { status: number; apiError: ApiError } | { error: unknown };
export type SafetyResult<T> = { ok: true; data: T } | { ok: false; failure: SafetyFailure };

// Estado HTTP de un fallo, o 'red' si no hubo respuesta (para decidirFallo de outbox.ts).
export function statusDe(failure: SafetyFailure): number | 'red' {
  return 'status' in failure ? failure.status : 'red';
}

const ERROR_GENERICO = 'No se pudo completar la acción';

// --- Contactos (CA-1 a CA-7) ---

export function listContacts(token: string) {
  return pedir('/emergency-contacts', token, {}, aLista<EmergencyContact>);
}

export function createContact(token: string, name: string) {
  return pedir(
    '/emergency-contacts',
    token,
    { method: 'POST', body: JSON.stringify({ name }) },
    aObjeto<EmergencyContact>
  );
}

export function updateContact(token: string, id: string, name: string) {
  return pedir(
    contactoDe(id),
    token,
    { method: 'PATCH', body: JSON.stringify({ name }) },
    aObjeto<EmergencyContact>
  );
}

export function deleteContact(token: string, id: string) {
  return pedir(contactoDe(id), token, { method: 'DELETE' }, sinCuerpo);
}

export function sendTestMessage(token: string, id: string) {
  return pedir(`${contactoDe(id)}/test`, token, { method: 'POST' }, (body) => {
    if (!['SENT', 'FAILED'].includes((body as TestMessageResult)?.status)) {
      throw new Error('Resultado de la prueba inválido');
    }
    return body as TestMessageResult;
  });
}

// --- Sesión y alertas (CA-14 a CA-25) ---

export function upsertSession(token: string, clientId: string, payload: SessionPayload) {
  return pedir(
    sesionDe(clientId),
    token,
    { method: 'PUT', body: JSON.stringify(payload) },
    aSesion
  );
}

export function getSession(token: string, clientId: string) {
  return pedir(sesionDe(clientId), token, {}, aSesion);
}

export function postLocation(token: string, clientId: string, payload: LocationPayload) {
  return pedir(
    `${sesionDe(clientId)}/locations`,
    token,
    { method: 'POST', body: JSON.stringify(payload) },
    sinCuerpo
  );
}

export function finishSession(token: string, clientId: string, endedAt: string) {
  return pedir(
    `${sesionDe(clientId)}/finish`,
    token,
    { method: 'POST', body: JSON.stringify({ endedAt }) },
    aSesion
  );
}

// 201 con la alerta nueva; 200 con la que ya estaba activa (CA-27). Las dos son éxito.
export function createAlert(token: string, clientId: string, payload: AlertPayload) {
  return pedir(
    `${sesionDe(clientId)}/alerts`,
    token,
    { method: 'POST', body: JSON.stringify(payload) },
    aObjeto<SafetyAlert>
  );
}

export function cancelAlert(token: string, alertId: string) {
  return pedir(
    `/safety/alerts/${encodeURIComponent(alertId)}/cancel`,
    token,
    { method: 'POST' },
    aObjeto<SafetyAlert>
  );
}

const contactoDe = (id: string) => `/emergency-contacts/${encodeURIComponent(id)}`;
const sesionDe = (clientId: string) => `/safety/sessions/${encodeURIComponent(clientId)}`;

function aObjeto<T>(body: unknown): T {
  if (typeof (body as { id?: unknown })?.id !== 'string') throw new Error('Respuesta inválida');
  return body as T;
}

function aSesion(body: unknown): SafetySession {
  if (typeof (body as { clientId?: unknown })?.clientId !== 'string') {
    throw new Error('Sesión inválida');
  }
  return body as SafetySession;
}

function aLista<T>(body: unknown): T[] {
  if (!Array.isArray(body)) throw new Error('Lista inválida');
  return body as T[];
}

// 204: no hay cuerpo que leer.
const sinCuerpo = () => undefined;

// Nunca lanza (como lib/routes/api.ts).
async function pedir<T>(
  path: string,
  token: string,
  init: RequestInit,
  parse: (body: unknown) => T
): Promise<SafetyResult<T>> {
  let response: Response;
  try {
    response = await apiFetch(path, token, init, SAFETY_REQUEST_TIMEOUT_MS);
  } catch (error) {
    return { ok: false, failure: { error } };
  }

  if (!response.ok) {
    const cuerpo: unknown = await response.json().catch(() => null);
    return {
      ok: false,
      failure: { status: response.status, apiError: parseApiError(cuerpo, ERROR_GENERICO) },
    };
  }

  try {
    const cuerpo: unknown = response.status === 204 ? null : await response.json();
    return { ok: true, data: parse(cuerpo) };
  } catch (error) {
    return { ok: false, failure: { error } };
  }
}
