// Copia de frontend/lib/metrics/distance.ts (spec 004) para recalcular en el servidor la
// distancia de las actividades con puntos viejos (spec 011, CA-17, RN-11, plan D7). Los dos
// lados tienen los mismos puntos, así que con el mismo algoritmo dan lo mismo. Si cambias
// uno, cambia el otro: distancia.spec.ts repite los casos de distance.test.ts.
// Sin imports de runtime para que el script de recálculo (`node prisma/scripts/...`) también
// pueda usarlo.

// Umbrales de frontend/lib/metrics/constants.ts.
export const MAX_ACCURACY_M = 20;
export const MAX_SPEED_MS = 50;
export const SMOOTHING_WINDOW = 5;
export const SMOOTHING_RADIUS_M = 50;
export const MIN_STEP_M = 5;

// Radio de frontend/lib/metrics/geo.ts.
export const EARTH_RADIUS_M = 6_371_008.8;

export type Coordinates = { latitude: number; longitude: number };

export type DistancePoint = Coordinates & {
  accuracy: number | null;
  recordedAt: string; // ISO 8601, para detectar saltos imposibles (spec 004, CA-25)
};

type SmoothedPoint = Coordinates & { accuracy: number };

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function haversineMeters(a: Coordinates, b: Coordinates) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ¿La precisión del punto alcanza para contarlo? Sin precisión se acepta (spec 004, CA-8).
export function isAccurate(point: Pick<DistancePoint, 'accuracy'>) {
  return point.accuracy === null || point.accuracy <= MAX_ACCURACY_M;
}

// ¿Ir de `previous` a `point` exige más velocidad que MAX_SPEED_MS? (spec 004, CA-25)
export function isJump(previous: DistancePoint, point: DistancePoint) {
  const seconds = Math.max(
    1,
    (Date.parse(point.recordedAt) - Date.parse(previous.recordedAt)) / 1000,
  );
  return haversineMeters(previous, point) / seconds > MAX_SPEED_MS;
}

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
  return {
    latitude: latitude / n,
    longitude: longitude / n,
    accuracy: accuracy / n,
  };
}

// Distancia acumulada punto a punto (spec 004, plan D2, D3).
// 1. Descarta puntos con precisión peor que MAX_ACCURACY_M (CA-8).
// 2. Si el punto implica más de MAX_SPEED_MS respecto al punto válido anterior, es un
//    salto de ubicación: reinicia el promedio y el ancla en él sin sumar (CA-25).
// 3. Promedia cada punto con los últimos SMOOTHING_WINDOW puntos válidos que estén a
//    SMOOTHING_RADIUS_M o menos de él (spec 011, F4).
// 4. Solo suma cuando el punto promediado se aleja del ancla más que
//    max(MIN_STEP_M, precisión del ancla + precisión del punto) (CA-9).
export function createDistanceAccumulator() {
  let window: DistancePoint[] = [];
  let anchor: SmoothedPoint | null = null;
  let previous: DistancePoint | null = null;
  let total = 0;

  return {
    add(point: DistancePoint) {
      if (!isAccurate(point)) return;

      if (previous && isJump(previous, point)) {
        window = [];
        anchor = null;
      }
      previous = point;

      window.push(point);
      if (window.length > SMOOTHING_WINDOW) window.shift();
      window = window.filter(
        (p) => haversineMeters(p, point) <= SMOOTHING_RADIUS_M,
      );
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

// Distancia total en metros de una lista de puntos en orden.
export function computeDistance(points: DistancePoint[]) {
  const acc = createDistanceAccumulator();
  for (const p of points) acc.add(p);
  return acc.value;
}
