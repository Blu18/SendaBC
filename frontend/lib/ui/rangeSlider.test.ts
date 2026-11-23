import { describe, expect, it } from 'vitest';
import { fractionOf, moveThumb, stepThumb, valueAtFraction } from './rangeSlider';

const limits = { min: 3000, max: 55000 };
const STEP = 500;

describe('fractionOf y valueAtFraction (spec 015, plan D4)', () => {
  it('ubica los valores en el riel', () => {
    expect(fractionOf(3000, limits)).toBe(0);
    expect(fractionOf(55000, limits)).toBe(1);
    expect(fractionOf(29000, limits)).toBeCloseTo(0.5, 6);
    expect(fractionOf(99000, limits)).toBe(1);
  });

  it('con límites iguales no divide entre cero', () => {
    expect(fractionOf(5000, { min: 5000, max: 5000 })).toBe(0);
  });

  it('ajusta la posición al paso y a los límites', () => {
    expect(valueAtFraction(0, limits, STEP)).toBe(3000);
    expect(valueAtFraction(1, limits, STEP)).toBe(55000);
    expect(valueAtFraction(0.5, limits, STEP)).toBe(29000);
    expect(valueAtFraction(0.0405, limits, STEP)).toBe(5000); // 5106 m → 5000
    expect(valueAtFraction(-0.2, limits, STEP)).toBe(3000);
    expect(valueAtFraction(1.3, limits, STEP)).toBe(55000);
  });
});

describe('moveThumb y stepThumb', () => {
  const range = { min: 5000, max: 20000 };

  it('los extremos no se cruzan', () => {
    expect(moveThumb(range, 'min', 25000, limits)).toEqual({ min: 20000, max: 20000 });
    expect(moveThumb(range, 'max', 1000, limits)).toEqual({ min: 5000, max: 5000 });
  });

  it('no salen de los límites', () => {
    expect(moveThumb(range, 'min', 0, limits)).toEqual({ min: 3000, max: 20000 });
    expect(moveThumb(range, 'max', 90000, limits)).toEqual({ min: 5000, max: 55000 });
  });

  it('un paso arriba o abajo, como los gestos de ajuste de TalkBack', () => {
    expect(stepThumb(range, 'min', 1, STEP, limits)).toEqual({ min: 5500, max: 20000 });
    expect(stepThumb(range, 'max', -1, STEP, limits)).toEqual({ min: 5000, max: 19500 });
    expect(stepThumb({ min: 3000, max: 4000 }, 'min', -1, STEP, limits)).toEqual({ min: 3000, max: 4000 });
  });
});
