import { describe, expect, it } from 'vitest';
import { at, path } from '../metrics/testing';
import { bearingDegrees, computeHeading, createHeading, MIN_HEADING_STEP_M } from './heading';

describe('bearingDegrees', () => {
  const origen = at(0, 0);

  it.each([
    ['norte', 0, 100, 0],
    ['este', 100, 0, 90],
    ['sur', 0, -100, 180],
    ['oeste', -100, 0, 270],
    ['noreste', 100, 100, 45],
  ])('hacia el %s', (_nombre, east, north, esperado) => {
    expect(bearingDegrees(origen, at(east, north))).toBeCloseTo(esperado, 0);
  });

  it('siempre queda entre 0 y menos de 360', () => {
    const rumbo = bearingDegrees(origen, at(-1, 100));
    expect(rumbo).toBeGreaterThanOrEqual(0);
    expect(rumbo).toBeLessThan(360);
  });
});

describe('createHeading — dirección de avance (spec 010, CA-3)', () => {
  it('sin avance todavía no hay rumbo', () => {
    expect(computeHeading([])).toBeNull();
    expect(computeHeading([at(0, 0)])).toBeNull();
  });

  it('necesita la distancia mínima para dar un rumbo', () => {
    expect(computeHeading([at(0, 0, 5, 0), at(MIN_HEADING_STEP_M - 1, 0, 5, 10)])).toBeNull();
    expect(computeHeading([at(0, 0, 5, 0), at(MIN_HEADING_STEP_M + 1, 0, 5, 10)])).toBeCloseTo(90, 0);
  });

  it('sigue el recorrido al girar', () => {
    const heading = createHeading();
    path([[0, 0], [0, 100]], 20).forEach((p) => heading.add(p));
    expect(heading.value).toBeCloseTo(0, 0);
    path([[0, 100], [100, 100]], 20).forEach((p) => heading.add(p));
    expect(heading.value).toBeCloseTo(90, 0);
  });

  it('acumula pasos cortos hasta la distancia mínima', () => {
    expect(computeHeading(path([[0, 0], [0, 30]], 3))).toBeCloseTo(0, 0);
  });

  it('conserva el último rumbo al detenerse, aunque el GPS titubee', () => {
    const heading = createHeading();
    path([[0, 0], [100, 0]], 20).forEach((p) => heading.add(p));
    for (let s = 0; s < 20; s++) heading.add(at(100 + (s % 2) * 3, (s % 3) * 2, 5, 100 + s * 2));
    expect(heading.value).toBeCloseTo(90, 0);
  });
});

describe('createHeading — mismas reglas que el trazo (spec 010, RN-3)', () => {
  it('ignora los puntos imprecisos', () => {
    const rumbo = computeHeading([at(0, 0, 5, 0), at(0, 50, 5, 40), at(500, 50, 21, 50)]);
    expect(rumbo).toBeCloseTo(0, 0);
  });

  it('un salto no cambia el rumbo: vuelve a medir desde el punto nuevo', () => {
    const heading = createHeading();
    [at(0, 0, 5, 0), at(0, 50, 5, 40), at(50_000, 50, 5, 50)].forEach((p) => heading.add(p));
    expect(heading.value).toBeCloseTo(0, 0);
    heading.add(at(50_020, 50, 5, 70));
    expect(heading.value).toBeCloseTo(90, 0);
  });
});
