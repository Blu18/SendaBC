import { darkColors, lightColors, type ColorTokens } from './colors';
import { radius, spacing, touchMin, type RadiusTokens, type SpacingTokens } from './spacing';
import { typography, type TypographyTokens } from './typography';

export type ColorScheme = 'light' | 'dark';

export type Theme = {
  scheme: ColorScheme;
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  touchMin: number;
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  typography,
  spacing,
  radius,
  touchMin,
};

export const darkTheme: Theme = {
  ...lightTheme,
  scheme: 'dark',
  colors: darkColors,
};

export { colors, darkColors, lightColors, type ColorTokens } from './colors';
export { fontFamilies, typography, type TypographyTokens } from './typography';
export { radius, spacing, touchMin } from './spacing';
