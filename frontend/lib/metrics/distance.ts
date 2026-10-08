import { MAX_ACCURACY_M, MAX_SPEED_MS, MIN_STEP_M, SMOOTHING_WINDOW } from './constants';
import { Coordinates, haversineMeters } from './geo';

export type DistancePoint = Coordinates & {
  accuracy: number | null;
  recordedAt: string; // ISO 8601, para detectar saltos imposibles (CA-25)
};

type SmoothedPoint = Coordinates & { accuracy: number };

// Promedio de posición y precisión de la ventana; sin precisión cuenta como 0 m.
function average(points: DistancePoint[]): SmoothedPoint {
  let latitude = 0;
  let longitude = 0;
  let accuracy = 0;
  for (const p of points) {
    latitude += p.latitude;
    longitude += p.longitude;
    accuracy += p.accuracy ?? 0;
  }
  const n = points.length;
  return { latitude: latitude / n, longitude: longitude / n, accuracy: accuracy / n };
}

// Distancia acumulada punto a punto, para usarse en vivo y al final (plan D2, D3).
// 1. Descarta puntos con precisión peor que MAX_ACCURACY_M (CA-8).
// 2. Si el punto implica más de MAX_SPEED_MS respecto al punto válido anterior, es un
//    salto de ubicación: reinicia el promedio y el ancla en él sin sumar (CA-25).
// 3. Promedia cada punto con los últimos SMOOTHING_WINDOW puntos válidos.
// 4. Solo suma cuando el punto promediado se aleja del ancla más que
//    max(MIN_STEP_M, precisión del ancla + precisión del punto), así el titubeo
//    del GPS con el teléfono quieto no suma (CA-9).
export function createDistanceAccumulator() {
  const window: DistancePoint[] = [];
  let anchor: SmoothedPoint | null = null;
  let previous: { point: DistancePoint; time: number } | null = null;
  let total = 0;

  return {
    add(point: DistancePoint) {
      if (point.accuracy !== null && point.accuracy > MAX_ACCURACY_M) return;

      const time = Date.parse(point.recordedAt);
      if (previous) {
        const seconds = Math.max(1, (time - previous.time) / 1000);
        if (haversineMeters(previous.point, point) / seconds > MAX_SPEED_MS) {
          window.length = 0;
          anchor = null;
        }
      }
      previous = { point, time };

      window.push(point);
      if (window.length > SMOOTHING_WINDOW) window.shift();
      const smoothed = average(window);
      if (!anchor) {
        anchor = smoothed;
        return;
      }
      const d = haversineMeters(anchor, smoothed);
      if (d > Math.max(MIN_STEP_M, anchor.accuracy + smoothed.accuracy)) {
        total += d;
        anchor = smoothed;
      }
    },
    get value() {
      return total;
    },
  };
}

// Distancia total en metros de una lista de puntos en orden (CA-7, CA-17).
export function computeDistance(points: DistancePoint[]) {
  const acc = createDistanceAccumulator();
  for (const p of points) acc.add(p);
  return acc.value;
}
