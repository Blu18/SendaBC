import { describe, expect, it } from 'vitest';
import { cambiosDePerfil, MENSAJE_NOMBRE_CORTO, validarNombre } from './profile';

describe('validarNombre (spec 011, CA-41; spec 001, RN-4)', () => {
  it('acepta 5 caracteres o más sin contar los espacios de los extremos', () => {
    expect(validarNombre('Ana Luz')).toBeNull();
    expect(validarNombre('  12345  ')).toBeNull();
  });

  it('rechaza menos de 5 con el mensaje del servidor', () => {
    expect(validarNombre('  Ana  ')).toBe(MENSAJE_NOMBRE_CORTO);
    expect(validarNombre('')).toBe(MENSAJE_NOMBRE_CORTO);
    expect(MENSAJE_NOMBRE_CORTO).toBe('El nombre visible debe tener al menos 5 caracteres');
  });
});

describe('cambiosDePerfil (spec 011, CA-41, CA-42)', () => {
  const guardado = { displayName: 'Ana Luz', avatarId: 'pino' };

  it('sin cambios no hay nada que guardar', () => {
    expect(cambiosDePerfil(guardado, ' Ana Luz ', 'pino')).toEqual({});
  });

  it('solo envía el nombre recortado si cambió', () => {
    expect(cambiosDePerfil(guardado, '  Ana María ', 'pino')).toEqual({ displayName: 'Ana María' });
  });

  it('solo envía el avatar si cambió, incluido quitarlo (RN-15)', () => {
    expect(cambiosDePerfil(guardado, 'Ana Luz', 'sol')).toEqual({ avatarId: 'sol' });
    expect(cambiosDePerfil(guardado, 'Ana Luz', null)).toEqual({ avatarId: null });
    expect(cambiosDePerfil({ displayName: 'Ana Luz', avatarId: null }, 'Ana Luz', null)).toEqual({});
  });
});
