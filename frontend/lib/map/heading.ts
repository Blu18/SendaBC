import { DistancePoint, isAccurate, isJump } from '../metrics/distance';
import { Coordinates, haversineMeters } from '../metrics/geo';

// Distancia mínima entre las posiciones que se comparan: por debajo de esto, el ruido del GPS
// haría girar el mapa con el teléfono quieto (spec 010, plan D6).
export const MIN_HEADING_STEP_M = 10;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Rumbo de `from` a `to` en grados: 0 es el norte y aumenta en sentido horario, de 0 a menos de 360.
export function bearingDegrees(from: Coordinates, to: Coordinates) {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Dirección de avance para girar el mapa (spec 010, CA-3). Con las mismas reglas que el trazo:
// ignora los puntos imprecisos y, tras un salto, vuelve a medir desde el punto nuevo. Si no hay
// avance suficiente, conserva el último rumbo; `value` es null hasta tener el primero.
export function createHeading() {
  let anchor: DistancePoint | null = null;
  let previous: DistancePoint | null = null;
  let value: number | null = null;

  return {
    add(point: DistancePoint) {
      if (!isAccurate(point)) return;
      if (!anchor || (previous && isJump(previous, point))) {
        anchor = point;
      } else if (haversineMeters(anchor, point) >= MIN_HEADING_STEP_M) {
        value = bearingDegrees(anchor, point);
        anchor = point;
      }
      previous = point;
    },
    get value() {
      return value;
    },
  };
}

// Rumbo a partir de los puntos guardados, en el orden en que se registraron (CA-7).
export function computeHeading(points: DistancePoint[]) {
  const heading = createHeading();
  for (const p of points) heading.add(p);
  return heading.value;
}
