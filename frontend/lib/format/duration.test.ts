import { describe, expect, it } from 'vitest';
import { formatDuration } from './duration';

describe('formatDuration', () => {
  it('usa mm:ss por debajo de una hora', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(754)).toBe('12:34');
  });

  it('usa hh:mm:ss a partir de una hora', () => {
    expect(formatDuration(3600)).toBe('01:00:00');
    expect(formatDuration(3 * 3600 + 5 * 60 + 9)).toBe('03:05:09');
  });

  it('trunca fracciones y no muestra negativos', () => {
    expect(formatDuration(59.9)).toBe('00:59');
    expect(formatDuration(-5)).toBe('00:00');
  });
});
