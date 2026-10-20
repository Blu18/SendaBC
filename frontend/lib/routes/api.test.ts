import { afterEach, describe, expect, it, vi } from 'vitest';
import { setUnauthorizedHandler } from '../api/client';
import {
  addFavorite,
  deleteRoute,
  fetchNearbyRoutes,
  getRoute,
  listFavorites,
  listMyRoutes,
  publishRoute,
  removeFavorite,
  updateRoute,
  type NearbyRoute,
  type RouteDetail,
} from './api';
import { NEARBY_TIMEOUT_MS, ROUTE_REQUEST_TIMEOUT_MS } from './constants';

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

describe('Publicar rutas, detalle y favoritas (spec 007)', () => {
  const detalle: RouteDetail = {
    id: 'r-1',
    name: 'Cañón de Doña Petra',
    description: null,
    region: 'Ensenada',
    type: 'HIKING',
    difficulty: 'MODERATE',
    distanceMeters: 3000,
    elevationGainMeters: 350,
    start: { latitude: 31.879, longitude: -116.5905 },
    path: [
      [-116.5905, 31.879],
      [-116.58, 31.892],
    ],
    elevationProfile: [
      [0, 500],
      [3000, 770],
    ],
    author: 'Ana',
    isMine: true,
    isFavorite: false,
    status: 'PUBLISHED',
    sourceActivityId: 'act-1',
    publishedAt: '2026-10-20T18:30:00.000Z',
  };

  const sinCuerpo = () => new Response(null, { status: 204 });

  // Cada función con su método, ruta, body y lo que devuelve con éxito.
  const casos = [
    {
      nombre: 'publishRoute',
      llamar: () => publishRoute('tok', { activityId: 'act-1', name: 'Ruta', region: 'Ensenada' }),
      respuesta: () => json(detalle, 201),
      metodo: 'POST',
      ruta: '/routes',
      body: { activityId: 'act-1', name: 'Ruta', region: 'Ensenada' },
      data: detalle,
    },
    {
      nombre: 'getRoute',
      llamar: () => getRoute('tok', 'r-1'),
      respuesta: () => json(detalle),
      metodo: 'GET',
      ruta: '/routes/r-1',
      body: undefined,
      data: detalle,
    },
    {
      nombre: 'updateRoute',
      llamar: () => updateRoute('tok', 'r-1', { status: 'ARCHIVED' }),
      respuesta: () => json({ ...detalle, status: 'ARCHIVED' }),
      metodo: 'PATCH',
      ruta: '/routes/r-1',
      body: { status: 'ARCHIVED' },
      data: { ...detalle, status: 'ARCHIVED' },
    },
    {
      nombre: 'deleteRoute',
      llamar: () => deleteRoute('tok', 'r-1'),
      respuesta: sinCuerpo,
      metodo: 'DELETE',
      ruta: '/routes/r-1',
      body: undefined,
      data: undefined,
    },
    {
      nombre: 'listMyRoutes',
      llamar: () => listMyRoutes('tok'),
      respuesta: () => json([{ id: 'r-1' }]),
      metodo: 'GET',
      ruta: '/routes/mine',
      body: undefined,
      data: [{ id: 'r-1' }],
    },
    {
      nombre: 'listFavorites',
      llamar: () => listFavorites('tok'),
      respuesta: () => json([{ id: 'r-1', available: false }]),
      metodo: 'GET',
      ruta: '/routes/favorites',
      body: undefined,
      data: [{ id: 'r-1', available: false }],
    },
    {
      nombre: 'addFavorite',
      llamar: () => addFavorite('tok', 'r-1'),
      respuesta: sinCuerpo,
      metodo: 'PUT',
      ruta: '/routes/r-1/favorite',
      body: undefined,
      data: undefined,
    },
    {
      nombre: 'removeFavorite',
      llamar: () => removeFavorite('tok', 'r-1'),
      respuesta: sinCuerpo,
      metodo: 'DELETE',
      ruta: '/routes/r-1/favorite',
      body: undefined,
      data: undefined,
    },
  ];

  it.each(casos)('$nombre usa $metodo $ruta con el token y límite de tiempo', async (caso) => {
    const fetchMock = fetchQueResponde(caso.respuesta());

    expect(await caso.llamar()).toEqual({ ok: true, data: caso.data });

    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url, 'http://x').pathname.endsWith(caso.ruta)).toBe(true);
    expect(init.method ?? 'GET').toBe(caso.metodo);
    expect(init.body === undefined ? undefined : JSON.parse(init.body)).toEqual(caso.body);
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.signal).toBeDefined();
  });

  it('codifica el id en la ruta', async () => {
    const fetchMock = fetchQueResponde(json(detalle));
    await getRoute('tok', 'a/b');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/routes\/a%2Fb$/);
  });

  it('un 404 trae el mensaje del servidor: la ruta ya no está disponible (CA-14)', async () => {
    fetchQueResponde(json({ statusCode: 404, message: 'Esta ruta ya no está disponible' }, 404));

    expect(await getRoute('tok', 'r-1')).toEqual({
      ok: false,
      failure: {
        status: 404,
        apiError: { message: 'Esta ruta ya no está disponible', fieldErrors: {} },
      },
    });
  });

  it('un 409 trae el mensaje del servidor (CA-8)', async () => {
    fetchQueResponde(json({ message: 'Esta actividad ya tiene una ruta publicada' }, 409));

    const r = await publishRoute('tok', { activityId: 'act-1', name: 'Ruta' });

    expect(!r.ok && 'status' in r.failure && r.failure).toEqual({
      status: 409,
      apiError: { message: 'Esta actividad ya tiene una ruta publicada', fieldErrors: {} },
    });
  });

  it('un 400 trae los errores por campo (CA-5)', async () => {
    fetchQueResponde(
      json(
        {
          statusCode: 400,
          message: 'Datos inválidos',
          errors: { name: ['El nombre debe tener como máximo 40 caracteres'] },
        },
        400
      )
    );

    const r = await updateRoute('tok', 'r-1', { name: 'n'.repeat(41) });

    expect(!r.ok && 'status' in r.failure && r.failure.apiError).toEqual({
      message: 'Datos inválidos',
      fieldErrors: { name: 'El nombre debe tener como máximo 40 caracteres' },
    });
  });

  it('un 500 sin cuerpo JSON usa un mensaje genérico (CA-7, CA-13)', async () => {
    fetchQueResponde(new Response('Internal Server Error', { status: 500 }));

    expect(await addFavorite('tok', 'r-1')).toEqual({
      ok: false,
      failure: {
        status: 500,
        apiError: { message: 'No se pudo completar la acción', fieldErrors: {} },
      },
    });
  });

  it('un 401 se reporta y avisa para cerrar la sesión (CA-27)', async () => {
    fetchQueResponde(json({ message: 'Unauthorized' }, 401));
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    const r = await listFavorites('tok');

    expect(!r.ok && 'status' in r.failure && r.failure.status).toBe(401);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('sin red devuelve el error en lugar de lanzar (CA-7, CA-13)', async () => {
    const sinRed = new TypeError('Network request failed');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(sinRed));

    expect(await publishRoute('tok', { activityId: 'act-1', name: 'Ruta' })).toEqual({
      ok: false,
      failure: { error: sinRed },
    });
  });

  it('si el servidor no responde, se rinde a los 10 s (CA-13)', async () => {
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

    const pendiente = getRoute('tok', 'r-1');
    await vi.advanceTimersByTimeAsync(ROUTE_REQUEST_TIMEOUT_MS);
    const r = await pendiente;

    expect(ROUTE_REQUEST_TIMEOUT_MS).toBe(10_000);
    expect(!r.ok && 'error' in r.failure && (r.failure.error as Error).name).toBe('AbortError');
  });

  it('un cuerpo inesperado es un fallo', async () => {
    fetchQueResponde(json({ routes: [] }));
    expect((await listMyRoutes('tok')).ok).toBe(false);

    fetchQueResponde(json([detalle]));
    expect((await getRoute('tok', 'r-1')).ok).toBe(false);
  });
});
