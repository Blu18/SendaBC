import type { ColorTokens } from './colors';

// Sombras del sistema de diseño (spec 014, RN-11, RN-13; plan D8, D11). Equivalen a los estilos
// de efecto de Figma y se arman por modo con `colors.shadow`, porque en oscuro la sombra necesita
// más opacidad para notarse.
//
// - low (Sombra/baja): tarjetas y listas agrupadas sobre el fondo.
// - medium (Sombra/media): lo que flota sobre el mapa o sobre otro contenido.
// - bar (Sombra/barra): barras fijas de abajo; la sombra va hacia arriba, en lugar del borde.
//
// Cada nivel es un estilo para mezclar con `...t.shadows.low`. Usa `boxShadow`, que React Native
// dibuja con color, desplazamiento y desenfoque en Android e iOS (D8).

type ShadowLayer = { y: number; blur: number; spread: number };

// Mismas capas que los estilos de efecto de Figma.
export const SHADOW_LAYERS = {
  low: [
    { y: 1, blur: 2, spread: 0 },
    { y: 2, blur: 8, spread: -2 },
  ],
  medium: [
    { y: 2, blur: 4, spread: -1 },
    { y: 8, blur: 24, spread: -4 },
  ],
  bar: [{ y: -2, blur: 12, spread: 0 }],
} as const satisfies Record<string, readonly ShadowLayer[]>;

export type ShadowLevel = keyof typeof SHADOW_LAYERS;
export type ShadowTokens = Record<ShadowLevel, { boxShadow: string }>;

function boxShadow(layers: readonly ShadowLayer[], color: string) {
  return layers.map((l) => `0px ${l.y}px ${l.blur}px ${l.spread}px ${color}`).join(', ');
}

export function makeShadows(colors: Pick<ColorTokens, 'shadow'>): ShadowTokens {
  return {
    low: { boxShadow: boxShadow(SHADOW_LAYERS.low, colors.shadow) },
    medium: { boxShadow: boxShadow(SHADOW_LAYERS.medium, colors.shadow) },
    bar: { boxShadow: boxShadow(SHADOW_LAYERS.bar, colors.shadow) },
  };
}
