import { describe, expect, it } from 'vitest';
import { activityProfile, MAX_PROFILE_POINTS } from './profile';
import type { MetricsPoint, TimedBarometerReading } from './summary';
import { gaussian, path, rng } from './testing';

// Caminata de 2 km hacia el este, un punto cada 20 m (~15 s). La altitud sube de 500 m a una
// cumbre de 600 m a la mitad y baja otra vez a 500 m.
const LENGTH_M = 2000;
const trueAltitude = (east: number) => 500 + 100 * Math.sin((Math.PI * east) / LENGTH_M);

function walk(altitudeOf: (east: number, i: number) => number | null = trueAltitude, step = 20): MetricsPoint[] {
  return path([[0, 0], [LENGTH_M, 0]], step).map((p, i) => ({ ...p, altitude: altitudeOf(i * step, i) }));
}

// Presión que daría `altitude` en la atmósfera estándar (la inversa de pressureToAltitude).
const pressureFor = (altitude: number) => 1013.25 * (1 - altitude / 44330) ** (1 / 0.1903);

// Una lectura del barómetro cada 5 s durante toda la caminata, a la altitud real más `bias`
// (la presión del día). La hora es la del punto más cercano, como en el teléfono.
function barometer(points: MetricsPoint[], bias: number, relative = false): TimedBarometerReading[] {
  const start = Date.parse(points[0].recordedAt);
  const end = Date.parse(points[points.length - 1].recordedAt);
  const readings: TimedBarometerReading[] = [];
  for (let t = start; t <= end; t += 5000) {
    const east = (LENGTH_M * (t - start)) / (end - start);
    const altitude = trueAltitude(east) + bias;
    readings.push({
      recordedAt: new Date(t).toISOString(),
      pressureHpa: pressureFor(altitude),
      relativeAltitudeM: relative ? altitude - 500 : null,
    });
  }
  return readings;
}

describe('activityProfile', () => {
  it('con GPS: perfil de inicio a fin y cumbre conocida (CA-4, CA-5, CA-6)', () => {
    const profile = activityProfile({ points: walk(), barometerReadings: [], source: 'GPS' })!;
    expect(profile.fuente).toBe('GPS');
    expect(profile.perfil[0][0]).toBe(0);
    expect(profile.perfil[profile.perfil.length - 1][0]).toBeGreaterThan(LENGTH_M * 0.97);
    expect(profile.cumbre.altitudM).toBeGreaterThan(598);
    expect(profile.cumbre.altitudM).toBeLessThanOrEqual(600);
    // El promedio móvil retrasa un poco la cumbre: como máximo dos puntos (40 m).
    expect(Math.abs(profile.cumbre.distanciaM - LENGTH_M / 2)).toBeLessThan(80);
  });

  it('la distancia del eje coincide con la de un recorrido con ruido de GPS', () => {
    const random = rng(7);
    const points = walk().map((p) => ({ ...p, altitude: p.altitude! + 3 * gaussian(random) }));
    const profile = activityProfile({ points, barometerReadings: [], source: 'GPS' })!;
    const ultimo = profile.perfil[profile.perfil.length - 1];
    expect(ultimo[0]).toBeGreaterThan(LENGTH_M * 0.97);
    expect(ultimo[0]).toBeLessThan(LENGTH_M * 1.01);
  });

  it('ignora la altitud de los puntos imprecisos', () => {
    const points = walk().map((p, i) => (i % 10 === 5 ? { ...p, accuracy: 60, altitude: 2000 } : p));
    const profile = activityProfile({ points, barometerReadings: [], source: 'GPS' })!;
    expect(profile.cumbre.altitudM).toBeLessThanOrEqual(600);
  });

  it('un pico aislado no llega a ser la cumbre (RN-5)', () => {
    // Un solo punto 150 m arriba, lejos de la cumbre real.
    const points = walk((east, i) => (i === 20 ? trueAltitude(east) + 150 : trueAltitude(east)));
    const profile = activityProfile({ points, barometerReadings: [], source: 'GPS' })!;
    expect(profile.cumbre.altitudM).toBeLessThanOrEqual(600);
    expect(Math.abs(profile.cumbre.distanciaM - LENGTH_M / 2)).toBeLessThan(80);
  });

  it('con barómetro: la forma del barómetro anclada a la altitud GPS (plan, D2)', () => {
    // El barómetro marca 50 m de más por la presión del día; el GPS tiene ruido pero el nivel real.
    const random = rng(3);
    const points = walk((east) => trueAltitude(east) + 8 * gaussian(random));
    const profile = activityProfile({
      points,
      barometerReadings: barometer(points, 50),
      source: 'BAROMETER',
    })!;
    expect(profile.fuente).toBe('BAROMETER');
    expect(Math.abs(profile.cumbre.altitudM - 600)).toBeLessThan(6);
    expect(Math.abs(profile.cumbre.distanciaM - LENGTH_M / 2)).toBeLessThan(80);
  });

  it('con barómetro y sin altitudes GPS: queda la altitud de la atmósfera estándar', () => {
    const points = walk(() => null);
    const profile = activityProfile({
      points,
      barometerReadings: barometer(points, 50),
      source: 'BAROMETER',
    })!;
    expect(profile.fuente).toBe('BAROMETER');
    expect(Math.abs(profile.cumbre.altitudM - 650)).toBeLessThan(2);
  });

  it('con altitud relativa (iOS) se ancla igual a la altitud GPS', () => {
    const points = walk();
    const profile = activityProfile({
      points,
      barometerReadings: barometer(points, 0, true),
      source: 'BAROMETER',
    })!;
    expect(Math.abs(profile.cumbre.altitudM - 600)).toBeLessThan(2);
  });

  it('de barómetro sin lecturas en el teléfono: usa GPS (plan, D3; RN-10)', () => {
    const profile = activityProfile({ points: walk(), barometerReadings: [], source: 'BAROMETER' })!;
    expect(profile.fuente).toBe('GPS');
    expect(profile.cumbre.altitudM).toBeGreaterThan(598);
  });

  it('con menos de 10 altitudes devuelve null (RN-6, CA-7)', () => {
    const points = walk((east, i) => (i < 9 ? trueAltitude(east) : null));
    expect(activityProfile({ points, barometerReadings: [], source: 'GPS' })).toBeNull();
  });

  it('con menos de 200 m devuelve null (RN-6, CA-7)', () => {
    const points = path([[0, 0], [150, 0]], 5).map((p) => ({ ...p, altitude: 500 }));
    expect(activityProfile({ points, barometerReadings: [], source: 'GPS' })).toBeNull();
  });

  it('sin puntos devuelve null', () => {
    expect(activityProfile({ points: [], barometerReadings: [], source: 'GPS' })).toBeNull();
  });

  it(`muestrea a ${MAX_PROFILE_POINTS} pares como máximo y conserva inicio y fin`, () => {
    const points = walk(trueAltitude, 2); // 1 001 puntos
    const profile = activityProfile({ points, barometerReadings: [], source: 'GPS' })!;
    expect(profile.perfil.length).toBe(MAX_PROFILE_POINTS);
    expect(profile.perfil[0][0]).toBe(0);
    expect(profile.perfil[MAX_PROFILE_POINTS - 1][0]).toBeGreaterThan(LENGTH_M * 0.97);
  });
});
