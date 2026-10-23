import { enlaceInvitacion, generarTokenInvitacion } from './invitation.js';

describe('invitación (spec 008, plan D11)', () => {
  it('el token tiene 43 caracteres base64url, dentro del límite de 64 de Telegram', () => {
    const token = generarTokenInvitacion();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('cada token es distinto', () => {
    const tokens = new Set(
      Array.from({ length: 100 }, () => generarTokenInvitacion()),
    );
    expect(tokens.size).toBe(100);
  });

  it('arma el enlace t.me/<bot>?start=<token>', () => {
    expect(enlaceInvitacion('SendaBCBot', 'abc_-1')).toBe(
      'https://t.me/SendaBCBot?start=abc_-1',
    );
  });

  it('sin bot configurado (TELEGRAM_MODE=log) arma un enlace igual', () => {
    expect(enlaceInvitacion(null, 'abc')).toMatch(
      /^https:\/\/t\.me\/\w+\?start=abc$/,
    );
  });
});
