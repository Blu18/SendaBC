import { describe, expect, it } from 'vitest';
import { zonaDe } from './region';

// Forma de LocationGeocodedAddress de expo-location 57: todos los campos pueden ser null.
function direccion(campos: {
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
}) {
  return { city: null, subregion: null, region: null, country: 'México', ...campos };
}

describe('zonaDe (spec 007, RN-7, CA-4)', () => {
  it('usa la ciudad', () => {
    expect(
      zonaDe([direccion({ city: 'Ensenada', subregion: 'Ensenada', region: 'Baja California' })])
    ).toBe('Ensenada');
  });

  it('sin ciudad usa la subregión (municipio) y luego la región (estado)', () => {
    expect(zonaDe([direccion({ subregion: 'Tecate', region: 'Baja California' })])).toBe('Tecate');
    expect(zonaDe([direccion({ region: 'Baja California' })])).toBe('Baja California');
  });

  it('salta valores vacíos o solo con espacios y recorta los extremos', () => {
    expect(zonaDe([direccion({ city: '   ', subregion: '  Mexicali ' })])).toBe('Mexicali');
  });

  it('si la primera dirección no trae datos, usa la siguiente', () => {
    expect(zonaDe([direccion({}), direccion({ city: 'Rosarito' })])).toBe('Rosarito');
  });

  it('recorta a 40 caracteres sin dejar espacios al final', () => {
    const larga = `${'a'.repeat(39)} y algo más`;
    expect(zonaDe([direccion({ city: larga })])).toBe('a'.repeat(39));
    expect(zonaDe([direccion({ city: 'b'.repeat(45) })])).toBe('b'.repeat(40));
  });

  it('sin datos devuelve una cadena vacía', () => {
    expect(zonaDe([])).toBe('');
    expect(zonaDe([direccion({})])).toBe('');
    expect(zonaDe(null)).toBe('');
    expect(zonaDe(undefined)).toBe('');
  });
});
