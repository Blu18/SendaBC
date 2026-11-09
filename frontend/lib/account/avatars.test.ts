import { describe, expect, it } from 'vitest';
import { AVATAR_IDS, AVATAR_POR_DEFECTO, AVATARS, avatarDe } from './avatars';

describe('avatares (spec 011, CA-42, RN-15)', () => {
  // Debe coincidir con backend/src/user/avatars.ts (plan, D4).
  it('fija los 8 ids del backend, en orden', () => {
    expect(AVATAR_IDS).toEqual([
      'montana',
      'pino',
      'cactus',
      'sol',
      'ola',
      'senderismo',
      'trail',
      'bici',
    ]);
  });

  it('hay un avatar por id, en el mismo orden y con su ícono', () => {
    expect(AVATARS.map((a) => a.id)).toEqual([...AVATAR_IDS]);
    expect(AVATARS.map((a) => a.icon)).toEqual([
      'image-filter-hdr',
      'pine-tree',
      'cactus',
      'white-balance-sunny',
      'waves',
      'hiking',
      'run',
      'bike',
    ]);
  });

  it('avatarDe devuelve el elegido', () => {
    expect(avatarDe('cactus')).toMatchObject({ id: 'cactus', icon: 'cactus' });
  });

  it.each([null, undefined, 'desconocido'])('sin avatar o con uno desconocido (%s) usa el de por defecto', (id) => {
    expect(avatarDe(id)).toBe(AVATAR_POR_DEFECTO);
  });
});
