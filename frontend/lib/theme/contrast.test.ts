import { describe, expect, it } from 'vitest';
import { darkColors, lightColors } from './colors';
import { blend, CONTRAST_PAIRS, contrastRatio, pairName, pairRatio } from './contrast';

// Razones (claro, oscuro) de la tabla de contraste del archivo de Figma (T3).
const FIGMA_TABLE: Record<string, [number, number]> = {
  'text / background': [11.94, 14.39],
  'text / surface': [13.18, 12.51],
  'textMuted / background': [8.1, 8.35],
  'textMuted / surface': [8.93, 7.26],
  'primary / background': [4.78, 8.21],
  'primary / surface': [5.27, 7.14],
  'onPrimary / primary': [5.75, 8.21],
  'onPrimary / error': [6.54, 10.14],
  'secondaryText / background': [4.67, 7.95],
  'secondaryText / surface': [5.15, 6.91],
  'secondary / background': [3.28, 7.95],
  'data / background': [4.79, 7.87],
  'data / surface': [5.28, 6.84],
  'alert / background': [4.25, 6.25],
  // Agregado en T17 (cuenta regresiva de "¿Estás bien?" sobre la hoja): falta la fila en Figma.
  'alert / surface': [4.69, 5.43],
  'onAlert / alert': [5.12, 6.25],
  'error / background': [5.43, 10.14],
  'error / surface': [6.0, 8.81],
  'border / background': [3.31, 4.16],
  'border / surface': [3.65, 3.61],
  'data / surface + 10 % data': [4.62, 5.67],
  'text / surface + 10 % data': [11.54, 10.36],
  'text / surface + 10 % textMuted': [11.22, 10.26],
  'error / surface + 10 % error': [5.11, 7.05],
  'text / surface + 10 % error': [11.23, 10.01],
  // Spec 014: etiqueta de logro del resumen.
  'text / background + 18 % secondary': [9.91, 10.18],
};

describe('contrastRatio', () => {
  it('negro sobre blanco es 21:1 y es simétrica', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFF', '#000')).toBeCloseTo(21, 5);
  });

  it('un color contra sí mismo es 1:1', () => {
    expect(contrastRatio('#5C6B49', '#5C6B49')).toBe(1);
  });

  it('primary sobre background claro mide 4.78:1', () => {
    expect(contrastRatio('#5C6B49', '#EDEAE1')).toBeCloseTo(4.78, 2);
  });

  it('rechaza un color no válido', () => {
    expect(() => contrastRatio('rojo', '#FFFFFF')).toThrow();
  });
});

describe('blend', () => {
  it('mezcla el color encima según su opacidad', () => {
    expect(blend('#FFFFFF', '#000000', 0)).toBe('#FFFFFF');
    expect(blend('#FFFFFF', '#000000', 1)).toBe('#000000');
    expect(blend('#FFFFFF', '#000000', 0.5)).toBe('#808080');
  });
});

describe('CONTRAST_PAIRS', () => {
  it('son los mismos pares que la tabla de contraste de Figma', () => {
    expect(CONTRAST_PAIRS.map(pairName).sort()).toEqual(Object.keys(FIGMA_TABLE).sort());
  });

  it.each(CONTRAST_PAIRS.map((p) => [pairName(p), p] as const))(
    'cada par cumple su mínimo en claro y oscuro: %s',
    (_, pair) => {
      expect(pairRatio(pair, lightColors)).toBeGreaterThanOrEqual(pair.min);
      expect(pairRatio(pair, darkColors)).toBeGreaterThanOrEqual(pair.min);
    },
  );

  it.each(CONTRAST_PAIRS.map((p) => [pairName(p), p] as const))(
    'la razón coincide con la de Figma: %s',
    (name, pair) => {
      const [light, dark] = FIGMA_TABLE[name];
      expect(pairRatio(pair, lightColors)).toBeCloseTo(light, 1);
      expect(pairRatio(pair, darkColors)).toBeCloseTo(dark, 1);
    },
  );
});
