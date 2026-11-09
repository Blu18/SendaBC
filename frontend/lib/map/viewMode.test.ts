import { describe, expect, it } from 'vitest';
import { batteryTestDe, etiquetaDeVista, siguienteVista, type MapViewMode } from './viewMode';

describe('siguienteVista (spec 011, CA-8, RN-7)', () => {
  it('sin la prueba de batería solo alterna 3D y 2D: "Sin mapa" nunca aparece', () => {
    const vistas = new Set<MapViewMode>();
    let v: MapViewMode = '3D';
    for (let i = 0; i < 6; i++) {
      v = siguienteVista(v, false);
      vistas.add(v);
    }
    expect([...vistas].sort()).toEqual(['2D', '3D']);
  });

  it('con la prueba de batería pasa por 3D, 2D y Sin mapa', () => {
    expect(siguienteVista('3D', true)).toBe('2D');
    expect(siguienteVista('2D', true)).toBe('none');
    expect(siguienteVista('none', true)).toBe('3D');
  });

  it('si se quedó en Sin mapa sin la prueba, vuelve a 3D', () => {
    expect(siguienteVista('none', false)).toBe('3D');
  });
});

describe('batteryTestDe', () => {
  it('solo "1" la activa', () => {
    expect(batteryTestDe('1')).toBe(true);
    expect(batteryTestDe(undefined)).toBe(false);
    expect(batteryTestDe('')).toBe(false);
    expect(batteryTestDe('0')).toBe(false);
    expect(batteryTestDe('true')).toBe(false);
  });
});

describe('etiquetaDeVista', () => {
  it('nombra cada vista', () => {
    expect(etiquetaDeVista('3D')).toBe('3D');
    expect(etiquetaDeVista('2D')).toBe('2D');
    expect(etiquetaDeVista('none')).toBe('Sin mapa');
  });
});
