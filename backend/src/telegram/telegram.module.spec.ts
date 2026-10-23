import { describe, expect, it } from 'vitest';
import { BotApiTelegramSender } from './bot-api.sender.js';
import { LogTelegramSender } from './log.sender.js';
import { leerConfigTelegram } from './telegram.config.js';
import { crearEmisor } from './telegram.module.js';
import { CONTACTO_BLOQUEO } from './telegram.sender.js';

const BOT = {
  TELEGRAM_BOT_TOKEN: '123:abc',
  TELEGRAM_BOT_USERNAME: 'SendaBCBot',
};

describe('leerConfigTelegram (spec 008, T2)', () => {
  it('usa log por omisión fuera de producción', () => {
    expect(leerConfigTelegram({ NODE_ENV: 'development' })).toEqual({
      mode: 'log',
      botToken: null,
      botUsername: null,
      webhookSecret: null,
    });
  });

  it('usa webhook por omisión en producción y exige el secreto', () => {
    expect(() =>
      leerConfigTelegram({ NODE_ENV: 'production', ...BOT }),
    ).toThrow('TELEGRAM_WEBHOOK_SECRET');
    expect(
      leerConfigTelegram({
        NODE_ENV: 'production',
        ...BOT,
        TELEGRAM_WEBHOOK_SECRET: 's3cr3t',
      }).mode,
    ).toBe('webhook');
  });

  it('polling exige el token y el usuario del bot', () => {
    expect(() =>
      leerConfigTelegram({
        TELEGRAM_MODE: 'polling',
        TELEGRAM_BOT_USERNAME: 'SendaBCBot',
      }),
    ).toThrow('TELEGRAM_BOT_TOKEN');
    expect(
      leerConfigTelegram({ TELEGRAM_MODE: 'polling', ...BOT }),
    ).toMatchObject({
      mode: 'polling',
      botToken: '123:abc',
      botUsername: 'SendaBCBot',
    });
  });

  it('rechaza un modo desconocido', () => {
    expect(() => leerConfigTelegram({ TELEGRAM_MODE: 'whatsapp' })).toThrow(
      'TELEGRAM_MODE debe ser log, polling o webhook',
    );
  });
});

describe('crearEmisor (spec 008, T2)', () => {
  it('con log usa el emisor que solo registra', () => {
    expect(crearEmisor(leerConfigTelegram({}))).toBeInstanceOf(
      LogTelegramSender,
    );
  });

  it('con polling usa la Bot API', () => {
    expect(
      crearEmisor(leerConfigTelegram({ TELEGRAM_MODE: 'polling', ...BOT })),
    ).toBeInstanceOf(BotApiTelegramSender);
  });
});

describe('LogTelegramSender (spec 008, T2)', () => {
  it('registra lo enviado con id de mensaje creciente, sin llamar a Telegram', async () => {
    const emisor = new LogTelegramSender();

    expect(await emisor.sendMessage(1n, 'Hola')).toEqual({
      ok: true,
      messageId: 1,
    });
    expect(await emisor.sendLocation(1n, 32.5, -116.9)).toEqual({
      ok: true,
      messageId: 2,
    });
    expect(emisor.sent).toEqual([
      { method: 'sendMessage', chatId: 1n, html: 'Hola' },
      { method: 'sendLocation', chatId: 1n, lat: 32.5, lng: -116.9 },
    ]);
  });

  it('simula un contacto que bloqueó al bot (CA-7)', async () => {
    const emisor = new LogTelegramSender();
    emisor.blockedChats.add(9n);

    expect(await emisor.sendMessage(9n, 'Hola')).toEqual({
      ok: false,
      blocked: true,
      error: CONTACTO_BLOQUEO,
    });
    expect(emisor.sent).toEqual([]);
  });
});
