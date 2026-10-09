import { BARO_NOISE_M, GPS_NOISE_M, MAX_ACCURACY_M } from './constants';
import { createDistanceAccumulator, DistancePoint } from './distance';
import { createElevationAccumulator, pressureToAltitude } from './elevation';

export type ElevationSource = 'BAROMETER' | 'GPS';

export type MetricsPoint = DistancePoint & { altitude: number | null };

export type BarometerReading = {
  pressureHpa: number;
  relativeAltitudeM: number | null; // solo iOS
};

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

// Métricas finales de una actividad a partir de lo guardado en el teléfono (RN-4).
// `points` y `barometerReadings` van en el orden en que se registraron.
export function computeActivityMetrics(input: {
  points: MetricsPoint[];
  barometerReadings: BarometerReading[];
  source: ElevationSource;
  startedAt: string;
  endedAt: string;
}): ActivityMetrics {
  // Con menos de 2 lecturas no hay diferencias que medir: toda la actividad usa GPS.
  const elevationSource: ElevationSource =
    input.source === 'BAROMETER' && input.barometerReadings.length >= 2 ? 'BAROMETER' : 'GPS';

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
