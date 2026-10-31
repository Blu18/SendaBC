// Espaciado (base 4) y radios: mismos nombres que las colecciones Espaciado y Radio de Figma.
export const spacing = {
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

// Sombra/Flotante de Figma: la del aviso flotante (Notice). Es igual en los dos modos.
export const shadows = {
  floating: { boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.1)' },
} as const;

export type SpacingTokens = typeof spacing;
export type RadiusTokens = typeof radius;
export type ShadowTokens = typeof shadows;
