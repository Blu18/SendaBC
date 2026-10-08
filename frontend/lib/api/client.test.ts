import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './client';

// fetch que no responde nunca, salvo que se aborte su signal (servidor inalcanzable).
function fetchColgado() {
  return vi.fn((_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }),
  );
}

describe('apiFetch (spec 001, M4)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborta la petición si no hay respuesta dentro de timeoutMs', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchColgado());

    const peticion = apiFetch('/user', null, { method: 'POST' }, 10_000);
    const resultado = expect(peticion).rejects.toThrow('Aborted');
    await vi.advanceTimersByTimeAsync(10_000);
    await resultado;
  });

  it('sin timeoutMs no agrega signal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/user/profile', 'token');

    expect(fetchMock.mock.calls[0][1].signal).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token');
  });
});
