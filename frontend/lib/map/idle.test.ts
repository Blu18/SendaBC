import { describe, expect, it } from 'vitest';
import { esReposoViejo, STALE_IDLE_MIN_MS } from './idle';

describe('esReposoViejo (spec 006, CA-9; spec 015, CA-15)', () => {
  it('sin encuadre previo, ningún reposo es viejo', () => {
    expect(esReposoViejo(1000, null, 600)).toBe(false);
  });

  it('el reposo que llega durante la animación del encuadre es de la vista anterior', () => {
    // Como en el S9+: el reposo de la vista inicial llegó a 3–5 ms del encuadre.
    expect(esReposoViejo(10_005, 10_000, 600)).toBe(true);
    expect(esReposoViejo(10_599, 10_000, 600)).toBe(true);
  });

  it('el reposo después de la animación cuenta', () => {
    expect(esReposoViejo(10_600, 10_000, 600)).toBe(false);
    expect(esReposoViejo(11_700, 10_000, 600)).toBe(false);
  });

  it('sin animación (movimiento reducido) se ignoran solo los que llegan casi juntos', () => {
    expect(esReposoViejo(10_005, 10_000, 0)).toBe(true);
    expect(esReposoViejo(10_000 + STALE_IDLE_MIN_MS, 10_000, 0)).toBe(false);
  });
});
