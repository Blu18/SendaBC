import {
  BARO_NOISE_M,
  GPS_NOISE_M,
  MAX_ACCURACY_M,
  MAX_BARO_GAP_MS,
  MAX_BARO_UNCOVERED,
} from './constants';
import { createDistanceAccumulator, DistancePoint } from './distance';
import { createElevationAccumulator, pressureToAltitude } from './elevation';

export type ElevationSource = 'BAROMETER' | 'GPS';

export type MetricsPoint = DistancePoint & { altitude: number | null };

export type BarometerReading = {
  pressureHpa: number;
  relativeAltitudeM: number | null; // solo iOS
};

// Lectura guardada en el teléfono, con la hora a la que se tomó.
export type TimedBarometerReading = BarometerReading & { recordedAt: string };

export type ActivityMetrics = {
  distanceMeters: number;
  durationSeconds: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  elevationSource: ElevationSource;
};

// Distancia y elevación acumuladas dato a dato. La usa el hook en vivo y
// computeActivityMetrics al terminar, así ambas dan lo mismo (CA-16, plan D2).
// La fuente se fija al crearla: una actividad no mezcla barómetro y GPS (RN-3).
export function createLiveMetrics(source: ElevationSource) {
  const distance = createDistanceAccumulator();
  const elevation = createElevationAccumulator(source === 'BAROMETER' ? BARO_NOISE_M : GPS_NOISE_M);
  // iOS entrega la altitud relativa ya filtrada; Android solo la presión (plan D5).
  // La primera lectura decide cuál se usa en toda la actividad.
  let useRelativeAltitude: boolean | null = null;

  return {
    addPoint(point: MetricsPoint) {
      distance.add(point);
      const accurate = point.accuracy === null || point.accuracy <= MAX_ACCURACY_M;
      if (source === 'GPS' && accurate) elevation.add(point.altitude);
    },
    addBarometerReading(reading: BarometerReading) {
      if (source !== 'BAROMETER') return;
      useRelativeAltitude ??= reading.relativeAltitudeM !== null;
      elevation.add(
        useRelativeAltitude ? reading.relativeAltitudeM : pressureToAltitude(reading.pressureHpa),
      );
    },
    get distanceMeters() {
      return distance.value;
    },
    get elevationGainMeters() {
      return elevation.gain;
    },
    get elevationLossMeters() {
      return elevation.loss;
    },
  };
}

// ¿Las lecturas cubren la actividad? Suma los tramos de más de MAX_BARO_GAP_MS sin lecturas,
// incluidos los del inicio a la primera y de la última al fin (RN-7). Con la pantalla apagada
// el barómetro llegó a no entregar nada (spec 011, F3). Con menos de 2 lecturas no hay
// diferencias que medir. Las lecturas van en el orden en que se registraron.
export function barometerCovers(
  readings: TimedBarometerReading[],
  startedAt: string,
  endedAt: string
) {
  if (readings.length < 2) return false;
  const start = Date.parse(startedAt);
  const duration = Date.parse(endedAt) - start;
  if (duration <= 0) return true;
  const times = [start, ...readings.map((r) => Date.parse(r.recordedAt)), start + duration];
  let uncovered = 0;
  for (let i = 1; i < times.length; i++) {
    const gap = times[i] - times[i - 1];
    if (gap > MAX_BARO_GAP_MS) uncovered += gap;
  }
  return uncovered < MAX_BARO_UNCOVERED * duration;
}

// Métricas finales de una actividad a partir de lo guardado en el teléfono (RN-4).
// `points` y `barometerReadings` van en el orden en que se registraron.
export function computeActivityMetrics(input: {
  points: MetricsPoint[];
  barometerReadings: TimedBarometerReading[];
  source: ElevationSource;
  startedAt: string;
  endedAt: string;
}): ActivityMetrics {
  // Si las lecturas no cubren la actividad, toda la actividad usa GPS (CA-13, RN-3, RN-7).
  const elevationSource: ElevationSource =
    input.source === 'BAROMETER' &&
    barometerCovers(input.barometerReadings, input.startedAt, input.endedAt)
      ? 'BAROMETER'
      : 'GPS';

  const metrics = createLiveMetrics(elevationSource);
  for (const p of input.points) metrics.addPoint(p);
  for (const r of input.barometerReadings) metrics.addBarometerReading(r);

  return {
    distanceMeters: metrics.distanceMeters,
    durationSeconds: durationSeconds(input.startedAt, input.endedAt),
    elevationGainMeters: metrics.elevationGainMeters,
    elevationLossMeters: metrics.elevationLossMeters,
    elevationSource,
  };
}

// Tiempo entre inicio y fin, incluido el tiempo detenido (CA-4, RN-2).
export function durationSeconds(startedAt: string, endedAt: string) {
  const ms = Date.parse(endedAt) - Date.parse(startedAt);
  return Math.max(0, Math.round(ms / 1000));
}

// Ritmo promedio en segundos por kilómetro; null si no hay distancia o duración (CA-5, CA-6).
export function averagePace(distanceMeters: number, durationSeconds: number) {
  if (distanceMeters <= 0 || durationSeconds <= 0) return null;
  return durationSeconds / (distanceMeters / 1000);
}

// Velocidad promedio en km/h; null si no hay distancia o duración (CA-5, CA-6).
export function averageSpeed(distanceMeters: number, durationSeconds: number) {
  if (distanceMeters <= 0 || durationSeconds <= 0) return null;
  return distanceMeters / 1000 / (durationSeconds / 3600);
}
