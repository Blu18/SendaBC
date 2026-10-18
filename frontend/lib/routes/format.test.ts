import { describe, expect, it } from 'vitest';
import { DIFFICULTY_LABELS, formatDistanceFromUser, TYPE_FILTER_OPTIONS } from './format';

describe('DIFFICULTY_LABELS (CA-7)', () => {
  it('nombra las cuatro dificultades en español', () => {
    expect(DIFFICULTY_LABELS).toEqual({
      EASY: 'Fácil',
      MODERATE: 'Moderada',
      HARD: 'Difícil',
      EXTREME: 'Extrema',
    });
  });
});

describe('TYPE_FILTER_OPTIONS (CA-12)', () => {
  it('empieza con "Todas" y sigue con los tres tipos', () => {
    expect(TYPE_FILTER_OPTIONS.map((o) => o.label)).toEqual([
      'Todas',
      'Senderismo',
      'Trail running',
      'Ciclismo',
    ]);
    expect(TYPE_FILTER_OPTIONS[0].value).toBeNull();
  });
});

describe('formatDistanceFromUser (CA-7, RN-4)', () => {
  it('usa el formato de distancia del resumen', () => {
    expect(formatDistanceFromUser(640.4)).toBe('A 640 m de ti');
    expect(formatDistanceFromUser(3421)).toBe('A 3.42 km de ti');
  });

  it('sin ubicación no hay texto (CA-14)', () => {
    expect(formatDistanceFromUser(null)).toBeNull();
  });
});
