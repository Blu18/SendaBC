import { simplifyPoints } from '../map/thumbnail';
import type { Perfil } from '../routes/profile';
import { MAX_ACCURACY_M, SMOOTHING_WINDOW } from './constants';
import { createDistanceAccumulator } from './distance';
import { pressureToAltitude } from './elevation';
import type { ElevationSource, MetricsPoint, TimedBarometerReading } from './summary';

// Mínimo para dibujar el perfil de una actividad (spec 014, RN-6). Por debajo, el resumen
// muestra solo las cifras de subida y bajada (CA-7).
export const MIN_PROFILE_READINGS = 10;
export const MIN_PROFILE_DISTANCE_M = 200;
// Pares que se dibujan como máximo, como el perfil de las rutas (spec 007).
export const MAX_PROFILE_POINTS = 200;

export type ActivityProfile = {
  perfil: Perfil; // [distancia acumulada m, altitud m], muestreado a MAX_PROFILE_POINTS
  cumbre: { distanciaM: number; altitudM: number }; // punto más alto (CA-5, RN-5)
  fuente: ElevationSource; // la que se usó para dibujar (plan, D3)
};

type Sample = { distance: number; altitude: number };
type TimedDistance = { time: number; distance: number };

const accurate = (p: { accuracy: number | null }) => p.accuracy === null || p.accuracy <= MAX_ACCURACY_M;

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Distancia recorrida a una hora, interpolada entre los dos puntos que la rodean. Antes del
// primero o después del último, la del extremo.
function distanceAt(track: TimedDistance[], time: number) {
  if (time <= track[0].time) return track[0].distance;
  const last = track[track.length - 1];
  if (time >= last.time) return last.distance;
  let lo = 0;
  let hi = track.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track[mid].time <= time) lo = mid;
    else hi = mid;
  }
  const a = track[lo];
  const b = track[hi];
  if (b.time === a.time) return b.distance;
  return a.distance + ((b.distance - a.distance) * (time - a.time)) / (b.time - a.time);
}

// Promedio de cada altitud con las SMOOTHING_WINDOW anteriores, el mismo de la elevación
// (spec 004): un pico aislado no llega a cumbre (RN-5).
function smooth(samples: Sample[]): Sample[] {
  const window: number[] = [];
  return samples.map((s) => {
    window.push(s.altitude);
    if (window.length > SMOOTHING_WINDOW) window.shift();
    return { distance: s.distance, altitude: window.reduce((a, b) => a + b, 0) / window.length };
  });
}

/**
 * Perfil de elevación de una actividad terminada, con su punto más alto (spec 014, CA-4 a CA-7).
 *
 * - El eje X es la distancia acumulada de `createDistanceAccumulator`, así que coincide con la
 *   distancia del resumen (sin puntos imprecisos ni saltos).
 * - Con GPS, la altitud es la de los puntos precisos que la tienen.
 * - Con barómetro, cada lectura se ubica en el eje X por su hora y se ancla a la altitud real:
 *   se desplaza para que su mediana coincida con la de la altitud GPS de los puntos precisos
 *   (plan, D2). Sin altitudes GPS suficientes, queda la altitud de la atmósfera estándar.
 * - Una actividad de barómetro sin lecturas en el teléfono (recuperada del servidor) usa GPS
 *   (plan, D3; RN-10).
 *
 * Devuelve null si no alcanza el mínimo de RN-6.
 */
export function activityProfile(input: {
  points: MetricsPoint[];
  barometerReadings: TimedBarometerReading[];
  source: ElevationSource;
}): ActivityProfile | null {
  const distance = createDistanceAccumulator();
  const track: TimedDistance[] = [];
  const gps: Sample[] = [];
  for (const p of input.points) {
    if (!accurate(p)) continue;
    distance.add(p);
    track.push({ time: Date.parse(p.recordedAt), distance: distance.value });
    if (p.altitude !== null) gps.push({ distance: distance.value, altitude: p.altitude });
  }
  if (track.length === 0 || distance.value < MIN_PROFILE_DISTANCE_M) return null;

  const fuente: ElevationSource =
    input.source === 'BAROMETER' && input.barometerReadings.length > 0 ? 'BAROMETER' : 'GPS';

  let samples = gps;
  if (fuente === 'BAROMETER') {
    // iOS entrega la altitud relativa; Android, solo la presión. La primera lectura decide,
    // como en las métricas en vivo (spec 004, plan D5).
    const relative = input.barometerReadings[0].relativeAltitudeM !== null;
    const baro = input.barometerReadings
      .map((r) => ({
        distance: distanceAt(track, Date.parse(r.recordedAt)),
        altitude: relative ? r.relativeAltitudeM : pressureToAltitude(r.pressureHpa),
      }))
      .filter((s): s is Sample => s.altitude !== null);
    const offset =
      gps.length >= MIN_PROFILE_READINGS && baro.length > 0
        ? median(gps.map((s) => s.altitude)) - median(baro.map((s) => s.altitude))
        : 0;
    samples = baro.map((s) => ({ distance: s.distance, altitude: s.altitude + offset }));
  }
  if (samples.length < MIN_PROFILE_READINGS) return null;

  const smoothed = smooth(samples);
  let cumbre = smoothed[0];
  for (const s of smoothed) if (s.altitude > cumbre.altitude) cumbre = s;

  return {
    perfil: simplifyPoints(smoothed, MAX_PROFILE_POINTS).map((s) => [s.distance, s.altitude]),
    cumbre: { distanciaM: cumbre.distance, altitudM: cumbre.altitude },
    fuente,
  };
}
