import { describe, expect, it } from 'vitest';
import { computeDistance, createDistanceAccumulator, DistancePoint } from './distance';
import { at, gaussian, median, path, rng, seeds, Vertex } from './testing';

const relativeError = (value: number, expected: number) => Math.abs(value - expected) / expected;

// El último tramo que no alcanza el umbral y el retraso del promedio (~2 puntos) no se
// suman: es una pérdida fija de unas decenas de metros por actividad, por eso los
// recorridos de prueba tienen una longitud realista (5 km).
describe('computeDistance — recorrido conocido (CA-7)', () => {
  const loop: Vertex[] = [[0, 0], [1500, 0], [1500, 1000], [0, 1000], [0, 0]];

  it('circuito de 5 km caminando (un punto cada 2.6 m, precisión 10 m): error ≤ 1 %', () => {
    const d = computeDistance(path(loop, 2.6, 10));
    expect(relativeError(d, 5000)).toBeLessThanOrEqual(0.01);
  });

  it('línea recta de 5 km en bici (un punto cada 10 m): error ≤ 1 %', () => {
    const d = computeDistance(path([[0, 0], [0, 5000]], 10, 5, 5));
    expect(relativeError(d, 5000)).toBeLessThanOrEqual(0.01);
  });

  it('pasos más cortos que el umbral también se acumulan', () => {
    // Puntos cada 1 m con precisión 10 m: ninguno supera el umbral solo, pero el total sí.
    const d = computeDistance(path([[0, 0], [5000, 0]], 1, 10));
    expect(relativeError(d, 5000)).toBeLessThanOrEqual(0.01);
  });

  it('límite conocido: en zigzag cerrado subestima, pero menos de 7 %', () => {
    // 50 vueltas de 90° cada ~99 m caminando: el promedio y el umbral recortan las
    // esquinas (plan, Riesgos). Esta prueba fija el límite para que no empeore sin aviso.
    const switchbacks: Vertex[] = Array.from({ length: 51 }, (_, i) => [i % 2 ? 70 : 0, i * 70]);
    const expected = 50 * Math.hypot(70, 70);
    const d = computeDistance(path(switchbacks, 2.6, 10));
    expect(d).toBeLessThan(expected);
    expect(relativeError(d, expected)).toBeLessThan(0.07);
  });
});

describe('computeDistance — precisión (CA-8)', () => {
  it('ignora los puntos con precisión peor que 20 m', () => {
    const clean = path([[0, 0], [0, 1000]], 10);
    const withOutliers = clean.flatMap((p, i) => (i % 10 === 5 ? [p, at(400, i * 10, 50)] : [p]));
    expect(computeDistance(withOutliers)).toBeCloseTo(computeDistance(clean), 6);
  });

  it('acepta precisión de exactamente 20 m y puntos sin precisión', () => {
    expect(computeDistance(path([[0, 0], [0, 1000]], 10, 20))).toBeGreaterThan(900);
    const noAccuracy = path([[0, 0], [0, 5000]], 10).map((p) => ({ ...p, accuracy: null }));
    expect(relativeError(computeDistance(noAccuracy), 5000)).toBeLessThanOrEqual(0.01);
  });

  it('solo puntos imprecisos → 0', () => {
    expect(computeDistance(path([[0, 0], [0, 1000]], 10, 25))).toBe(0);
  });
});

describe('computeDistance — teléfono quieto 5 minutos (CA-9)', () => {
  const ACCURACY = 10;
  const POINTS = 150; // uno cada 2 s

  // Error que se mueve despacio alrededor del sitio, como el GPS real con el teléfono quieto.
  function drifting(seed: number) {
    const random = rng(seed);
    let dx = 0;
    let dy = 0;
    return Array.from({ length: POINTS }, (_, i) => {
      dx = 0.9 * dx + 0.2 * ACCURACY * gaussian(random);
      dy = 0.9 * dy + 0.2 * ACCURACY * gaussian(random);
      return at(dx, dy, ACCURACY, 2 * i);
    });
  }

  // Error independiente en cada lectura, con 68 % de los puntos dentro de su precisión
  // (así la reporta Android). Es más brusco que el GPS real: caso pesimista.
  function independent(seed: number) {
    const random = rng(seed);
    const sigma = ACCURACY / 1.515;
    return Array.from({ length: POINTS }, (_, i) =>
      at(sigma * gaussian(random), sigma * gaussian(random), ACCURACY, 2 * i),
    );
  }

  it('con error que deriva despacio suma menos de 20 m', () => {
    for (const seed of seeds(50)) expect(computeDistance(drifting(seed))).toBeLessThan(20);
  });

  it('con error independiente por lectura, la mediana suma menos de 20 m', () => {
    const totals = seeds(50).map((seed) => computeDistance(independent(seed)));
    expect(median(totals)).toBeLessThan(20);
  });
});

describe('computeDistance — saltos de ubicación imposibles (CA-25)', () => {
  // Ubicación por defecto del emulador de Android (Mountain View, California).
  const mountainView: DistancePoint = {
    latitude: 37.422,
    longitude: -122.0841,
    accuracy: 5,
    recordedAt: '2026-10-05T14:59:58.000Z',
  };

  it('un primer punto de otro lugar no suma: el recorrido continúa desde el punto nuevo', () => {
    const walk = path([[0, 0], [0, 500]], 2.6);
    const d = computeDistance([mountainView, ...walk]);
    expect(d).toBeCloseTo(computeDistance(walk), 6);
    expect(d).toBeLessThan(500);
  });

  it('un brinco aislado de 500 m a mitad del recorrido pierde menos de 20 m', () => {
    const walk = path([[0, 0], [0, 1000]], 2.6);
    const middle = walk[200];
    const spike = { ...at(500, 520), recordedAt: middle.recordedAt };
    const withSpike = [...walk.slice(0, 200), spike, ...walk.slice(200)];
    const loss = computeDistance(walk) - computeDistance(withSpike);
    expect(loss).toBeGreaterThanOrEqual(0);
    expect(loss).toBeLessThan(20);
  });

  it('una bajada rápida en bici (25 m/s) sí cuenta', () => {
    // Un punto cada 2 s (50 m); 20 km para que el retraso fijo del promedio (~100 m) no pese.
    const d = computeDistance(path([[0, 0], [0, 20_000]], 50, 5, 25));
    expect(relativeError(d, 20_000)).toBeLessThanOrEqual(0.01);
  });

  it('puntos con la misma hora no fallan (se toma 1 s como mínimo)', () => {
    const sameTime = path([[0, 0], [0, 1000]], 10).map((p) => ({
      ...p,
      recordedAt: mountainView.recordedAt,
    }));
    expect(Number.isFinite(computeDistance(sameTime))).toBe(true);
  });
});

describe('computeDistance — casos límite (CA-17)', () => {
  it('0 puntos → 0', () => {
    expect(computeDistance([])).toBe(0);
  });

  it('1 punto → 0', () => {
    expect(computeDistance([at(0, 0)])).toBe(0);
  });
});

describe('createDistanceAccumulator', () => {
  it('da lo mismo agregando punto a punto que con computeDistance, y nunca decrece', () => {
    const points = path([[0, 0], [250, 0], [250, 400]], 3, 8);
    const acc = createDistanceAccumulator();
    const partials = points.map((p) => {
      acc.add(p);
      return acc.value;
    });
    expect(acc.value).toBe(computeDistance(points));
    for (let i = 1; i < partials.length; i++) {
      expect(partials[i]).toBeGreaterThanOrEqual(partials[i - 1]);
    }
  });
});
