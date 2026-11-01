import { darkColors, lightColors, type ColorTokens } from './colors';
import {
  radius,
  shadows,
  spacing,
  touchMin,
  type RadiusTokens,
  type ShadowTokens,
  type SpacingTokens,
} from './spacing';
import { typography, type TypographyTokens } from './typography';

export type ColorScheme = 'light' | 'dark';

export type Theme = {
  scheme: ColorScheme;
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  touchMin: number;
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  typography,
  spacing,
  radius,
  shadows,
  touchMin,
};

export const darkTheme: Theme = {
  ...lightTheme,
  scheme: 'dark',
  colors: darkColors,
};

export { darkColors, lightColors, type ColorTokens } from './colors';
export { fontFamilies, typography, type TypographyTokens } from './typography';
export { radius, shadows, spacing, touchMin } from './spacing';
