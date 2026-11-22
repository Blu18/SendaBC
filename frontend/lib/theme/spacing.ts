// Espaciado (base 4, más xxs para ajustes finos) y radios: mismos nombres que las colecciones Espaciado y Radio de Figma.
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

// Área mínima de toque en dp (CA-13). Lo más chico lleva hitSlop hasta llegar a esto.
export const touchMin = 48;

export type SpacingTokens = typeof spacing;
export type RadiusTokens = typeof radius;
