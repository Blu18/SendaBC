import { darkColors, lightColors, type ColorTokens } from './colors';
import { motion, type MotionTokens } from './motion';
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
  motion: MotionTokens;
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  typography,
  spacing,
  radius,
  shadows,
  touchMin,
  motion,
};

export const darkTheme: Theme = {
  ...lightTheme,
  scheme: 'dark',
  colors: darkColors,
};

export { darkColors, lightColors, type ColorTokens } from './colors';
export { MAX_MOTION_MS, motion, type MotionTokens } from './motion';
export { fontFamilies, typography, type TypographyTokens } from './typography';
export { radius, shadows, spacing, touchMin } from './spacing';
