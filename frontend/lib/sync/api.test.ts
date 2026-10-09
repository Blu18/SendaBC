import { afterEach, describe, expect, it, vi } from 'vitest';
import { setUnauthorizedHandler } from '../api/client';
import {
  DETAIL_TIMEOUT_MS,
  getRemoteActivity,
  LIST_TIMEOUT_MS,
  listRemoteActivities,
  toDownloadedActivity,
  uploadBatch,
  type RemoteActivityDetail,
} from './api';
import type { UploadPayload } from './payload';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function fetchQueResponde(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// fetch que no responde nunca, salvo que se aborte su signal (servidor inalcanzable).
function fetchColgado() {
  return vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        );
      })
  );
}

const detalle: RemoteActivityDetail = {
  id: 'srv-1',
  clientGeneratedId: 'c-1',
  type: 'HIKING',
  startedAt: '2026-10-09T10:00:00.000Z',
  endedAt: '2026-10-09T11:00:00.000Z',
  distanceMeters: 5234.7,
  durationSeconds: 3600,
  elevationGainMeters: 312,
  elevationLossMeters: 298,
  elevationSource: 'BAROMETER',
  pointCount: 1,
  points: [
    {
      sequence: 1,
      latitude: 31.86,
      longitude: -116.59,
      altitude: null,
      accuracy: 4,
      recordedAt: '2026-10-09T10:00:00.000Z',
    },
  ],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe('uploadBatch (spec 005)', () => {
  it('envía el lote con el token y devuelve los resultados', async () => {
    const results = [{ clientGeneratedId: 'c-1', status: 'CREATED', id: 'srv-1' }];
    const fetchMock = fetchQueResponde(json({ results }));
    const batch = [{ clientGeneratedId: 'c-1' }] as UploadPayload[];

    const r = await uploadBatch('tok', batch);

    expect(r).toEqual({ ok: true, data: results });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/activities\/sync$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ activities: batch });
    expect(init.signal).toBeDefined(); // lleva límite de tiempo (D10)
  });

  it('un 401 se describe como { status: 401 } y avisa a la sesión (spec 002)', async () => {
    fetchQueResponde(json({ message: 'Unauthorized' }, 401));
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    expect(await uploadBatch('tok', [])).toEqual({ ok: false, failure: { status: 401 } });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('un 500 o 413 se describe con su status', async () => {
    fetchQueResponde(json({}, 503));
    expect(await uploadBatch('tok', [])).toEqual({ ok: false, failure: { status: 503 } });
    fetchQueResponde(json({}, 413));
    expect(await uploadBatch('tok', [])).toEqual({ ok: false, failure: { status: 413 } });
  });

  it('sin red se describe como { error }', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network request failed')));

    const r = await uploadBatch('tok', []);

    expect(r.ok).toBe(false);
    if (!r.ok) expect((r.failure as { error: Error }).error.message).toBe('Network request failed');
  });

  it('una respuesta sin results es un fallo, no un éxito vacío (CA-13)', async () => {
    fetchQueResponde(json({ algo: 1 }));

    const r = await uploadBatch('tok', []);

    expect(r.ok).toBe(false);
  });
});

describe('listRemoteActivities y getRemoteActivity (spec 005, CA-20, CA-21)', () => {
  it('lista mis actividades', async () => {
    const fetchMock = fetchQueResponde(json([detalle]));

    expect(await listRemoteActivities('tok')).toEqual({ ok: true, data: [detalle] });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/activities$/);
  });

  it('pide el detalle por id', async () => {
    const fetchMock = fetchQueResponde(json(detalle));

    expect(await getRemoteActivity('tok', 'srv-1')).toEqual({ ok: true, data: detalle });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/activities\/srv-1$/);
  });

  it('un detalle sin puntos es un fallo', async () => {
    fetchQueResponde(json({ id: 'srv-1' }));

    expect((await getRemoteActivity('tok', 'srv-1')).ok).toBe(false);
  });

  it('la lista se aborta a los 10 s y el detalle a los 30 s (D10)', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchColgado());

    const lista = listRemoteActivities('tok');
    const detalleP = getRemoteActivity('tok', 'srv-1');
    await vi.advanceTimersByTimeAsync(LIST_TIMEOUT_MS);
    const r1 = await lista;
    expect(r1.ok).toBe(false);

    await vi.advanceTimersByTimeAsync(DETAIL_TIMEOUT_MS - LIST_TIMEOUT_MS);
    const r2 = await detalleP;
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect((r2.failure as { error: Error }).error.name).toBe('AbortError');
  });
});

describe('toDownloadedActivity (spec 005, CA-21)', () => {
  it('convierte el detalle del servidor en una actividad para guardar', () => {
    expect(toDownloadedActivity(detalle)).toEqual({
      serverId: 'srv-1',
      clientGeneratedId: 'c-1',
      type: 'HIKING',
      startedAt: '2026-10-09T10:00:00.000Z',
      endedAt: '2026-10-09T11:00:00.000Z',
      distanceMeters: 5234.7,
      durationSeconds: 3600,
      elevationGainMeters: 312,
      elevationLossMeters: 298,
      elevationSource: 'BAROMETER',
      points: detalle.points,
    });
  });

  it('una actividad sin fuente se guarda como GPS', () => {
    expect(toDownloadedActivity({ ...detalle, elevationSource: null })?.elevationSource).toBe(
      'GPS'
    );
  });

  it.each(['clientGeneratedId', 'endedAt', 'distanceMeters', 'elevationLossMeters'] as const)(
    'sin %s no se recupera',
    (campo) => {
      expect(toDownloadedActivity({ ...detalle, [campo]: null })).toBeNull();
    }
  );
});
