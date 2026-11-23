import { describe, expect, it } from 'vitest';
import { at } from './testing';
import { countValidPoints, debeGuardarse, MIN_VALID_POINTS } from './validPoints';

// Mismos casos que backend/src/activity/distancia.spec.ts, `contarPuntosValidos`
// (spec 012, plan D1). Si cambias uno, cambia el otro.
describe('countValidPoints (spec 012, RN-1)', () => {
  it('el mínimo para guardar es 3', () => {
    expect(MIN_VALID_POINTS).toBe(3);
  });

  it('0 puntos → 0', () => {
    expect(countValidPoints([])).toBe(0);
  });

  it('2 puntos válidos → 2, por debajo del mínimo', () => {
    const n = countValidPoints([at(0, 0), at(0, 10)]);
    expect(n).toBe(2);
    expect(n).toBeLessThan(MIN_VALID_POINTS);
  });

  it('3 puntos válidos → 3, alcanza el mínimo', () => {
    const n = countValidPoints([at(0, 0), at(0, 10), at(0, 20, 20)]);
    expect(n).toBe(3);
    expect(n).toBeGreaterThanOrEqual(MIN_VALID_POINTS);
  });

  it('3 puntos con 1 impreciso → 2', () => {
    expect(countValidPoints([at(0, 0), at(0, 10, 25), at(0, 20)])).toBe(2);
  });

  it('los puntos sin precisión cuentan como válidos', () => {
    expect(countValidPoints([at(0, 0, null), at(0, 10, null), at(0, 20, null)])).toBe(3);
  });

  it('no depende del orden ni de los saltos de ubicación', () => {
    const lejos = { ...at(0, 0), latitude: 37.422, longitude: -122.0841 };
    expect(countValidPoints([at(0, 20), lejos, at(0, 0)])).toBe(3);
  });
});

describe('debeGuardarse (spec 012, RN-2)', () => {
  it('con 0, 1 o 2 puntos válidos se descarta (CA-17, CA-21, CA-22)', () => {
    for (const n of [0, 1, 2]) expect(debeGuardarse(n)).toBe(false);
  });

  it('con 3 o más se guarda (CA-20)', () => {
    for (const n of [3, 4, 5400]) expect(debeGuardarse(n)).toBe(true);
  });

  it('no importa cuántos puntos inválidos haya: cuenta solo los válidos', () => {
    const points = [at(0, 0), at(0, 10), ...Array.from({ length: 50 }, () => at(0, 20, 80))];
    expect(debeGuardarse(countValidPoints(points))).toBe(false);
  });
});
