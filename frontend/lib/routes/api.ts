import { apiFetch } from '../api/client';
import type { ActivityType } from '../db/activities';
import type { Coordinates } from '../metrics/geo';
import type { ApiResult } from '../sync/api';
import { NEARBY_TIMEOUT_MS } from './constants';
import type { RouteDifficulty } from './format';

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
// { error }, una respuesta no exitosa { status } (como lib/sync/api.ts).
export async function fetchNearbyRoutes(
  token: string,
  { center, radiusKm, type }: NearbySearch
): Promise<ApiResult<NearbyRoute[]>> {
  const query = new URLSearchParams({
    lat: String(center.latitude),
    lng: String(center.longitude),
    radiusKm: String(radiusKm),
  });
  if (type) query.set('type', type);

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
