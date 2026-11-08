import type { ColorTokens } from '../theme/colors';

// Avatares predefinidos (spec 011, RN-15; plan, D4). Los ids se repiten en
// backend/src/user/avatars.ts, y una prueba de cada lado fija los mismos valores.
export const AVATAR_IDS = [
  'montana',
  'pino',
  'cactus',
  'sol',
  'ola',
  'senderismo',
  'trail',
  'bici',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

// Nombres de MaterialCommunityIcons. Se escriben aquí, sin importar @expo/vector-icons, para que
// este archivo se pruebe con Vitest sin React Native (constitución 6.1).
export type AvatarIcon =
  | 'image-filter-hdr'
  | 'pine-tree'
  | 'cactus'
  | 'white-balance-sunny'
  | 'waves'
  | 'hiking'
  | 'run'
  | 'bike'
  | 'account-outline';

export type Avatar = {
  id: AvatarId | null; // null: sin avatar elegido
  icon: AvatarIcon;
  color: keyof ColorTokens; // un token del tema, así funciona en claro y oscuro
  label: string; // para el lector de pantalla
};

export const AVATARS: readonly Avatar[] = [
  { id: 'montana', icon: 'image-filter-hdr', color: 'primary', label: 'Montaña' },
  { id: 'pino', icon: 'pine-tree', color: 'primary', label: 'Pino' },
  { id: 'cactus', icon: 'cactus', color: 'secondary', label: 'Cactus' },
  { id: 'sol', icon: 'white-balance-sunny', color: 'secondary', label: 'Sol' },
  { id: 'ola', icon: 'waves', color: 'data', label: 'Ola' },
  { id: 'senderismo', icon: 'hiking', color: 'primary', label: 'Senderismo' },
  { id: 'trail', icon: 'run', color: 'secondary', label: 'Trail running' },
  { id: 'bici', icon: 'bike', color: 'data', label: 'Bicicleta' },
];

// Sin avatar elegido se muestra el ícono por defecto (RN-15).
export const AVATAR_POR_DEFECTO: Avatar = {
  id: null,
  icon: 'account-outline',
  color: 'textMuted',
  label: 'Sin avatar',
};

// Avatar de un perfil. Un id desconocido (por ejemplo, de una versión más nueva) usa el de
// por defecto en lugar de fallar.
export function avatarDe(id: string | null | undefined): Avatar {
  return AVATARS.find((a) => a.id === id) ?? AVATAR_POR_DEFECTO;
}
