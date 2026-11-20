import { apiFetch } from '../api/client';
import { parseApiError, type ApiError } from '../api/errors';
import type { ActivityType } from '../db/activities';
import type { Coordinates } from '../metrics/geo';
import type { ApiResult } from '../sync/api';
import { NEARBY_TIMEOUT_MS, ROUTE_REQUEST_TIMEOUT_MS } from './constants';
import type { RouteDifficulty } from './format';
import type { Perfil } from './profile';

// Contrato de GET /routes/nearby (spec 006, plan).
export type NearbyRoute = {
  id: string;
  name: string;
  type: ActivityType;
  difficulty: RouteDifficulty | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  start: Coordinates;
  distanceFromCenterMeters: number;
  path: [number, number][]; // [longitud, latitud]
  author: string;
  isMine: boolean;
};

export type NearbySearch = {
  center: Coordinates;
  radiusKm: number;
  type: ActivityType | null; // null = todas (CA-12)
};

// Rutas publicadas cerca de `center`. Nunca lanza: sin red o tiempo agotado devuelve
// { error }, una respuesta no exitosa { status } (como lib/sync/api.ts). Con `limit`, solo las
// más cercanas: Inicio pide 5 (spec 013, CA-9); sin él, el servidor devuelve hasta 50.
export async function fetchNearbyRoutes(
  token: string,
  { center, radiusKm, type }: NearbySearch,
  { limit }: { limit?: number } = {}
): Promise<ApiResult<NearbyRoute[]>> {
  const query = new URLSearchParams({
    lat: String(center.latitude),
    lng: String(center.longitude),
    radiusKm: String(radiusKm),
  });
  if (type) query.set('type', type);
  if (limit !== undefined) query.set('limit', String(limit));

  let response: Response;
  try {
    response = await apiFetch(`/routes/nearby?${query}`, token, {}, NEARBY_TIMEOUT_MS);
  } catch (error) {
    return { ok: false, failure: { error } };
  }
  if (!response.ok) return { ok: false, failure: { status: response.status } };

  try {
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error('Lista de rutas inválida');
    return { ok: true, data: body as NearbyRoute[] };
  } catch (error) {
    return { ok: false, failure: { error } };
  }
}

// --- Publicar rutas, detalle y favoritas (spec 007) ---

// Contratos de la API (spec 007, plan).
export type RouteStatus = 'PUBLISHED' | 'ARCHIVED';

export type RouteDetail = {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  type: ActivityType;
  difficulty: RouteDifficulty | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  start: Coordinates;
  path: [number, number][]; // [longitud, latitud], simplificado a ~2 m
  elevationProfile: Perfil | null;
  author: string;
  isMine: boolean;
  isFavorite: boolean;
  status: RouteStatus;
  sourceActivityId: string | null; // solo en las rutas propias
  publishedAt: string;
};

export type MyRoute = {
  id: string;
  name: string;
  type: ActivityType;
  distanceMeters: number | null;
  status: RouteStatus;
  sourceActivityId: string | null;
  publishedAt: string;
};

export type FavoriteRoute = {
  id: string;
  name: string;
  type: ActivityType;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  available: boolean; // false si se archivó o se borró (CA-19)
  savedAt: string;
};

export type PublishRouteInput = {
  activityId: string;
  name: string;
  description?: string;
  region?: string;
};

// Lo que no se envía no cambia; una descripción o zona vacía la borra.
export type RouteChanges = {
  name?: string;
  description?: string;
  region?: string;
  status?: RouteStatus;
};

// Como el Failure de lib/sync, pero una respuesta no exitosa trae también el cuerpo de error
// ya convertido: el mensaje del servidor (409, 403) y los errores por campo del 400 (CA-5).
export type RouteFailure = { status: number; apiError: ApiError } | { error: unknown };
export type RouteResult<T> = { ok: true; data: T } | { ok: false; failure: RouteFailure };

const ERROR_GENERICO = 'No se pudo completar la acción';

export function publishRoute(token: string, input: PublishRouteInput) {
  return pedir('/routes', token, { method: 'POST', body: JSON.stringify(input) }, aDetalle);
}

export function getRoute(token: string, id: string) {
  return pedir(rutaDe(id), token, {}, aDetalle);
}

export function updateRoute(token: string, id: string, changes: RouteChanges) {
  return pedir(rutaDe(id), token, { method: 'PATCH', body: JSON.stringify(changes) }, aDetalle);
}

export function deleteRoute(token: string, id: string) {
  return pedir(rutaDe(id), token, { method: 'DELETE' }, sinCuerpo);
}

export function listMyRoutes(token: string) {
  return pedir('/routes/mine', token, {}, aLista<MyRoute>);
}

export function listFavorites(token: string) {
  return pedir('/routes/favorites', token, {}, aLista<FavoriteRoute>);
}

// --- Inicio (spec 013) ---

// Contrato de GET /routes/popular (spec 013, plan). Trae cuántas cuentas la guardaron, nunca
// cuáles (RN-8).
export type PopularRoute = {
  id: string;
  name: string;
  type: ActivityType;
  difficulty: RouteDifficulty | null;
  region: string | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  favoritesCount: number;
  isMine: boolean;
};

// Las rutas con más favoritas de todo Baja California, como máximo 5 (CA-13). Una lista vacía
// significa que ninguna tiene favoritas (CA-15).
export function fetchPopularRoutes(token: string) {
  return pedir('/routes/popular', token, {}, aLista<PopularRoute>);
}

// Guardar y quitar son idempotentes en el servidor (CA-16).
export function addFavorite(token: string, id: string) {
  return pedir(`${rutaDe(id)}/favorite`, token, { method: 'PUT' }, sinCuerpo);
}

export function removeFavorite(token: string, id: string) {
  return pedir(`${rutaDe(id)}/favorite`, token, { method: 'DELETE' }, sinCuerpo);
}

const rutaDe = (id: string) => `/routes/${encodeURIComponent(id)}`;

function aDetalle(body: unknown): RouteDetail {
  if (typeof (body as { id?: unknown })?.id !== 'string') throw new Error('Ruta inválida');
  return body as RouteDetail;
}

function aLista<T>(body: unknown): T[] {
  if (!Array.isArray(body)) throw new Error('Lista de rutas inválida');
  return body as T[];
}

// 204: no hay cuerpo que leer.
const sinCuerpo = () => undefined;

// Nunca lanza: sin red o tiempo agotado devuelve { error }; una respuesta no exitosa, su estado
// y su cuerpo de error; un cuerpo inesperado, { error } (como fetchNearbyRoutes).
async function pedir<T>(
  path: string,
  token: string,
  init: RequestInit,
  parse: (body: unknown) => T
): Promise<RouteResult<T>> {
  let response: Response;
  try {
    response = await apiFetch(path, token, init, ROUTE_REQUEST_TIMEOUT_MS);
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
