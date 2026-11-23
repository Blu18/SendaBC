import { describe, expect, it } from 'vitest';
import {
  computeDistance,
  contarPuntosValidos,
  createDistanceAccumulator,
  MIN_PUNTOS_VALIDOS,
  EARTH_RADIUS_M,
  type DistancePoint,
} from './distancia.js';

// Mismos casos que frontend/lib/metrics/distance.test.ts (spec 011, plan D7), con las
// utilidades de frontend/lib/metrics/testing.ts. Si cambias uno, cambia el otro.
// Origen en la sierra de Ensenada; los recorridos se definen en metros este/norte.
const ORIGIN = { latitude: 31.87, longitude: -116.6 };
const M_PER_DEG_LAT = (Math.PI * EARTH_RADIUS_M) / 180;
const M_PER_DEG_LON =
  M_PER_DEG_LAT * Math.cos((ORIGIN.latitude * Math.PI) / 180);

const START_MS = Date.parse('2026-10-05T15:00:00.000Z');

// Punto a `east`/`north` metros del origen, registrado `seconds` después del inicio.
export function at(
  east: number,
  north: number,
  accuracy: number | null = 5,
  seconds = 0,
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
export function path(
  vertices: Vertex[],
  step: number,
  accuracy = 5,
  speed = 1.3,
) {
  const points: DistancePoint[] = [at(...vertices[0], accuracy)];
  let meters = 0;
  for (let i = 1; i < vertices.length; i++) {
    const [x0, y0] = vertices[i - 1];
    const [x1, y1] = vertices[i];
    const length = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.round(length / step);
    for (let k = 1; k <= n; k++) {
      const seconds = (meters + (length * k) / n) / speed;
      points.push(
        at(
          x0 + ((x1 - x0) * k) / n,
          y0 + ((y1 - y0) * k) / n,
          accuracy,
          seconds,
        ),
      );
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
  return (
    Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
  );
}

export const seeds = (count: number) =>
  Array.from({ length: count }, (_, i) => i + 1);

export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const relativeError = (value: number, expected: number) =>
  Math.abs(value - expected) / expected;

// El último tramo que no alcanza el umbral y el retraso del promedio (~2 puntos) no se
// suman: es una pérdida fija de unas decenas de metros por actividad, por eso los
// recorridos de prueba tienen una longitud realista (5 km).
describe('computeDistance — recorrido conocido (CA-7)', () => {
  const loop: Vertex[] = [
    [0, 0],
    [1500, 0],
    [1500, 1000],
    [0, 1000],
    [0, 0],
  ];

  it('circuito de 5 km caminando (un punto cada 2.6 m, precisión 10 m): error ≤ 1 %', () => {
    const d = computeDistance(path(loop, 2.6, 10));
    expect(relativeError(d, 5000)).toBeLessThanOrEqual(0.01);
  });

  it('línea recta de 5 km en bici (un punto cada 10 m): error ≤ 1 %', () => {
    const d = computeDistance(
      path(
        [
          [0, 0],
          [0, 5000],
        ],
        10,
        5,
        5,
      ),
    );
    expect(relativeError(d, 5000)).toBeLessThanOrEqual(0.01);
  });

  it('pasos más cortos que el umbral también se acumulan', () => {
    // Puntos cada 1 m con precisión 10 m: ninguno supera el umbral solo, pero el total sí.
    const d = computeDistance(
      path(
        [
          [0, 0],
          [5000, 0],
        ],
        1,
        10,
      ),
    );
    expect(relativeError(d, 5000)).toBeLessThanOrEqual(0.01);
  });

  it('carretera con curvas en carro (un punto cada 10 s a 25 m/s): error ≤ 5 %', () => {
    // Con los puntos a ~200 m, promediar los últimos 5 cortaba las curvas: 8–16 % menos en la
    // prueba de campo de la 011 (F4). Solo se promedian los puntos a 50 m o menos.
    const road: Vertex[] = Array.from({ length: 21 }, (_, i) => [
      i % 2 ? 300 : 0,
      i * 300,
    ]);
    const expected = 20 * Math.hypot(300, 300);
    const d = computeDistance(path(road, 250, 5, 25));
    expect(relativeError(d, expected)).toBeLessThanOrEqual(0.05);
  });

  it('límite conocido: en zigzag cerrado subestima, pero menos de 7 %', () => {
    // 50 vueltas de 90° cada ~99 m caminando: el promedio y el umbral recortan las
    // esquinas (plan, Riesgos). Esta prueba fija el límite para que no empeore sin aviso.
    const switchbacks: Vertex[] = Array.from({ length: 51 }, (_, i) => [
      i % 2 ? 70 : 0,
      i * 70,
    ]);
    const expected = 50 * Math.hypot(70, 70);
    const d = computeDistance(path(switchbacks, 2.6, 10));
    expect(d).toBeLessThan(expected);
    expect(relativeError(d, expected)).toBeLessThan(0.07);
  });
});

describe('computeDistance — precisión (CA-8)', () => {
  it('ignora los puntos con precisión peor que 20 m', () => {
    const clean = path(
      [
        [0, 0],
        [0, 1000],
      ],
      10,
    );
    const withOutliers = clean.flatMap((p, i) =>
      i % 10 === 5 ? [p, at(400, i * 10, 50)] : [p],
    );
    expect(computeDistance(withOutliers)).toBeCloseTo(
      computeDistance(clean),
      6,
    );
  });

  it('acepta precisión de exactamente 20 m y puntos sin precisión', () => {
    expect(
      computeDistance(
        path(
          [
            [0, 0],
            [0, 1000],
          ],
          10,
          20,
        ),
      ),
    ).toBeGreaterThan(900);
    const noAccuracy = path(
      [
        [0, 0],
        [0, 5000],
      ],
      10,
    ).map((p) => ({ ...p, accuracy: null }));
    expect(
      relativeError(computeDistance(noAccuracy), 5000),
    ).toBeLessThanOrEqual(0.01);
  });

  it('solo puntos imprecisos → 0', () => {
    expect(
      computeDistance(
        path(
          [
            [0, 0],
            [0, 1000],
          ],
          10,
          25,
        ),
      ),
    ).toBe(0);
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
    for (const seed of seeds(50))
      expect(computeDistance(drifting(seed))).toBeLessThan(20);
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
    const walk = path(
      [
        [0, 0],
        [0, 500],
      ],
      2.6,
    );
    const d = computeDistance([mountainView, ...walk]);
    expect(d).toBeCloseTo(computeDistance(walk), 6);
    expect(d).toBeLessThan(500);
  });

  it('un brinco aislado de 500 m a mitad del recorrido pierde menos de 20 m', () => {
    const walk = path(
      [
        [0, 0],
        [0, 1000],
      ],
      2.6,
    );
    const middle = walk[200];
    const spike = { ...at(500, 520), recordedAt: middle.recordedAt };
    const withSpike = [...walk.slice(0, 200), spike, ...walk.slice(200)];
    const loss = computeDistance(walk) - computeDistance(withSpike);
    expect(loss).toBeGreaterThanOrEqual(0);
    expect(loss).toBeLessThan(20);
  });

  it('una bajada rápida en bici (25 m/s) sí cuenta', () => {
    // Un punto cada 2 s (50 m); 20 km para que el retraso fijo del promedio (~100 m) no pese.
    const d = computeDistance(
      path(
        [
          [0, 0],
          [0, 20_000],
        ],
        50,
        5,
        25,
      ),
    );
    expect(relativeError(d, 20_000)).toBeLessThanOrEqual(0.01);
  });

  it('puntos con la misma hora no fallan (se toma 1 s como mínimo)', () => {
    const sameTime = path(
      [
        [0, 0],
        [0, 1000],
      ],
      10,
    ).map((p) => ({
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

describe('contarPuntosValidos (spec 012, CA-26)', () => {
  it('el mínimo para guardar es 3', () => {
    expect(MIN_PUNTOS_VALIDOS).toBe(3);
  });

  it('0 puntos → 0', () => {
    expect(contarPuntosValidos([])).toBe(0);
  });

  it('2 puntos válidos → 2, por debajo del mínimo', () => {
    const n = contarPuntosValidos([at(0, 0), at(0, 10)]);
    expect(n).toBe(2);
    expect(n).toBeLessThan(MIN_PUNTOS_VALIDOS);
  });

  it('3 puntos válidos → 3, alcanza el mínimo', () => {
    const n = contarPuntosValidos([at(0, 0), at(0, 10), at(0, 20, 20)]);
    expect(n).toBe(3);
    expect(n).toBeGreaterThanOrEqual(MIN_PUNTOS_VALIDOS);
  });

  it('3 puntos con 1 impreciso → 2', () => {
    expect(contarPuntosValidos([at(0, 0), at(0, 10, 25), at(0, 20)])).toBe(2);
  });

  it('los puntos sin precisión cuentan como válidos', () => {
    expect(
      contarPuntosValidos([at(0, 0, null), at(0, 10, null), at(0, 20, null)]),
    ).toBe(3);
  });

  it('no depende del orden ni de los saltos de ubicación', () => {
    const lejos = { ...at(0, 0), latitude: 37.422, longitude: -122.0841 };
    expect(contarPuntosValidos([at(0, 20), lejos, at(0, 0)])).toBe(3);
  });
});

describe('createDistanceAccumulator', () => {
  it('da lo mismo agregando punto a punto que con computeDistance, y nunca decrece', () => {
    const points = path(
      [
        [0, 0],
        [250, 0],
        [250, 400],
      ],
      3,
      8,
    );
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
