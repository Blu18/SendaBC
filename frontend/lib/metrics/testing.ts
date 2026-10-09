// Utilidades solo para las pruebas de lib/metrics: recorridos sintéticos y ruido
// reproducible con semilla.
import { DistancePoint } from './distance';
import { EARTH_RADIUS_M } from './geo';

// Origen en la sierra de Ensenada; los recorridos se definen en metros este/norte.
const ORIGIN = { latitude: 31.87, longitude: -116.6 };
const M_PER_DEG_LAT = (Math.PI * EARTH_RADIUS_M) / 180;
const M_PER_DEG_LON = M_PER_DEG_LAT * Math.cos((ORIGIN.latitude * Math.PI) / 180);

const START_MS = Date.parse('2026-10-05T15:00:00.000Z');

// Punto a `east`/`north` metros del origen, registrado `seconds` después del inicio.
export function at(
  east: number,
  north: number,
  accuracy: number | null = 5,
  seconds = 0
): DistancePoint {
  return {
    latitude: ORIGIN.latitude + north / M_PER_DEG_LAT,
    longitude: ORIGIN.longitude + east / M_PER_DEG_LON,
    accuracy,
    recordedAt: new Date(START_MS + seconds * 1000).toISOString(),
  };
}

export type Vertex = [east: number, north: number];

// Recorrido por los vértices dados, con un punto cada `step` metros a `speed` m/s
// (por defecto caminando).
export function path(vertices: Vertex[], step: number, accuracy = 5, speed = 1.3) {
  const points: DistancePoint[] = [at(...vertices[0], accuracy)];
  let meters = 0;
  for (let i = 1; i < vertices.length; i++) {
    const [x0, y0] = vertices[i - 1];
    const [x1, y1] = vertices[i];
    const length = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.round(length / step);
    for (let k = 1; k <= n; k++) {
      const seconds = (meters + (length * k) / n) / speed;
      points.push(at(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, accuracy, seconds));
    }
    meters += length;
  }
  return points;
}

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// Normal estándar (Box-Muller).
export function gaussian(random: () => number) {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}

export const seeds = (count: number) => Array.from({ length: count }, (_, i) => i + 1);

export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
