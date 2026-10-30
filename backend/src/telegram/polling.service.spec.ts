import { PollingService, POLLING_TIMEOUT_S } from './polling.service.js';
import type { TelegramConfig, TelegramMode } from './telegram.config.js';
import type { UpdatesService } from './updates.service.js';

function config(mode: TelegramMode): TelegramConfig {
  return {
    mode,
    botToken: '123:abc',
    botUsername: 'SendaBCBot',
    webhookSecret: null,
  };
}

function respuesta(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function montar(mode: TelegramMode = 'polling') {
  const updates = { atender: vi.fn().mockResolvedValue('vinculado') };
  const service = new PollingService(
    config(mode),
    updates as unknown as UpdatesService,
  );
  const fetchFn = vi.fn();
  service.fetchFn = fetchFn as unknown as typeof fetch;
  return { service, updates, fetchFn };
}

function bodyDe(fetchFn: ReturnType<typeof vi.fn>, llamada: number) {
  const [url, init] = fetchFn.mock.calls[llamada] as [string, RequestInit];
  return { url, body: JSON.parse(init.body as string) };
}

describe('PollingService (spec 008, T5, plan D12)', () => {
  it('llama a getUpdates con el offset, atiende cada update y avanza el offset', async () => {
    const { service, updates, fetchFn } = montar();
    const u1 = { update_id: 10, message: { text: 'a' } };
    const u2 = { update_id: 11, message: { text: 'b' } };
    fetchFn
      .mockResolvedValueOnce(respuesta({ ok: true, result: [u1, u2] }))
      .mockResolvedValueOnce(respuesta({ ok: true, result: [] }));

    expect(await service.consultarUnaVez()).toBe(true);
    expect(await service.consultarUnaVez()).toBe(true);

    const primera = bodyDe(fetchFn, 0);
    expect(primera.url).toBe('https://api.telegram.org/bot123:abc/getUpdates');
    expect(primera.body).toEqual({
      offset: 0,
      timeout: POLLING_TIMEOUT_S,
      allowed_updates: ['message'],
    });
    expect(updates.atender.mock.calls).toEqual([[u1], [u2]]);
    expect(bodyDe(fetchFn, 1).body.offset).toBe(12);
  });

  it('un update que falla no detiene a los demás ni se repite', async () => {
    const { service, updates, fetchFn } = montar();
    updates.atender
      .mockRejectedValueOnce(new Error('caída'))
      .mockResolvedValueOnce('explicacion');
    fetchFn
      .mockResolvedValueOnce(
        respuesta({ ok: true, result: [{ update_id: 1 }, { update_id: 2 }] }),
      )
      .mockResolvedValueOnce(respuesta({ ok: true, result: [] }));

    expect(await service.consultarUnaVez()).toBe(true);
    await service.consultarUnaVez();

    expect(updates.atender).toHaveBeenCalledTimes(2);
    expect(bodyDe(fetchFn, 1).body.offset).toBe(3);
  });

  it('sin red o con error de Telegram devuelve false sin lanzar', async () => {
    const { service, fetchFn } = montar();
    fetchFn
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(
        respuesta({
          ok: false,
          description:
            "Conflict: can't use getUpdates method while webhook is active",
        }),
      );

    expect(await service.consultarUnaVez()).toBe(false);
    expect(await service.consultarUnaVez()).toBe(false);
  });

  it('solo consulta con TELEGRAM_MODE=polling', async () => {
    for (const mode of ['log', 'webhook'] as const) {
      const { service, fetchFn } = montar(mode);
      service.onApplicationBootstrap();
      await service.onApplicationShutdown();
      expect(fetchFn).not.toHaveBeenCalled();
    }
  });

  it('con polling consulta al arrancar y se detiene al apagar', async () => {
    const { service, fetchFn } = montar('polling');
    // getUpdates queda abierto hasta que el apagado lo aborta, como el long polling real.
    fetchFn.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal!.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          ),
        ),
    );

    service.onApplicationBootstrap();
    await service.onApplicationShutdown();

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
