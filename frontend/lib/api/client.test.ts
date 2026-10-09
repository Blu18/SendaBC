import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, setUnauthorizedHandler } from './client';

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
    setUnauthorizedHandler(null);
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

describe('apiFetch y el 401 de sesión (spec 002, CA-5)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  it('avisa al manejador si una petición con token responde 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));

    const response = await apiFetch('/user/profile', 'token-expirado');

    expect(response.status).toBe(401);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('no avisa si la petición no lleva token (401 del login por credenciales)', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));

    await apiFetch('/auth/login', null, { method: 'POST' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('no avisa con otras respuestas', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));

    await apiFetch('/user/profile', 'token');

    expect(handler).not.toHaveBeenCalled();
  });
});
