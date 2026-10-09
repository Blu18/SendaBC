import { describe, expect, it } from 'vitest';
import { BARO_NOISE_M, GPS_NOISE_M } from './constants';
import { computeElevation, createElevationAccumulator, pressureToAltitude } from './elevation';
import { gaussian, median, rng, seeds } from './testing';

// `count` lecturas iguales a `altitude`.
const flat = (altitude: number, count = 10) => Array<number>(count).fill(altitude);

// Rampa de `from` a `to` con `count` lecturas después de la inicial.
const ramp = (from: number, to: number, count: number) =>
  Array.from({ length: count + 1 }, (_, i) => from + ((to - from) * i) / count);

// Subida de `height` m y bajada al punto de inicio, con `count` lecturas (1 por segundo
// con barómetro, 1 cada 2 s con GPS).
const hill = (height: number, count: number) => [
  ...ramp(0, height, count / 2),
  ...ramp(height, 0, count / 2).slice(1),
];

describe('pressureToAltitude', () => {
  it('la presión estándar al nivel del mar es altitud 0', () => {
    expect(pressureToAltitude(1013.25)).toBe(0);
  });

  it('coincide con la atmósfera estándar ISA (±1 m)', () => {
    expect(pressureToAltitude(1000)).toBeCloseTo(110.9, 0);
    expect(pressureToAltitude(900)).toBeCloseTo(988.5, 0);
  });

  it('1 hPa cerca del nivel del mar equivale a ~8.3 m', () => {
    const diff = pressureToAltitude(1012.25) - pressureToAltitude(1013.25);
    expect(diff).toBeCloseTo(8.33, 1);
  });

  it('a menor presión, mayor altitud', () => {
    expect(pressureToAltitude(850)).toBeGreaterThan(pressureToAltitude(851));
  });
});

describe('computeElevation — ganancia y pérdida (CA-10)', () => {
  it('escalones conocidos dan ganancia y pérdida exactas', () => {
    const altitudes = [...flat(0), ...flat(100), ...flat(40), ...flat(70)];
    for (const threshold of [BARO_NOISE_M, GPS_NOISE_M]) {
      const { gain, loss } = computeElevation(altitudes, threshold);
      expect(gain).toBeCloseTo(130, 6);
      expect(loss).toBeCloseTo(60, 6);
    }
  });

  it('subir y bajar lo mismo da ganancia y pérdida iguales, no se restan', () => {
    const { gain, loss } = computeElevation([...flat(0), ...flat(100), ...flat(0)], GPS_NOISE_M);
    expect(gain).toBeCloseTo(100, 6);
    expect(loss).toBeCloseTo(100, 6);
  });

  it('una rampa se cuenta completa, salvo el retraso del promedio (2 lecturas)', () => {
    const { gain, loss } = computeElevation(ramp(0, 200, 400), GPS_NOISE_M);
    expect(gain).toBeLessThanOrEqual(200);
    expect(gain).toBeGreaterThanOrEqual(200 - 2 * 0.5);
    expect(loss).toBe(0);
  });
});

describe('computeElevation — ruido (CA-11)', () => {
  const alternating = (amplitude: number, count = 600) =>
    Array.from({ length: count }, (_, i) => (i % 2 ? -amplitude : amplitude));

  it('oscilaciones de ±2 m con umbral de barómetro (3 m) → 0 / 0', () => {
    expect(computeElevation(alternating(2), BARO_NOISE_M)).toEqual({ gain: 0, loss: 0 });
  });

  it('oscilaciones de ±8 m con umbral de GPS (10 m) → 0 / 0', () => {
    expect(computeElevation(alternating(8), GPS_NOISE_M)).toEqual({ gain: 0, loss: 0 });
  });

  it('barómetro quieto 30 min con ruido (σ 0.7 m, como en Android) → 0 / 0', () => {
    for (const seed of seeds(50)) {
      const random = rng(seed);
      const altitudes = Array.from({ length: 1800 }, () => 0.7 * gaussian(random));
      expect(computeElevation(altitudes, BARO_NOISE_M)).toEqual({ gain: 0, loss: 0 });
    }
  });

  it('GPS quieto 30 min con error independiente por lectura (σ 4 m) → mediana 0', () => {
    const gains = seeds(50).map((seed) => {
      const random = rng(seed);
      const altitudes = Array.from({ length: 900 }, () => 4 * gaussian(random));
      return computeElevation(altitudes, GPS_NOISE_M).gain;
    });
    expect(median(gains)).toBe(0);
  });

  it('subida y bajada de 200 m con ruido GPS (σ 4 m) → cerca de 200 / 200', () => {
    const results = seeds(50).map((seed) => {
      const random = rng(seed);
      const altitudes = hill(200, 900).map((a) => a + 4 * gaussian(random));
      return computeElevation(altitudes, GPS_NOISE_M);
    });
    expect(Math.abs(median(results.map((r) => r.gain)) - 200)).toBeLessThan(20);
    expect(Math.abs(median(results.map((r) => r.loss)) - 200)).toBeLessThan(20);
  });

  it('sierra de 6 cumbres de 50 m: cada cumbre cuenta completa (≥ 95 %)', () => {
    const sierra = Array.from({ length: 6 }, () => hill(50, 150)).flat();
    for (const threshold of [BARO_NOISE_M, GPS_NOISE_M]) {
      const { gain, loss } = computeElevation(sierra, threshold);
      expect(gain).toBeLessThanOrEqual(300);
      expect(gain).toBeGreaterThanOrEqual(300 * 0.95);
      expect(loss).toBeGreaterThanOrEqual(300 * 0.95);
    }
  });

  it('límite conocido: lomas de 20 m con GPS quedan cortas, pero menos de 15 %', () => {
    // 20 lomas de 20 m (el doble del umbral GPS): el promedio aplana un poco cada cumbre
    // (plan, Riesgos). Fija el límite para que no empeore sin aviso.
    const hills = Array.from({ length: 20 }, () => hill(20, 90)).flat();
    const { gain } = computeElevation(hills, GPS_NOISE_M);
    expect(gain).toBeLessThanOrEqual(400);
    expect(gain).toBeGreaterThan(400 * 0.85);
  });
});

describe('computeElevation — casos límite (CA-17)', () => {
  it('lista vacía → 0 / 0', () => {
    expect(computeElevation([], GPS_NOISE_M)).toEqual({ gain: 0, loss: 0 });
  });

  it('una lectura → 0 / 0', () => {
    expect(computeElevation([312], GPS_NOISE_M)).toEqual({ gain: 0, loss: 0 });
  });

  it('las altitudes null se ignoran', () => {
    const altitudes = [...flat(0), null, ...flat(100), null];
    expect(computeElevation(altitudes, GPS_NOISE_M)).toEqual(
      computeElevation([...flat(0), ...flat(100)], GPS_NOISE_M),
    );
  });
});

describe('createElevationAccumulator', () => {
  it('da lo mismo agregando lectura a lectura que con computeElevation', () => {
    const random = rng(7);
    const altitudes = hill(120, 600).map((a) => a + 2 * gaussian(random));
    const acc = createElevationAccumulator(BARO_NOISE_M);
    for (const a of altitudes) acc.add(a);
    expect({ gain: acc.gain, loss: acc.loss }).toEqual(computeElevation(altitudes, BARO_NOISE_M));
  });

  it('en vivo, la ganancia y la pérdida nunca decrecen', () => {
    const random = rng(11);
    const altitudes = Array.from({ length: 4 }, () => hill(40, 300))
      .flat()
      .map((a) => a + 4 * gaussian(random));
    const acc = createElevationAccumulator(GPS_NOISE_M);
    let previous = { gain: 0, loss: 0 };
    for (const a of altitudes) {
      acc.add(a);
      expect(acc.gain).toBeGreaterThanOrEqual(previous.gain);
      expect(acc.loss).toBeGreaterThanOrEqual(previous.loss);
      previous = { gain: acc.gain, loss: acc.loss };
    }
  });
});
