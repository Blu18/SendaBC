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

// Región del mapa centrada en `center` que muestra el círculo de búsqueda completo (CA-1, CA-10).
export function regionAround(center: Coordinates, radiusKm: number) {
  const latitudeDelta = 2 * radiusKm * DEG_LAT_PER_KM;
  const longitudeDelta = latitudeDelta / Math.cos((center.latitude * Math.PI) / 180);
  return { ...center, latitudeDelta, longitudeDelta };
}
