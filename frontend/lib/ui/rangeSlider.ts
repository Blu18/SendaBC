import type { Range } from '../activity/filters';

// Cálculos del control deslizante de rango (spec 015, plan D4). Sin React Native, para probarlos
// con Vitest (constitución 6.1). Los valores van en las unidades del filtro (metros).

export type Thumb = 'min' | 'max';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Posición de un valor en el riel, de 0 a 1. Con límites iguales, 0. */
export function fractionOf(value: number, limits: Range): number {
  const span = limits.max - limits.min;
  return span > 0 ? clamp((value - limits.min) / span, 0, 1) : 0;
}

/** El valor en una posición del riel (0 a 1), ajustado al paso y a los límites. */
export function valueAtFraction(fraction: number, limits: Range, step: number): number {
  const raw = limits.min + clamp(fraction, 0, 1) * (limits.max - limits.min);
  const snapped = limits.min + Math.round((raw - limits.min) / step) * step;
  return clamp(snapped, limits.min, limits.max);
}

/** Mueve un extremo a `value` sin que se cruce con el otro ni salga de los límites. */
export function moveThumb(range: Range, thumb: Thumb, value: number, limits: Range): Range {
  if (thumb === 'min') return { min: clamp(value, limits.min, range.max), max: range.max };
  return { min: range.min, max: clamp(value, range.min, limits.max) };
}

/** Sube o baja un extremo un paso: los gestos de ajuste de TalkBack (spec 015, NF de accesibilidad). */
export function stepThumb(range: Range, thumb: Thumb, direction: 1 | -1, step: number, limits: Range): Range {
  return moveThumb(range, thumb, range[thumb] + direction * step, limits);
}
