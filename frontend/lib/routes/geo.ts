import { haversineMeters, type Coordinates } from '../metrics/geo';
import { MOVE_THRESHOLD } from './constants';

// Grados de latitud por kilómetro, aproximado: solo sirve para encuadrar el mapa.
const DEG_LAT_PER_KM = 1 / 111.2;

// Recorrido del backend ([longitud, latitud]) al formato de react-native-maps (CA-2).
export function pathToCoordinates(path: [number, number][]): Coordinates[] {
  return path.map(([longitude, latitude]) => ({ latitude, longitude }));
}

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
export function regionForPath(path: [number, number][], start: Coordinates) {
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
export function regionAround(center: Coordinates, radiusKm: number) {
  const latitudeDelta = 2 * radiusKm * DEG_LAT_PER_KM;
  const longitudeDelta = latitudeDelta / Math.cos((center.latitude * Math.PI) / 180);
  return { ...center, latitudeDelta, longitudeDelta };
}
