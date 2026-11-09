import { apiFetch } from '../api/client';
import { parseApiError, type ApiError } from '../api/errors';
import { hayConexion, type EstadoRed } from '../sync/network';
import type { AvatarId } from './avatars';

// Límite de las peticiones de cuenta: sin él, un backend inalcanzable tarda más de un minuto.
export const ACCOUNT_TIMEOUT_MS = 15_000;

// Respuesta de GET /user/profile y de PATCH /user/me y /user/me/email (spec 011, plan).
export type Profile = {
  id: string;
  email: string;
  displayName: string;
  avatarId: string | null;
  createdAt: string;
  updatedAt: string;
};

// Lo que no se envía no cambia; avatarId null quita el avatar (RN-15).
export type ProfileChanges = { displayName?: string; avatarId?: AvatarId | null };
export type EmailChange = { email: string; password: string };
export type PasswordChange = { currentPassword: string; newPassword: string };

// Como lib/routes: una respuesta no exitosa trae su estado y el cuerpo de error ya convertido
// (403 contraseña incorrecta, 409 correo usado, 400 por campo). Sin conexión no se pide (CA-45).
export type AccountFailure =
  | { status: number; apiError: ApiError }
  | { error: unknown }
  | { offline: true };
export type AccountResult<T> = { ok: true; data: T } | { ok: false; failure: AccountFailure };

export const ACCOUNT_MESSAGES = {
  offline:
    'Cambiar tu cuenta necesita conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
  error: 'No se pudo completar. Inténtalo de nuevo.',
} as const;

const ERROR_GENERICO = 'No se pudo completar la acción';

export function updateProfile(token: string, changes: ProfileChanges) {
  return pedir('/user/me', token, { method: 'PATCH', body: JSON.stringify(changes) }, aPerfil);
}

export function updateEmail(token: string, change: EmailChange) {
  return pedir(
    '/user/me/email',
    token,
    { method: 'PATCH', body: JSON.stringify(change) },
    aPerfil
  );
}

export function updatePassword(token: string, change: PasswordChange) {
  return pedir(
    '/user/me/password',
    token,
    { method: 'PATCH', body: JSON.stringify(change) },
    sinCuerpo
  );
}

export function deleteAccount(token: string, password: string) {
  return pedir(
    '/user/me',
    token,
    { method: 'DELETE', body: JSON.stringify({ password }) },
    sinCuerpo
  );
}

// Sin conexión no se hace la petición y no queda ningún cambio a medias (CA-45; RN-13).
export async function conConexion<T>(
  red: EstadoRed,
  peticion: () => Promise<AccountResult<T>>
): Promise<AccountResult<T>> {
  if (!hayConexion(red)) return { ok: false, failure: { offline: true } };
  return peticion();
}

// Mensaje general para el usuario. Un 4xx trae su motivo del servidor en español (403, 409); un
// 400 de validación va junto a cada campo; un 401 lo maneja apiFetch cerrando la sesión.
export function mensajeDeCuenta(fallo: AccountFailure): string {
  if ('offline' in fallo) return ACCOUNT_MESSAGES.offline;
  if ('error' in fallo) return ACCOUNT_MESSAGES.error;
  const tieneCampos = Object.keys(fallo.apiError.fieldErrors).length > 0;
  if (fallo.status >= 400 && fallo.status < 500 && fallo.status !== 401 && !tieneCampos) {
    return fallo.apiError.message;
  }
  return ACCOUNT_MESSAGES.error;
}

// Errores del 400 por campo, para mostrarlos junto a cada uno.
export function erroresDeCuenta(fallo: AccountFailure): Record<string, string> {
  return 'status' in fallo && fallo.status === 400 ? fallo.apiError.fieldErrors : {};
}

// La contraseña incorrecta responde 403 (plan, D11): la pantalla la muestra junto a ese campo.
export function esContrasenaIncorrecta(fallo: AccountFailure): boolean {
  return 'status' in fallo && fallo.status === 403;
}

function aPerfil(body: unknown): Profile {
  const perfil = body as Partial<Profile> | null;
  if (typeof perfil?.id !== 'string' || typeof perfil.displayName !== 'string') {
    throw new Error('Perfil inválido');
  }
  return perfil as Profile;
}

// 204: no hay cuerpo que leer.
const sinCuerpo = () => undefined;

// Nunca lanza: sin red o tiempo agotado devuelve { error }; una respuesta no exitosa, su estado
// y su cuerpo de error; un cuerpo inesperado, { error } (como lib/routes/api.ts).
async function pedir<T>(
  path: string,
  token: string,
  init: RequestInit,
  parse: (body: unknown) => T
): Promise<AccountResult<T>> {
  let response: Response;
  try {
    response = await apiFetch(path, token, init, ACCOUNT_TIMEOUT_MS);
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
