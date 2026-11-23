import { describe, expect, it } from 'vitest';
import { darkTheme, lightTheme } from './index';
import { makeShadows, SHADOW_LAYERS } from './shadows';

describe('sombras del tema (spec 014, RN-11, D8, D11)', () => {
  const levels = Object.keys(SHADOW_LAYERS) as (keyof typeof SHADOW_LAYERS)[];

  it('los tres niveles existen en los dos temas', () => {
    expect(levels.sort()).toEqual(['bar', 'low', 'medium']);
    for (const theme of [lightTheme, darkTheme]) {
      for (const level of levels) expect(theme.shadows[level].boxShadow).toMatch(/^0px /);
    }
  });

  it('cada tema usa el color de sombra de su modo', () => {
    for (const theme of [lightTheme, darkTheme]) {
      for (const level of levels) {
        const capas = theme.shadows[level].boxShadow.split(/,\s*(?=0px)/);
        expect(capas).toHaveLength(SHADOW_LAYERS[level].length);
        for (const capa of capas) expect(capa.endsWith(theme.colors.shadow)).toBe(true);
      }
    }
    expect(lightTheme.colors.shadow).not.toBe(darkTheme.colors.shadow);
  });

  it('en oscuro la sombra es más opaca que en claro', () => {
    const alpha = (c: string) => Number(/,\s*([\d.]+)\)$/.exec(c)?.[1]);
    expect(alpha(darkTheme.colors.shadow)).toBeGreaterThan(alpha(lightTheme.colors.shadow));
  });

  it('arma las capas de Figma: desplazamiento, desenfoque y extensión', () => {
    expect(makeShadows({ shadow: 'red' })).toEqual({
      low: { boxShadow: '0px 1px 2px 0px red, 0px 2px 8px -2px red' },
      medium: { boxShadow: '0px 2px 4px -1px red, 0px 8px 24px -4px red' },
      bar: { boxShadow: '0px -2px 12px 0px red' },
    });
  });
});
