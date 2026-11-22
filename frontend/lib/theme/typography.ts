import type { TextStyle } from 'react-native';

// Atkinson Hyperlegible Next (plan D3). Los nombres son los que registra el
// plugin de expo-font a partir de los archivos de assets/fonts/ (T10).
export const fontFamilies = {
  regular: 'AtkinsonHyperlegibleNext-Regular',
  semibold: 'AtkinsonHyperlegibleNext-SemiBold',
  bold: 'AtkinsonHyperlegibleNext-Bold',
} as const;

export type TypographyTokens = {
  caption: TextStyle;
  bodySmall: TextStyle;
  body: TextStyle;
  title: TextStyle;
  headline: TextStyle;
  display: TextStyle;
  metric: TextStyle;
  metricHero: TextStyle;
};

// Escala tipográfica: mismos nombres y valores que los estilos de texto de Figma.
export const typography: TypographyTokens = {
  caption: { fontFamily: fontFamilies.regular, fontSize: 12, lineHeight: 16 },
  bodySmall: { fontFamily: fontFamilies.regular, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 24 },
  title: { fontFamily: fontFamilies.semibold, fontSize: 20, lineHeight: 28 },
  headline: { fontFamily: fontFamilies.bold, fontSize: 24, lineHeight: 32 },
  display: { fontFamily: fontFamilies.bold, fontSize: 32, lineHeight: 40 },
  // Solo distancia, tiempo y elevación en la grabación (CA-12). Cifras de ancho fijo (R3).
  metric: {
    fontFamily: fontFamilies.bold,
    fontSize: 48,
    lineHeight: 56,
    fontVariant: ['tabular-nums'],
  },
  // Solo la distancia del resumen de actividad (spec 014): la cifra principal de la pantalla.
  metricHero: {
    fontFamily: fontFamilies.bold,
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
};
