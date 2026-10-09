import { describe, expect, it } from 'vitest';
import { computeDistance } from './distance';
import { pressureToAltitude } from './elevation';
import {
  averagePace,
  averageSpeed,
  BarometerReading,
  computeActivityMetrics,
  createLiveMetrics,
  MetricsPoint,
} from './summary';
import { gaussian, path, rng } from './testing';

const START = '2026-10-05T15:00:00.000Z';
const END = '2026-10-05T16:02:03.000Z'; // 1 h 2 min 3 s

// Recorrido de 1 km hacia el norte con la altitud que diga `altitude(i)`.
const walk = (altitude: (i: number) => number | null, accuracy = 5): MetricsPoint[] =>
  path([[0, 0], [0, 1000]], 2.6, accuracy).map((p, i) => ({ ...p, altitude: altitude(i) }));

const relative = (altitudes: number[]): BarometerReading[] =>
  altitudes.map((a) => ({ pressureHpa: 1000, relativeAltitudeM: a }));

const pressures = (hpa: number[]): BarometerReading[] =>
  hpa.map((p) => ({ pressureHpa: p, relativeAltitudeM: null }));

const ramp = (from: number, to: number, count: number) =>
  Array.from({ length: count + 1 }, (_, i) => from + ((to - from) * i) / count);

const metrics = (input: Partial<Parameters<typeof computeActivityMetrics>[0]>) =>
  computeActivityMetrics({
    points: [],
    barometerReadings: [],
    source: 'GPS',
    startedAt: START,
    endedAt: END,
    ...input,
  });

describe('duración (CA-4)', () => {
  it('es endedAt − startedAt en segundos', () => {
    expect(metrics({}).durationSeconds).toBe(3723);
  });

  it('redondea al segundo y nunca es negativa', () => {
    expect(metrics({ endedAt: '2026-10-05T15:00:10.600Z' }).durationSeconds).toBe(11);
    expect(metrics({ endedAt: '2026-10-05T14:59:00.000Z' }).durationSeconds).toBe(0);
  });
});

describe('fuente de la elevación (CA-12, CA-13, RN-3)', () => {
  // GPS dice que todo es plano; el barómetro, que se subieron 50 m.
  const points = walk(() => 0);

  it('con barómetro en iOS usa la altitud relativa', () => {
    const m = metrics({ points, source: 'BAROMETER', barometerReadings: relative(ramp(0, 50, 600)) });
    expect(m.elevationSource).toBe('BAROMETER');
    expect(m.elevationGainMeters).toBeCloseTo(50, 0);
    expect(m.elevationLossMeters).toBe(0);
  });

  it('con barómetro en Android usa la presión', () => {
    const readings = pressures(ramp(1013.25, 1000, 600));
    const expected = pressureToAltitude(1000) - pressureToAltitude(1013.25); // ≈ 111 m
    const m = metrics({ points, source: 'BAROMETER', barometerReadings: readings });
    expect(m.elevationSource).toBe('BAROMETER');
    expect(m.elevationGainMeters).toBeCloseTo(expected, 0);
  });

  it('con menos de 2 lecturas, toda la actividad usa GPS', () => {
    const climbing = walk((i) => i * 0.2); // ~77 m de subida según GPS
    for (const barometerReadings of [[], relative([0])]) {
      const m = metrics({ points: climbing, source: 'BAROMETER', barometerReadings });
      expect(m.elevationSource).toBe('GPS');
      expect(m.elevationGainMeters).toBeGreaterThan(70);
    }
  });

  it('con fuente GPS ignora las lecturas del barómetro', () => {
    const m = metrics({ points, source: 'GPS', barometerReadings: relative(ramp(0, 50, 600)) });
    expect(m.elevationSource).toBe('GPS');
    expect(m.elevationGainMeters).toBe(0);
  });

  it('con GPS ignora la altitud de los puntos con precisión peor que 20 m', () => {
    const spiky = walk(() => 0).map((p, i) =>
      i % 20 === 10 ? { ...p, accuracy: 35, altitude: 500 } : p,
    );
    const m = metrics({ points: spiky, source: 'GPS' });
    expect(m.elevationGainMeters).toBe(0);
    expect(m.elevationLossMeters).toBe(0);
  });
});

describe('ritmo y velocidad (CA-5, CA-6)', () => {
  it('ritmo: 5 km en 62 min 30 s → 750 s/km (12:30 /km)', () => {
    expect(averagePace(5000, 3750)).toBe(750);
  });

  it('velocidad: 9.2 km en 30 min → 18.4 km/h', () => {
    expect(averageSpeed(9200, 1800)).toBeCloseTo(18.4, 10);
  });

  it('con distancia 0 son null', () => {
    expect(averagePace(0, 600)).toBeNull();
    expect(averageSpeed(0, 600)).toBeNull();
  });

  it('con duración 0 son null', () => {
    expect(averagePace(100, 0)).toBeNull();
    expect(averageSpeed(100, 0)).toBeNull();
  });
});

describe('casos límite (CA-17)', () => {
  it.each([
    ['0 puntos', []],
    ['1 punto', walk(() => 100).slice(0, 1)],
  ])('%s → distancia y elevación 0, ritmo y velocidad null', (_, points) => {
    const m = metrics({ points });
    expect(m).toMatchObject({ distanceMeters: 0, elevationGainMeters: 0, elevationLossMeters: 0 });
    expect(averagePace(m.distanceMeters, m.durationSeconds)).toBeNull();
    expect(averageSpeed(m.distanceMeters, m.durationSeconds)).toBeNull();
  });
});

describe('métricas en vivo = resumen (CA-16)', () => {
  it('alimentar el acumulador en vivo da lo mismo que el cálculo final', () => {
    const random = rng(3);
    const points = walk((i) => 20 * Math.sin(i / 40) + 3 * gaussian(random), 8);
    const readings = relative(points.map((_, i) => 20 * Math.sin(i / 40) + 0.5 * gaussian(random)));

    for (const source of ['BAROMETER', 'GPS'] as const) {
      // En vivo los puntos GPS y las lecturas del barómetro llegan intercalados.
      const live = createLiveMetrics(source);
      points.forEach((p, i) => {
        live.addPoint(p);
        live.addBarometerReading(readings[i]);
      });

      const final = metrics({ points, barometerReadings: readings, source });
      expect(live.distanceMeters).toBe(final.distanceMeters);
      expect(live.elevationGainMeters).toBe(final.elevationGainMeters);
      expect(live.elevationLossMeters).toBe(final.elevationLossMeters);
      expect(final.distanceMeters).toBe(computeDistance(points));
    }
  });
});

describe('rendimiento', () => {
  it('3 h de actividad (5 400 puntos + 10 800 lecturas) se calculan en menos de 100 ms', () => {
    const random = rng(5);
    const points = path([[0, 0], [6000, 0], [6000, 4000]], 1.85, 8).map((p, i) => ({
      ...p,
      altitude: i / 20 + 3 * gaussian(random),
    }));
    const readings = pressures(
      Array.from({ length: 10_800 }, (_, i) => 1000 - i / 400 + 0.05 * gaussian(random)),
    );
    expect(points.length).toBeGreaterThanOrEqual(5_400);

    const input = { points, barometerReadings: readings, source: 'BAROMETER' as const };
    metrics(input); // calentamiento del JIT
    const t0 = performance.now();
    metrics(input);
    expect(performance.now() - t0).toBeLessThan(100);
  });
});
