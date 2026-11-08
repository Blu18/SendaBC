import type { Guardado } from '../db/routeCache';
import type { NearbyRoute, RouteDetail, RouteFailure } from './api';

// --- Datos guardados para consultar sin conexión (spec 011, CA-53 a CA-57) ---

// Sin conexión se usa lo guardado. También si la petición no llegó al servidor (sin red real,
// tiempo agotado o túnel caído), porque el teléfono puede creer que tiene red (plan, D3). Una
// respuesta del servidor, aunque sea un 5xx, sigue siendo error.
export function noLlegoAlServidor(failure: { status: number } | { error: unknown }): boolean {
  return 'error' in failure;
}

// Resultado sin conexión de una búsqueda o una lista: con lo guardado si lo hay (CA-53, CA-56),
// o sin nada, que pinta el mensaje de que necesita internet (CA-54).
export function sinConexion<T>(saved: Guardado<T> | null): { offline: true; saved?: Guardado<T> } {
  return saved ? { offline: true, saved } : { offline: true };
}

// Texto del aviso de datos guardados, con su fecha (CA-53, CA-55).
export function avisoDeGuardado(savedAt: string): string {
  const fecha = new Date(savedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  return `Datos guardados el ${fecha}. Sin conexión no se pueden actualizar.`;
}

// Estado de la búsqueda que pinta la pantalla (CA-13, CA-15, CA-16; spec 011, CA-53).
export type NearbyStatus = 'idle' | 'loading' | 'success' | 'empty' | 'offline' | 'saved' | 'error';

// Resultado de una búsqueda: sin conexión no se hace la petición (CA-15) y, si hay, se usa la
// última búsqueda guardada (spec 011, CA-53).
export type NearbyOutcome =
  | { offline: true; saved?: Guardado<NearbyRoute[]> }
  | { offline: false; routes: NearbyRoute[] };

export function nearbyStatus(q: {
  requested: boolean; // ya se pidió al menos una búsqueda
  isFetching: boolean;
  isError: boolean;
  data: NearbyOutcome | undefined;
}): NearbyStatus {
  if (!q.requested) return 'idle'; // sin permiso aún no se busca (CA-14)
  if (q.isFetching) return 'loading';
  if (q.isError || !q.data) return 'error';
  // Una búsqueda guardada sin resultados también es 'saved': la pantalla dice que no había rutas.
  if (q.data.offline) return q.data.saved ? 'saved' : 'offline';
  return q.data.routes.length === 0 ? 'empty' : 'success';
}

// --- Publicar rutas, detalle y favoritas (spec 007) ---

// Resultado de pedir el detalle (lib/routes/offline.ts, consultarDetalle): sin conexión no se
// hace la petición (CA-13), y un 404 es una ruta que ya no está disponible, no un error (CA-14).
// Sin conexión, con el detalle guardado, es 'saved' (spec 011, CA-55); sin él, 'offline' (CA-57).
export type RouteDetailOutcome =
  | { kind: 'offline' }
  | { kind: 'unavailable' }
  | { kind: 'found'; route: RouteDetail }
  | { kind: 'saved'; route: RouteDetail; savedAt: string };

export type RouteDetailStatus = 'loading' | 'success' | 'offline' | 'saved' | 'error' | 'unavailable';

export function detalleSinConexion(saved: Guardado<RouteDetail> | null): RouteDetailOutcome {
  return saved ? { kind: 'saved', route: saved.data, savedAt: saved.savedAt } : { kind: 'offline' };
}

export function routeDetailStatus(q: {
  isFetching: boolean;
  isError: boolean;
  data: RouteDetailOutcome | undefined;
}): RouteDetailStatus {
  // Si ya hay una ruta, se sigue mostrando mientras se refresca (por ejemplo, después de
  // guardarla en favoritas): la pantalla no vuelve a "cargando". Igual con la guardada.
  if (q.isFetching && q.data?.kind !== 'found' && q.data?.kind !== 'saved') return 'loading';
  if (q.isError || !q.data) return 'error';
  if (q.data.kind === 'offline') return 'offline';
  if (q.data.kind === 'saved') return 'saved';
  if (q.data.kind === 'unavailable') return 'unavailable';
  return 'success';
}

// "Mis rutas" y "Mis favoritas" (CA-18, CA-21): la lista vacía tiene su propio mensaje.
// Sin conexión, las favoritas guardadas (spec 011, CA-56).
export type RouteListOutcome<T> = { offline: true; saved?: Guardado<T[]> } | { offline: false; items: T[] };
export type RouteListStatus = 'loading' | 'success' | 'empty' | 'offline' | 'saved' | 'error';

export function routeListStatus<T>(q: {
  isFetching: boolean;
  isError: boolean;
  data: RouteListOutcome<T> | undefined;
}): RouteListStatus {
  // Igual que el detalle: una lista ya cargada, o la guardada, se sigue mostrando mientras se
  // refresca.
  if (q.isFetching && (!q.data || (q.data.offline && !q.data.saved))) return 'loading';
  if (q.isError || !q.data) return 'error';
  // Una lista guardada vacía también es 'saved': la pantalla dice que no había favoritas.
  if (q.data.offline) return q.data.saved ? 'saved' : 'offline';
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
