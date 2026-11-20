import { normalizarEmail } from './normalizar-email.js';

describe('normalizarEmail (spec 001, RN-1)', () => {
  it('quita espacios y pasa a minúsculas', () => {
    expect(normalizarEmail('  Ana.Lopez@Senda.BC \n')).toBe(
      'ana.lopez@senda.bc',
    );
  });

  it('un correo ya normalizado no cambia', () => {
    expect(normalizarEmail('ana@senda.bc')).toBe('ana@senda.bc');
  });
});
