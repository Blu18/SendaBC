// Radio medio de la Tierra en metros (IUGG).
export const EARTH_RADIUS_M = 6_371_008.8;

export type Coordinates = { latitude: number; longitude: number };

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Distancia sobre la esfera terrestre entre dos coordenadas WGS84, en metros (CA-7).
export function haversineMeters(a: Coordinates, b: Coordinates) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
