import { haversineMeters, type Coordinates } from '../metrics/geo';
import type { LngLat } from '../map/track';
import { MOVE_THRESHOLD } from './constants';

// Grados de latitud por kilómetro, aproximado: solo sirve para encuadrar el mapa.
const DEG_LAT_PER_KM = 1 / 111.2;

// Distancia en línea recta desde el usuario hasta el inicio de la ruta, en metros (CA-7,
// RN-2). Sin ubicación del usuario no hay distancia (CA-14).
export function distanceFromUser(
  route: { start: Coordinates },
  user: Coordinates | null
): number | null {
  return user ? haversineMeters(user, route.start) : null;
}

// ¿Mostrar "Buscar en esta zona"? Sí si todavía no se ha buscado (sin permiso, CA-14) o si el
// centro se movió más del 20 % del radio desde la última búsqueda (CA-9).
export function hasMovedEnough(
  lastCenter: Coordinates | null,
  center: Coordinates,
  radiusKm: number
): boolean {
  if (!lastCenter) return true;
  return haversineMeters(lastCenter, center) > radiusKm * 1000 * MOVE_THRESHOLD;
}

// Margen alrededor del recorrido en el detalle, como fracción de su tamaño, y tamaño mínimo
// de la región (≈ 500 m) para que una ruta muy corta o recta no quede pegada a los bordes.
const PATH_MARGIN = 0.25;
const MIN_DELTA_DEG = 0.005;

// Región del mapa que muestra el recorrido completo (spec 007, CA-10). `path` en [lng, lat];
// sin puntos, la región alrededor de `start`.
function regionForPath(path: [number, number][], start: Coordinates) {
  const lngs = path.length > 0 ? path.map(([lng]) => lng) : [start.longitude];
  const lats = path.length > 0 ? path.map(([, lat]) => lat) : [start.latitude];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(MIN_DELTA_DEG, (maxLat - minLat) * (1 + 2 * PATH_MARGIN)),
    longitudeDelta: Math.max(MIN_DELTA_DEG, (maxLng - minLng) * (1 + 2 * PATH_MARGIN)),
  };
}

// Región del mapa centrada en `center` que muestra el círculo de búsqueda completo (CA-1, CA-10).
function regionAround(center: Coordinates, radiusKm: number) {
  const latitudeDelta = 2 * radiusKm * DEG_LAT_PER_KM;
  const longitudeDelta = latitudeDelta / Math.cos((center.latitude * Math.PI) / 180);
  return { ...center, latitudeDelta, longitudeDelta };
}

// --- Encuadres para Mapbox (spec 013, T7) ---
// Mapbox recibe los límites como esquinas en [longitud, latitud]. regionForPath y regionAround
// calculan centro y tamaño, y boundsForPath y boundsAround los convierten en esquinas.
export type Bounds = { ne: LngLat; sw: LngLat };

function boundsFromCenter(center: LngLat, lngSpan: number, latSpan: number): Bounds {
  const [lng, lat] = center;
  return {
    ne: [lng + lngSpan / 2, lat + latSpan / 2],
    sw: [lng - lngSpan / 2, lat - latSpan / 2],
  };
}

// Límites que muestran el recorrido completo, con 25 % de margen por lado y al menos ≈ 500 m
// (spec 007, CA-10; spec 013, CA-32). `path` en [lng, lat]; sin puntos, alrededor de `start`.
export function boundsForPath(path: [number, number][], start: Coordinates): Bounds {
  const r = regionForPath(path, start);
  return boundsFromCenter([r.longitude, r.latitude], r.longitudeDelta, r.latitudeDelta);
}

// Límites centrados en `center` que muestran el círculo de búsqueda completo (spec 006, CA-1,
// CA-10; spec 013, CA-31).
export function boundsAround(center: Coordinates, radiusKm: number): Bounds {
  const r = regionAround(center, radiusKm);
  return boundsFromCenter([r.longitude, r.latitude], r.longitudeDelta, r.latitudeDelta);
}
