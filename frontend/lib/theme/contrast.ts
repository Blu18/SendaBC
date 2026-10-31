import type { ColorTokens } from './colors';

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Color no válido: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

function toHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Luminancia relativa (WCAG 2.1).
function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG 2.1 entre dos colores hex (de 1 a 21). */
export function contrastRatio(a: string, b: string): number {
  return ratio(parseHex(a), parseHex(b));
}

function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Mezcla sin redondear: así mide Figma la tabla de contraste.
function mix(base: Rgb, over: Rgb, alpha: number): Rgb {
  return base.map((v, i) => v * (1 - alpha) + over[i] * alpha) as Rgb;
}

/** Color `over` con opacidad `alpha` encima de `base`, ya mezclado (sRGB, como Figma). */
export function blend(base: string, over: string, alpha: number): string {
  return toHex(mix(parseHex(base), parseHex(over), alpha));
}

type Token = keyof ColorTokens;

export type ContrastPair = {
  fg: Token;
  bg: Token;
  /** Tinte sobre el fondo: el token `tint` al `alpha` encima de `bg` (fondo de Aviso). */
  tint?: { token: Token; alpha: number };
  /** 4.5 para texto normal, 3 para texto grande y elementos gráficos (CA-3). */
  min: 4.5 | 3;
  use: string;
};

const AVISO_TINT = 0.1;

// Pares texto/fondo y gráfico/fondo que usa la app: los de la tabla de contraste de Figma.
export const CONTRAST_PAIRS: ContrastPair[] = [
  { fg: 'text', bg: 'background', min: 4.5, use: 'Texto' },
  { fg: 'text', bg: 'surface', min: 4.5, use: 'Texto en tarjetas' },
  { fg: 'textMuted', bg: 'background', min: 4.5, use: 'Texto secundario' },
  { fg: 'textMuted', bg: 'surface', min: 4.5, use: 'Texto secundario en tarjetas y pestañas' },
  { fg: 'primary', bg: 'background', min: 4.5, use: 'Botón de texto, títulos' },
  { fg: 'primary', bg: 'surface', min: 4.5, use: 'Pestaña activa, campo con foco' },
  { fg: 'onPrimary', bg: 'primary', min: 4.5, use: 'Botón primario' },
  { fg: 'onPrimary', bg: 'error', min: 4.5, use: 'Botón de peligro' },
  { fg: 'secondaryText', bg: 'background', min: 4.5, use: 'Insignia "Pendiente"' },
  { fg: 'secondaryText', bg: 'surface', min: 4.5, use: 'Insignia "Pendiente" en tarjeta' },
  { fg: 'secondary', bg: 'background', min: 3, use: 'Ocre: íconos, acentos, texto grande (RN-4)' },
  { fg: 'data', bg: 'background', min: 4.5, use: 'Métricas' },
  { fg: 'data', bg: 'surface', min: 4.5, use: 'Métricas en tarjeta, aviso Info' },
  { fg: 'alert', bg: 'background', min: 3, use: 'Alerta: texto grande e íconos (RN-4)' },
  { fg: 'onAlert', bg: 'alert', min: 4.5, use: 'Aviso de alerta, "Estoy bien"' },
  { fg: 'error', bg: 'background', min: 4.5, use: 'Mensajes de error' },
  { fg: 'error', bg: 'surface', min: 4.5, use: 'Error en campo' },
  { fg: 'border', bg: 'background', min: 3, use: 'Borde de campo' },
  { fg: 'border', bg: 'surface', min: 3, use: 'Borde de campo sobre surface' },
  { fg: 'data', bg: 'surface', tint: { token: 'data', alpha: AVISO_TINT }, min: 4.5, use: 'Aviso Info: título' },
  { fg: 'text', bg: 'surface', tint: { token: 'data', alpha: AVISO_TINT }, min: 4.5, use: 'Aviso Info: descripción' },
  {
    fg: 'text',
    bg: 'surface',
    tint: { token: 'textMuted', alpha: AVISO_TINT },
    min: 4.5,
    use: 'Aviso Sin conexión: título y descripción',
  },
  { fg: 'error', bg: 'surface', tint: { token: 'error', alpha: AVISO_TINT }, min: 4.5, use: 'Aviso Error: título' },
  { fg: 'text', bg: 'surface', tint: { token: 'error', alpha: AVISO_TINT }, min: 4.5, use: 'Aviso Error: descripción' },
];

/** Nombre del par como en la tabla de Figma, p. ej. "data / surface + 10 % data". */
export function pairName(p: ContrastPair): string {
  const tint = p.tint ? ` + ${Math.round(p.tint.alpha * 100)} % ${p.tint.token}` : '';
  return `${p.fg} / ${p.bg}${tint}`;
}

/** Razón de contraste de un par con la paleta dada. */
export function pairRatio(p: ContrastPair, palette: ColorTokens): number {
  const base = parseHex(palette[p.bg]);
  const bg = p.tint ? mix(base, parseHex(palette[p.tint.token]), p.tint.alpha) : base;
  return ratio(parseHex(palette[p.fg]), bg);
}
