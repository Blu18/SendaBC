import { afterEach, describe, expect, it, vi } from 'vitest';
import { setUnauthorizedHandler } from '../api/client';
import { fetchNearbyRoutes, type NearbyRoute } from './api';
import { NEARBY_TIMEOUT_MS } from './constants';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function fetchQueResponde(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ruta: NearbyRoute = {
  id: 'r-1',
  name: 'Cañón de Doña Petra',
  type: 'HIKING',
  difficulty: 'EASY',
  distanceMeters: 1808,
  elevationGainMeters: 120,
  start: { latitude: 31.879, longitude: -116.5905 },
  distanceFromCenterMeters: 1400,
  path: [
    [-116.5905, 31.879],
    [-116.58, 31.892],
  ],
  author: 'SendaBC',
  isMine: false,
};

const busqueda = {
  center: { latitude: 31.8667, longitude: -116.5964 },
  radiusKm: 25,
  type: null,
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe('fetchNearbyRoutes (spec 006)', () => {
  it('pide las rutas con centro, radio y token y devuelve la lista', async () => {
    const fetchMock = fetchQueResponde(json([ruta]));

    const r = await fetchNearbyRoutes('tok', busqueda);

    expect(r).toEqual({ ok: true, data: [ruta] });
    const [url, init] = fetchMock.mock.calls[0];
    const { pathname, searchParams } = new URL(url, 'http://x');
    expect(pathname).toMatch(/\/routes\/nearby$/);
    expect(Object.fromEntries(searchParams)).toEqual({
      lat: '31.8667',
      lng: '-116.5964',
      radiusKm: '25',
    });
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.signal).toBeDefined(); // lleva límite de tiempo
  });

  it('agrega el tipo solo cuando se filtra (CA-12)', async () => {
    const fetchMock = fetchQueResponde(json([]));

    await fetchNearbyRoutes('tok', { ...busqueda, radiusKm: 100, type: 'CYCLING' });

    const { searchParams } = new URL(fetchMock.mock.calls[0][0], 'http://x');
    expect(searchParams.get('type')).toBe('CYCLING');
    expect(searchParams.get('radiusKm')).toBe('100');
  });

  it('una lista vacía es éxito (CA-13)', async () => {
    fetchQueResponde(json([]));
    expect(await fetchNearbyRoutes('tok', busqueda)).toEqual({ ok: true, data: [] });
  });

  it('un 401 se reporta y avisa para cerrar la sesión (CA-17)', async () => {
    fetchQueResponde(json({ message: 'Unauthorized' }, 401));
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    expect(await fetchNearbyRoutes('tok', busqueda)).toEqual({
      ok: false,
      failure: { status: 401 },
    });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('un 500 se reporta como fallo con su estado (CA-16)', async () => {
    fetchQueResponde(json({ message: 'Internal server error' }, 500));
    expect(await fetchNearbyRoutes('tok', busqueda)).toEqual({
      ok: false,
      failure: { status: 500 },
    });
  });

  it('sin red devuelve el error en lugar de lanzar (CA-15)', async () => {
    const sinRed = new TypeError('Network request failed');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(sinRed));

    expect(await fetchNearbyRoutes('tok', busqueda)).toEqual({
      ok: false,
      failure: { error: sinRed },
    });
  });

  it('si el servidor no responde, se rinde a los 10 s (CA-15, CA-16)', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError'))
            );
          })
      )
    );

    const pendiente = fetchNearbyRoutes('tok', busqueda);
    await vi.advanceTimersByTimeAsync(NEARBY_TIMEOUT_MS);
    const r = await pendiente;

    expect(NEARBY_TIMEOUT_MS).toBe(10_000);
    expect(r.ok).toBe(false);
    expect(!r.ok && 'error' in r.failure && (r.failure.error as Error).name).toBe('AbortError');
  });

  it('un cuerpo que no es lista es un fallo', async () => {
    fetchQueResponde(json({ routes: [] }));
    const r = await fetchNearbyRoutes('tok', busqueda);
    expect(r.ok).toBe(false);
  });
});
