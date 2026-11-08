import { AVATAR_IDS } from './avatars.js';

describe('AVATAR_IDS (spec 011, RN-15)', () => {
  // Debe coincidir con frontend/lib/account/avatars.ts (plan, D4).
  it('fija los 8 avatares elegidos, en orden', () => {
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
});
