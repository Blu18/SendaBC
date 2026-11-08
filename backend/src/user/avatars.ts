// Avatares predefinidos (spec 011, RN-15; plan, D4). La lista se repite en
// frontend/lib/account/avatars.ts, y una prueba de cada lado fija los mismos valores.
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
