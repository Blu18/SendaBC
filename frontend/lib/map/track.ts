import { DistancePoint, isAccurate, isJump } from '../metrics/distance';

// [longitud, latitud], como pide GeoJSON (constitución 5.2).
export type LngLat = [longitude: number, latitude: number];

export type TrackFeature = {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'MultiLineString'; coordinates: LngLat[][] };
};

// Recorrido que dibuja el mapa de la grabación (spec 010, CA-4, RN-3). Usa las mismas reglas que
// la distancia, para que lo dibujado coincida con lo medido:
// 1. Descarta los puntos imprecisos.
// 2. Tras un salto de ubicación empieza un segmento nuevo, para no trazar una línea por donde no
//    se pasó.
export function createTrack() {
  const segments: LngLat[][] = [];
  let previous: DistancePoint | null = null;

  return {
    add(point: DistancePoint) {
      if (!isAccurate(point)) return;
      if (!previous || isJump(previous, point)) segments.push([]);
      segments[segments.length - 1].push([point.longitude, point.latitude]);
      previous = point;
    },
    // Último punto aceptado: donde va el marcador de posición. null si aún no hay ninguno.
    get position(): LngLat | null {
      return previous && [previous.longitude, previous.latitude];
    },
    // Un segmento de un solo punto todavía no es una línea.
    get feature(): TrackFeature {
      return {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'MultiLineString',
          coordinates: segments.filter((segment) => segment.length > 1).map((s) => [...s]),
        },
      };
    },
  };
}

// Recorrido a partir de los puntos guardados, en el orden en que se registraron (CA-7).
export function computeTrack(points: DistancePoint[]) {
  const track = createTrack();
  for (const p of points) track.add(p);
  return track;
}
