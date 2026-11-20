import { describe, expect, it } from 'vitest';
import { hasOldPoints, withoutOldPoints } from './oldPoints';

// Mismos casos que backend/src/route/recorrido.spec.ts, `sinPuntosViejos` (spec 011, plan D7).
const START = '2026-11-06T16:00:00.000Z';

const point = (sequence: number, seconds: number) => ({
  sequence,
  recordedAt: new Date(Date.parse(START) + seconds * 1000).toISOString(),
});
const sequences = (points: { sequence: number }[]) => points.map((p) => p.sequence);

describe('withoutOldPoints (spec 007, CA-28, RN-10)', () => {
  it('sin puntos viejos conserva todos', () => {
    const points = [point(1, 5), point(2, 15), point(3, 25)];
    expect(withoutOldPoints(points, START)).toEqual(points);
  });

  it('quita los puntos del principio de más de 30 s antes del inicio', () => {
    const points = [point(1, -1500), point(2, -31), point(3, 5), point(4, 15)];
    expect(sequences(withoutOldPoints(points, START))).toEqual([3, 4]);
  });

  it('acepta un punto justo en el margen', () => {
    const points = [point(1, -30), point(2, 5)];
    expect(sequences(withoutOldPoints(points, START))).toEqual([1, 2]);
  });

  it('solo mira el principio: un punto atrasado a media actividad se queda', () => {
    const points = [point(1, 5), point(2, -100), point(3, 15)];
    expect(sequences(withoutOldPoints(points, START))).toEqual([1, 2, 3]);
  });

  it('con el reloj desfasado conserva todos', () => {
    const points = [point(1, -600), point(2, -590), point(3, -580)];
    expect(withoutOldPoints(points, START)).toEqual(points);
  });

  it('si quedaría un solo punto conserva todos', () => {
    const points = [point(1, -600), point(2, 5)];
    expect(withoutOldPoints(points, START)).toEqual(points);
  });
});

describe('hasOldPoints (spec 011, RN-11)', () => {
  it('solo es verdadero cuando withoutOldPoints quita algo', () => {
    expect(hasOldPoints([point(1, -1500), point(2, 5), point(3, 15)], START)).toBe(true);
    expect(hasOldPoints([point(1, 5), point(2, 15)], START)).toBe(false);
    expect(hasOldPoints([point(1, -600), point(2, 5)], START)).toBe(false);
    expect(hasOldPoints([], START)).toBe(false);
  });
});
