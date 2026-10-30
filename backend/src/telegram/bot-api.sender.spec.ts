import { describe, expect, it, vi } from 'vitest';
import { BotApiTelegramSender } from './bot-api.sender.js';
import { CONTACTO_BLOQUEO } from './telegram.sender.js';

const TOKEN = '123:abc';

function respuesta(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function emisorCon(fetchFn: ReturnType<typeof vi.fn>) {
  return new BotApiTelegramSender(TOKEN, fetchFn as unknown as typeof fetch);
}

function llamada(fetchFn: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
  return { url, init, body: JSON.parse(init.body as string) };
}

describe('BotApiTelegramSender (spec 008, T2)', () => {
  it('sendMessage llama a la Bot API con el token, HTML y el chat (CA-6, CA-14)', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        respuesta(200, { ok: true, result: { message_id: 77 } }),
      );

    const result = await emisorCon(fetchFn).sendMessage(
      4_503_599_627_370_495n,
      '<b>Hola</b>',
    );

    expect(result).toEqual({ ok: true, messageId: 77 });
    const { url, init, body } = llamada(fetchFn);
    expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(body).toEqual({
      chat_id: 4_503_599_627_370_495,
      text: '<b>Hola</b>',
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  });

  it('sendLocation manda latitud y longitud', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        respuesta(200, { ok: true, result: { message_id: 8 } }),
      );

    const result = await emisorCon(fetchFn).sendLocation(42n, 32.5, -116.9);

    expect(result).toEqual({ ok: true, messageId: 8 });
    const { url, body } = llamada(fetchFn);
    expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/sendLocation`);
    expect(body).toEqual({ chat_id: 42, latitude: 32.5, longitude: -116.9 });
  });

  it('un 403 de Telegram es blocked, con el motivo en español (CA-7)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      respuesta(403, {
        ok: false,
        error_code: 403,
        description: 'Forbidden: bot was blocked by the user',
      }),
    );

    const result = await emisorCon(fetchFn).sendMessage(42n, 'Hola');

    expect(result).toEqual({
      ok: false,
      blocked: true,
      error: CONTACTO_BLOQUEO,
    });
  });

  it('otro error de Telegram falla sin blocked e incluye el código', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      respuesta(400, {
        ok: false,
        error_code: 400,
        description: 'Bad Request: chat not found',
      }),
    );

    const result = await emisorCon(fetchFn).sendMessage(42n, 'Hola');

    expect(result).toEqual({
      ok: false,
      error: 'Telegram respondió 400: Bad Request: chat not found',
    });
  });

  it('una respuesta que no es JSON no rompe el envío', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response('Bad Gateway', { status: 502 }));

    const result = await emisorCon(fetchFn).sendMessage(42n, 'Hola');

    expect(result).toEqual({ ok: false, error: 'Telegram respondió 502' });
  });

  it('sin red devuelve un fallo en español, sin lanzar', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    const result = await emisorCon(fetchFn).sendMessage(42n, 'Hola');

    expect(result).toEqual({
      ok: false,
      error: 'No se pudo conectar con Telegram',
    });
  });

  it('con el tiempo agotado devuelve un fallo en español', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValue(
        new DOMException('The operation timed out', 'TimeoutError'),
      );

    const result = await emisorCon(fetchFn).sendLocation(42n, 32.5, -116.9);

    expect(result).toEqual({
      ok: false,
      error: 'Telegram tardó demasiado en responder',
    });
  });
});
