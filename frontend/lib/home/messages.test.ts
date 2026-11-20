import { describe, expect, it } from 'vitest';
import { HOME_MESSAGES, pendingTitle } from './messages';

describe('pendingTitle (spec 013, CA-19)', () => {
  it('sin pendientes no hay aviso', () => {
    expect(pendingTitle(0)).toBeNull();
    expect(pendingTitle(-1)).toBeNull();
  });

  it('singular y plural', () => {
    expect(pendingTitle(1)).toBe('1 actividad sin subir');
    expect(pendingTitle(2)).toBe('2 actividades sin subir');
  });
});

describe('HOME_MESSAGES', () => {
  it('la atribución nombra a Mapbox y OpenStreetMap (T15)', () => {
    expect(HOME_MESSAGES.attribution).toContain('Mapbox');
    expect(HOME_MESSAGES.attribution).toContain('OpenStreetMap');
  });
});
