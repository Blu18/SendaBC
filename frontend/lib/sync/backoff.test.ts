import { describe, expect, it } from 'vitest';
import { RETRY_MAX_MS, retryDelayMs } from './backoff';

describe('retryDelayMs (spec 005, CA-9)', () => {
  it('sigue la secuencia 30 s, 1 min, 2 min, 4 min, 8 min y se queda en 15 min', () => {
    const segundos = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => retryDelayMs(n) / 1000);

    expect(segundos).toEqual([30, 60, 120, 240, 480, 900, 900, 900]);
  });

  it('no tiene límite de intentos: muchos fallos siguen en 15 min', () => {
    expect(retryDelayMs(1000)).toBe(RETRY_MAX_MS);
  });

  it('valores negativos o fraccionarios se tratan con seguridad', () => {
    expect(retryDelayMs(-3)).toBe(30_000);
    expect(retryDelayMs(1.9)).toBe(60_000);
    expect(retryDelayMs(NaN)).toBe(30_000);
    expect(retryDelayMs(Infinity)).toBe(30_000);
  });
});
