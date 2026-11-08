import type { FavoriteRoute, NearbyRoute, RouteDetail } from '../routes/api';
import { getDb } from './sqlite';

// Rutas guardadas para consultarlas sin conexión (spec 011, CA-53 a CA-60, RN-14; SQLite v6).
// Todo va por cuenta: otra cuenta del mismo teléfono no ve nada (CA-60). Se conserva al cerrar
// sesión y se borra con la cuenta (lib/db/account.ts). Solo lectura: nada de esto se sube.
//
// - 'nearby', clave 'last': la última búsqueda, no un historial (RN-14).
// - 'favorites', clave 'last': la última lista de favoritas que respondió el servidor.
// - 'detail', clave = id de la ruta: el detalle de cada ruta abierta o favorita.

export type RouteCacheKind = 'nearby' | 'detail' | 'favorites';

export type Guardado<T> = { data: T; savedAt: string }; // savedAt en ISO 8601, para el aviso

// Detalles que se conservan además de los de las favoritas (plan, "Rutas sin conexión").
export const MAX_DETALLES = 30;

const ULTIMO = 'last';

async function guardar(userId: string, kind: RouteCacheKind, key: string, data: unknown, ahora: Date) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO route_cache (user_id, kind, cache_key, payload, saved_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, kind, cache_key) DO UPDATE
       SET payload = excluded.payload, saved_at = excluded.saved_at`,
    [userId, kind, key, JSON.stringify(data), ahora.toISOString()]
  );
}

// Un valor dañado se trata como si no hubiera nada guardado: la pantalla cae al mensaje de que
// necesita internet (CA-54, CA-57) en lugar de fallar.
async function leer<T>(userId: string, kind: RouteCacheKind, key: string): Promise<Guardado<T> | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ payload: string; saved_at: string }>(
    `SELECT payload, saved_at FROM route_cache WHERE user_id = ? AND kind = ? AND cache_key = ?`,
    [userId, kind, key]
  );
  if (!fila) return null;
  try {
    return { data: JSON.parse(fila.payload) as T, savedAt: fila.saved_at };
  } catch {
    return null;
  }
}

// --- Última búsqueda (CA-53) ---

export function saveNearby(userId: string, routes: NearbyRoute[], ahora = new Date()) {
  return guardar(userId, 'nearby', ULTIMO, routes, ahora);
}

export function getNearby(userId: string) {
  return leer<NearbyRoute[]>(userId, 'nearby', ULTIMO);
}

// --- Favoritas (CA-56) ---

export function saveFavorites(userId: string, favorites: FavoriteRoute[], ahora = new Date()) {
  return guardar(userId, 'favorites', ULTIMO, favorites, ahora);
}

export function getFavorites(userId: string) {
  return leer<FavoriteRoute[]>(userId, 'favorites', ULTIMO);
}

// --- Detalle (CA-55) ---

// Guarda el detalle y recorta los que sobran, para que lo guardado no crezca sin límite.
export async function saveRouteDetail(userId: string, route: RouteDetail, ahora = new Date()) {
  await guardar(userId, 'detail', route.id, route, ahora);
  await trimRouteDetails(userId);
}

export function getRouteDetail(userId: string, routeId: string) {
  return leer<RouteDetail>(userId, 'detail', routeId);
}

// Para una ruta archivada o borrada: el servidor respondió 404 (CA-59).
export async function deleteRouteDetail(userId: string, routeId: string) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM route_cache WHERE user_id = ? AND kind = 'detail' AND cache_key = ?`, [
    userId,
    routeId,
  ]);
}

// Conserva el detalle de las favoritas guardadas y de las últimas MAX_DETALLES rutas abiertas;
// borra el resto. Solo toca los detalles de esa cuenta.
export async function trimRouteDetails(userId: string, max = MAX_DETALLES) {
  const favoritas = new Set((await getFavorites(userId))?.data.map((f) => f.id) ?? []);
  const db = await getDb();
  const detalles = await db.getAllAsync<{ cache_key: string }>(
    `SELECT cache_key FROM route_cache WHERE user_id = ? AND kind = 'detail'
     ORDER BY saved_at DESC, cache_key`,
    [userId]
  );
  const sobran = detalles.slice(max).filter((d) => !favoritas.has(d.cache_key));
  for (const d of sobran) await deleteRouteDetail(userId, d.cache_key);
}
