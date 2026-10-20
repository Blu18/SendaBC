import type { NearbyRoute, RouteDetail, RouteFailure } from './api';

// Estado de la búsqueda que pinta la pantalla (CA-13, CA-15, CA-16).
export type NearbyStatus = 'idle' | 'loading' | 'success' | 'empty' | 'offline' | 'error';

// Resultado de una búsqueda: sin conexión no se hace la petición (CA-15).
export type NearbyOutcome = { offline: true } | { offline: false; routes: NearbyRoute[] };

export function nearbyStatus(q: {
  requested: boolean; // ya se pidió al menos una búsqueda
  isFetching: boolean;
  isError: boolean;
  data: NearbyOutcome | undefined;
}): NearbyStatus {
  if (!q.requested) return 'idle'; // sin permiso aún no se busca (CA-14)
  if (q.isFetching) return 'loading';
  if (q.isError || !q.data) return 'error';
  if (q.data.offline) return 'offline';
  return q.data.routes.length === 0 ? 'empty' : 'success';
}

// --- Publicar rutas, detalle y favoritas (spec 007) ---

// Resultado de pedir el detalle: sin conexión no se hace la petición (CA-13), y un 404 es una
// ruta que ya no está disponible, no un error (CA-14).
export type RouteDetailOutcome =
  { kind: 'offline' } | { kind: 'unavailable' } | { kind: 'found'; route: RouteDetail };

export type RouteDetailStatus = 'loading' | 'success' | 'offline' | 'error' | 'unavailable';

export function routeDetailOutcome(
  result: { ok: true; data: RouteDetail } | { ok: false; failure: RouteFailure }
): RouteDetailOutcome {
  if (result.ok) return { kind: 'found', route: result.data };
  if ('status' in result.failure && result.failure.status === 404) return { kind: 'unavailable' };
  // Cualquier otro fallo se lanza para que la query quede en error y se pueda reintentar.
  throw result.failure;
}

export function routeDetailStatus(q: {
  isFetching: boolean;
  isError: boolean;
  data: RouteDetailOutcome | undefined;
}): RouteDetailStatus {
  // Si ya hay una ruta, se sigue mostrando mientras se refresca (por ejemplo, después de
  // guardarla en favoritas): la pantalla no vuelve a "cargando".
  if (q.isFetching && q.data?.kind !== 'found') return 'loading';
  if (q.isError || !q.data) return 'error';
  if (q.data.kind === 'offline') return 'offline';
  if (q.data.kind === 'unavailable') return 'unavailable';
  return 'success';
}

// "Mis rutas" y "Mis favoritas" (CA-18, CA-21): la lista vacía tiene su propio mensaje.
export type RouteListOutcome<T> = { offline: true } | { offline: false; items: T[] };
export type RouteListStatus = 'loading' | 'success' | 'empty' | 'offline' | 'error';

export function routeListStatus<T>(q: {
  isFetching: boolean;
  isError: boolean;
  data: RouteListOutcome<T> | undefined;
}): RouteListStatus {
  // Igual que el detalle: una lista ya cargada se sigue mostrando mientras se refresca.
  if (q.isFetching && (!q.data || q.data.offline)) return 'loading';
  if (q.isError || !q.data) return 'error';
  if (q.data.offline) return 'offline';
  return q.data.items.length === 0 ? 'empty' : 'success';
}

// Por qué falló publicar, editar, archivar, borrar o una favorita (CA-7). Sin conexión la app
// no hace la petición.
export type RouteActionFailure = RouteFailure | { offline: true };

export const ROUTE_ACTION_MESSAGES = {
  offline: 'Esto necesita conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
  error: 'No se pudo completar. Inténtalo de nuevo.',
} as const;

// Mensaje para el usuario. Un 4xx trae su motivo del servidor en español (409, 403, 404); sin
// red, un 5xx o un 400 de validación (sus errores van junto a cada campo) usan uno genérico.
export function mensajeDeFallo(fallo: RouteActionFailure): string {
  if ('offline' in fallo) return ROUTE_ACTION_MESSAGES.offline;
  if ('error' in fallo) return ROUTE_ACTION_MESSAGES.error;
  const tieneCampos = Object.keys(fallo.apiError.fieldErrors).length > 0;
  if (fallo.status >= 400 && fallo.status < 500 && fallo.status !== 401 && !tieneCampos) {
    return fallo.apiError.message;
  }
  return ROUTE_ACTION_MESSAGES.error;
}

// Errores del 400 por campo, para mostrarlos junto a cada uno (CA-5).
export function erroresDeCampo(fallo: RouteActionFailure): Record<string, string> {
  return 'status' in fallo && fallo.status === 400 ? fallo.apiError.fieldErrors : {};
}
