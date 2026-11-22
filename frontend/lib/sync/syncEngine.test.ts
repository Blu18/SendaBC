import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Activity } from '../db/activities';
import type { RemoteActivityDetail, RemoteActivitySummary } from './api';
import type { UploadPayload } from './payload';
import type { SyncResult } from './results';
import { createSyncEngine, type SyncDeps, type SyncEvent } from './syncEngine';

const A = { token: 'tok-a', userId: 'usuario-a' };

function actividad(localId: number, extra: Partial<Activity> = {}): Activity {
  return {
    localId,
    clientGeneratedId: `c-${localId}`,
    userId: A.userId,
    type: 'HIKING',
    status: 'PENDING_SYNC',
    startedAt: '2026-10-09T10:00:00.000Z',
    endedAt: '2026-10-09T11:00:00.000Z',
    elevationSource: 'GPS',
    distanceMeters: 1000,
    durationSeconds: 3600,
    elevationGainMeters: 10,
    elevationLossMeters: 10,
    serverId: null,
    syncError: null,
    peakAltitudeMeters: null,
    ...extra,
  };
}

function remota(id: string, clientGeneratedId: string | null): RemoteActivityDetail {
  return {
    id,
    clientGeneratedId,
    type: 'CYCLING',
    startedAt: '2026-10-01T10:00:00.000Z',
    endedAt: '2026-10-01T11:00:00.000Z',
    distanceMeters: 18000,
    durationSeconds: 3600,
    elevationGainMeters: 200,
    elevationLossMeters: 190,
    elevationSource: 'BAROMETER',
    pointCount: 0,
    points: [],
  };
}

// Por defecto: hay red, el servidor acepta todo y no hay nada que descargar.
// Cada dependencia es un vi.fn() para poder revisar sus llamadas.
type MockDeps = { [K in keyof SyncDeps]-?: Mock };

function montar(overrides: Partial<MockDeps> = {}) {
  const deps: MockDeps = {
    log: vi.fn(),
    isOnline: vi.fn().mockResolvedValue(true),
    listUploadable: vi.fn().mockResolvedValue([]),
    getActivityPoints: vi.fn().mockResolvedValue([]),
    markSynced: vi.fn().mockResolvedValue(undefined),
    markSyncError: vi.fn().mockResolvedValue(undefined),
    listClientIds: vi.fn().mockResolvedValue(new Set<string>()),
    insertDownloadedActivity: vi.fn().mockResolvedValue(1),
    uploadBatch: vi.fn(async (_t: string, batch: UploadPayload[]) => ({
      ok: true as const,
      data: batch.map(
        (p): SyncResult => ({ clientGeneratedId: p.clientGeneratedId, status: 'CREATED', id: `srv-${p.clientGeneratedId}` })
      ),
    })),
    listRemoteActivities: vi.fn().mockResolvedValue({ ok: true, data: [] as RemoteActivitySummary[] }),
    getRemoteActivity: vi.fn(),
    ...overrides,
  };
  const engine = createSyncEngine(deps as unknown as SyncDeps);
  return { engine, deps };
}

const sinRed = { ok: false as const, failure: { error: new TypeError('Network request failed') } };

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('syncEngine — subida (spec 005)', () => {
  it('sin sesión no hace nada', async () => {
    const { engine, deps } = montar();

    expect(await engine.requestSync()).toBe('no-session');
    expect(deps.isOnline).not.toHaveBeenCalled();
  });

  it('sin conexión no hace peticiones ni programa reintento (CA-9, batería)', async () => {
    const { engine, deps } = montar({ isOnline: vi.fn().mockResolvedValue(false) });
    engine.configure(A);

    expect(await engine.requestSync()).toBe('offline');
    expect(deps.listUploadable).not.toHaveBeenCalled();
    expect(deps.uploadBatch).not.toHaveBeenCalled();
    expect(engine.getState().nextRetryAt).toBeNull();
  });

  it('sube lo que devuelve listUploadable del usuario configurado y lo marca (CA-1, CA-13, CA-17)', async () => {
    const { engine, deps } = montar({
      listUploadable: vi.fn().mockResolvedValue([actividad(1), actividad(2)]),
    });
    engine.configure(A);

    expect(await engine.requestSync()).toBe('done');

    expect(deps.listUploadable).toHaveBeenCalledWith('usuario-a', { includeRejected: false });
    expect(deps.uploadBatch).toHaveBeenCalledTimes(1);
    expect(deps.uploadBatch.mock.calls[0][0]).toBe('tok-a');
    expect(deps.markSynced.mock.calls).toEqual([
      [1, 'srv-c-1'],
      [2, 'srv-c-2'],
    ]);
  });

  it('varias pendientes se suben en lotes de 5 (CA-2)', async () => {
    const { engine, deps } = montar({
      listUploadable: vi.fn().mockResolvedValue(Array.from({ length: 7 }, (_, i) => actividad(i + 1))),
    });
    engine.configure(A);

    await engine.requestSync();

    expect(deps.uploadBatch.mock.calls.map((c) => c[1].length)).toEqual([5, 2]);
    expect(deps.markSynced).toHaveBeenCalledTimes(7);
  });

  it('una rechazada se marca con su motivo y las demás se sincronizan (CA-11)', async () => {
    const { engine, deps } = montar({
      listUploadable: vi.fn().mockResolvedValue([actividad(1), actividad(2)]),
      uploadBatch: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          { clientGeneratedId: 'c-1', status: 'REJECTED', errors: ['motivo'] },
          { clientGeneratedId: 'c-2', status: 'ALREADY_EXISTS', id: 'srv-2' },
        ],
      }),
    });
    engine.configure(A);

    await engine.requestSync();

    expect(deps.markSyncError).toHaveBeenCalledWith(1, 'motivo');
    expect(deps.markSynced).toHaveBeenCalledWith(2, 'srv-2');
  });

  it('la sincronización manual incluye las rechazadas (CA-16)', async () => {
    const { engine, deps } = montar();
    engine.configure(A);

    await engine.requestSync({ manual: true });

    expect(deps.listUploadable).toHaveBeenCalledWith('usuario-a', { includeRejected: true });
  });

  it('avisa data-changed cuando marca actividades (CA-15)', async () => {
    const { engine } = montar({ listUploadable: vi.fn().mockResolvedValue([actividad(1)]) });
    const eventos: SyncEvent[] = [];
    engine.subscribe((e) => eventos.push(e));
    engine.configure(A);

    await engine.requestSync();

    expect(eventos.some((e) => e.type === 'data-changed')).toBe(true);
    const estados = eventos.flatMap((e) => (e.type === 'state' ? [e.state.isSyncing] : []));
    expect(estados).toContain(true);
    expect(engine.getState()).toMatchObject({ isSyncing: false, lastOutcome: 'done' });
  });
});

describe('syncEngine — fallos y reintentos (spec 005, CA-9, CA-12)', () => {
  it('un fallo de red no marca nada y reintenta a los 30 s, luego a 1 min', async () => {
    const { engine, deps } = montar({
      listUploadable: vi.fn().mockResolvedValue([actividad(1)]),
      uploadBatch: vi.fn().mockResolvedValue(sinRed),
    });
    engine.configure(A);

    expect(await engine.requestSync()).toBe('retry');
    expect(deps.markSynced).not.toHaveBeenCalled();
    expect(deps.markSyncError).not.toHaveBeenCalled();
    expect(deps.uploadBatch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(29_999);
    expect(deps.uploadBatch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(deps.uploadBatch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(59_999);
    expect(deps.uploadBatch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(deps.uploadBatch).toHaveBeenCalledTimes(3);
  });

  it('un éxito reinicia la espera: el siguiente fallo vuelve a esperar 30 s', async () => {
    const uploadBatch = vi
      .fn()
      .mockResolvedValueOnce(sinRed)
      .mockResolvedValueOnce({ ok: true, data: [{ clientGeneratedId: 'c-1', status: 'CREATED', id: 's' }] })
      .mockResolvedValue(sinRed);
    const { engine } = montar({
      listUploadable: vi.fn().mockResolvedValue([actividad(1)]),
      uploadBatch,
    });
    engine.configure(A);

    await engine.requestSync(); // falla → reintento en 30 s
    await vi.advanceTimersByTimeAsync(30_000); // éxito
    expect(engine.getState().lastOutcome).toBe('done');

    await engine.requestSync(); // falla de nuevo
    expect(engine.getState().nextRetryAt).toBe(Date.now() + 30_000);
  });

  it('un 5xx también reintenta', async () => {
    const { engine } = montar({
      listUploadable: vi.fn().mockResolvedValue([actividad(1)]),
      uploadBatch: vi.fn().mockResolvedValue({ ok: false, failure: { status: 503 } }),
    });
    engine.configure(A);

    expect(await engine.requestSync()).toBe('retry');
  });

  it('un 401 se detiene sin marcar ni reintentar (CA-12)', async () => {
    const { engine, deps } = montar({
      listUploadable: vi.fn().mockResolvedValue([actividad(1)]),
      uploadBatch: vi.fn().mockResolvedValue({ ok: false, failure: { status: 401 } }),
    });
    engine.configure(A);

    expect(await engine.requestSync()).toBe('auth');
    await vi.advanceTimersByTimeAsync(60 * 60_000);

    expect(deps.uploadBatch).toHaveBeenCalledTimes(1);
    expect(deps.markSynced).not.toHaveBeenCalled();
    expect(engine.getState().nextRetryAt).toBeNull();
  });

  it('un error inesperado (p. ej. de SQLite) programa un reintento', async () => {
    const { engine } = montar({
      listUploadable: vi.fn().mockRejectedValue(new Error('database is locked')),
    });
    engine.configure(A);

    expect(await engine.requestSync()).toBe('retry');
    expect(engine.getState().nextRetryAt).not.toBeNull();
  });

  it('cerrar sesión cancela el reintento pendiente', async () => {
    const { engine, deps } = montar({
      listUploadable: vi.fn().mockResolvedValue([actividad(1)]),
      uploadBatch: vi.fn().mockResolvedValue(sinRed),
    });
    engine.configure(A);
    await engine.requestSync();

    engine.configure(null);
    await vi.advanceTimersByTimeAsync(20 * 60_000);

    expect(deps.uploadBatch).toHaveBeenCalledTimes(1);
    expect(engine.getState().nextRetryAt).toBeNull();
  });
});

describe('syncEngine — concurrencia (spec 005, CA-4)', () => {
  it('dos peticiones seguidas no corren en paralelo: la segunda se repite al terminar', async () => {
    let enCurso = 0;
    let maximo = 0;
    const { engine, deps } = montar({
      listUploadable: vi.fn(async () => {
        enCurso += 1;
        maximo = Math.max(maximo, enCurso);
        await new Promise((r) => setTimeout(r, 100));
        enCurso -= 1;
        return [];
      }),
    });
    engine.configure(A);

    const p1 = engine.requestSync();
    const p2 = engine.requestSync({ manual: true });
    await vi.advanceTimersByTimeAsync(1_000);
    await Promise.all([p1, p2]);

    expect(maximo).toBe(1);
    expect(deps.listUploadable.mock.calls.map((c) => c[1])).toEqual([
      { includeRejected: false },
      { includeRejected: true },
    ]);
  });
});

describe('syncEngine — recuperar actividades (spec 005, CA-20, CA-22)', () => {
  it('descarga solo las que faltan en el teléfono y las guarda con el usuario', async () => {
    const lista = [remota('srv-1', 'c-1'), remota('srv-2', 'c-2'), remota('srv-3', null)];
    const { engine, deps } = montar({
      listRemoteActivities: vi.fn().mockResolvedValue({ ok: true, data: lista }),
      listClientIds: vi.fn().mockResolvedValue(new Set(['c-1'])),
      getRemoteActivity: vi.fn(async (_t: string, id: string) => ({
        ok: true as const,
        data: lista.find((a) => a.id === id)!,
      })),
    });
    engine.configure(A);

    expect(await engine.requestSync()).toBe('done');

    expect(deps.getRemoteActivity.mock.calls.map((c) => c[1])).toEqual(['srv-2']);
    expect(deps.insertDownloadedActivity).toHaveBeenCalledWith(
      expect.objectContaining({ serverId: 'srv-2', clientGeneratedId: 'c-2' }),
      'usuario-a'
    );
  });

  it('si guardar una recuperada falla (ya existía), sigue con las demás', async () => {
    const lista = [remota('srv-1', 'c-1'), remota('srv-2', 'c-2')];
    const { engine, deps } = montar({
      listRemoteActivities: vi.fn().mockResolvedValue({ ok: true, data: lista }),
      getRemoteActivity: vi.fn(async (_t: string, id: string) => ({
        ok: true as const,
        data: lista.find((a) => a.id === id)!,
      })),
      insertDownloadedActivity: vi
        .fn()
        .mockRejectedValueOnce(new Error('UNIQUE constraint failed'))
        .mockResolvedValue(2),
    });
    engine.configure(A);

    expect(await engine.requestSync()).toBe('done');
    expect(deps.insertDownloadedActivity).toHaveBeenCalledTimes(2);
  });

  it('si la lista remota falla, reintenta más tarde', async () => {
    const { engine } = montar({ listRemoteActivities: vi.fn().mockResolvedValue(sinRed) });
    engine.configure(A);

    expect(await engine.requestSync()).toBe('retry');
  });
});
