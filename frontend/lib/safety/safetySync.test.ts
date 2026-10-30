import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { SafetyAlert } from './api';
import { REINTENTO_MS, type OutboxEntry, type OutboxItem } from './outbox';
import { createSafetySync, type SafetySyncDeps } from './safetySync';

const S = { token: 'tok-a', userId: 'usuario-a' };
const C = '44444444-4444-4444-8444-444444444444';

const sesion: OutboxEntry = {
  kind: 'session',
  clientId: C,
  payload: { type: 'HIKING', startedAt: '2026-10-22T15:00:00.000Z', returnBy: '2026-10-22T18:00:00.000Z' },
};
const ubicacion = (minuto: number): OutboxEntry => ({
  kind: 'location',
  clientId: C,
  payload: { latitude: 32, longitude: -115, recordedAt: `2026-10-22T15:${String(minuto).padStart(2, '0')}:00.000Z` },
});
const alerta: OutboxEntry = {
  kind: 'alert',
  clientId: C,
  payload: {
    clientAlertId: 'alerta-1',
    reason: 'INACTIVITY',
    triggeredAt: '2026-10-22T15:30:00.000Z',
    latitude: 32,
    longitude: -115,
    locationAt: '2026-10-22T15:28:00.000Z',
  },
};
const cancelacion: OutboxEntry = { kind: 'cancel', clientId: C, payload: { clientAlertId: 'alerta-1' } };
const fin: OutboxEntry = { kind: 'finish', clientId: C, payload: { endedAt: '2026-10-22T16:00:00.000Z' } };

const ok = <T>(data: T) => ({ ok: true as const, data });
const fallo = (status: number) => ({
  ok: false as const,
  failure: { status, apiError: { message: 'x', fieldErrors: {} } },
});
const sinRed = { ok: false as const, failure: { error: new TypeError('Network request failed') } };
const alertaServidor = (id: string): SafetyAlert => ({
  id,
  reason: 'INACTIVITY',
  status: 'ACTIVE',
  triggeredAt: '2026-10-22T15:30:00.000Z',
  locationAt: null,
  deliveries: [],
});

type MockDeps = { [K in keyof SafetySyncDeps]-?: Mock };

// Bandeja en memoria; por defecto hay red y el servidor acepta todo.
function montar(inicial: OutboxEntry[] = [], overrides: Partial<MockDeps> = {}) {
  let siguienteId = 1;
  let reloj = 0;
  const bandeja: OutboxItem[] = [];
  const meter = (entry: OutboxEntry) => {
    const id = siguienteId++;
    bandeja.push({ ...entry, id, createdAt: reloj++, attempts: 0 } as OutboxItem);
    return id;
  };
  for (const e of inicial) meter(e);

  const deps: MockDeps = {
    log: vi.fn(),
    isOnline: vi.fn().mockResolvedValue(true),
    enqueueOutbox: vi.fn(async (_u: string, e: OutboxEntry) => meter(e)),
    listOutbox: vi.fn(async () => bandeja.map((i) => ({ ...i }))),
    deleteOutbox: vi.fn(async (ids: number[]) => {
      for (const id of ids) {
        const i = bandeja.findIndex((x) => x.id === id);
        if (i >= 0) bandeja.splice(i, 1);
      }
    }),
    incrementOutboxAttempts: vi.fn(async (id: number) => {
      const item = bandeja.find((x) => x.id === id);
      if (item) item.attempts++;
    }),
    markSessionAck: vi.fn().mockResolvedValue(undefined),
    markAlertSent: vi.fn().mockResolvedValue(undefined),
    getAlertServerId: vi.fn().mockResolvedValue('srv-alerta'),
    upsertSession: vi.fn().mockResolvedValue(ok({})),
    createAlert: vi.fn().mockResolvedValue(ok(alertaServidor('srv-alerta'))),
    cancelAlert: vi.fn().mockResolvedValue(ok({})),
    postLocation: vi.fn().mockResolvedValue(ok(undefined)),
    finishSession: vi.fn().mockResolvedValue(ok({})),
    ...overrides,
  };
  const sync = createSafetySync(deps as unknown as SafetySyncDeps);
  return { sync, deps, bandeja };
}

// Orden de las peticiones al servidor.
function peticiones(deps: MockDeps) {
  const nombres = ['upsertSession', 'createAlert', 'cancelAlert', 'postLocation', 'finishSession'] as const;
  return nombres
    .flatMap((n) => deps[n].mock.invocationCallOrder.map((orden) => [orden, n] as const))
    .sort((a, b) => a[0] - b[0])
    .map(([, n]) => n);
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('safetySync (spec 008, plan D6)', () => {
  it('sin sesión no hace nada', async () => {
    const { sync, deps } = montar([sesion]);
    expect(await sync.requestSend()).toBe('no-session');
    expect(await sync.encolar(alerta)).toBe('no-session');
    expect(deps.enqueueOutbox).not.toHaveBeenCalled();
    expect(deps.listOutbox).not.toHaveBeenCalled();
  });

  it('sin red la bandeja se queda como está y no hay peticiones (CA-15)', async () => {
    const { sync, deps, bandeja } = montar([sesion, alerta], {
      isOnline: vi.fn().mockResolvedValue(false),
    });
    sync.configure(S);

    expect(await sync.requestSend()).toBe('offline');

    expect(peticiones(deps)).toEqual([]);
    expect(bandeja).toHaveLength(2);
    // Sin red no se programa un reintento: lo dispara la vuelta de la red.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('envía en orden, borra cada entrada enviada y aplica su efecto local (CA-15, CA-23)', async () => {
    const { sync, deps, bandeja } = montar([sesion, ubicacion(5), alerta, fin]);
    sync.configure(S);

    expect(await sync.requestSend()).toBe('done');

    expect(peticiones(deps)).toEqual(['upsertSession', 'postLocation', 'createAlert', 'finishSession']);
    expect(deps.upsertSession).toHaveBeenCalledWith('tok-a', C, sesion.payload);
    expect(deps.markSessionAck).toHaveBeenCalledWith(C, '2026-10-22T18:00:00.000Z');
    expect(deps.markAlertSent).toHaveBeenCalledWith('alerta-1', 'srv-alerta');
    expect(bandeja).toEqual([]);
  });

  it('de varias ubicaciones solo envía la más reciente y borra las demás (CA-20)', async () => {
    const { sync, deps, bandeja } = montar([sesion, ubicacion(5), ubicacion(10), ubicacion(15)]);
    sync.configure(S);

    await sync.requestSend();

    expect(deps.postLocation).toHaveBeenCalledTimes(1);
    expect(deps.postLocation.mock.calls[0][2]).toEqual(ubicacion(15).payload);
    expect(bandeja).toEqual([]);
  });

  it('una alerta y su cancelación sin enviar no llegan al servidor', async () => {
    const { sync, deps, bandeja } = montar([sesion, alerta, cancelacion]);
    sync.configure(S);

    await sync.requestSend();

    expect(peticiones(deps)).toEqual(['upsertSession']);
    expect(bandeja).toEqual([]);
  });

  it('cancela con el id del servidor de una alerta ya enviada (CA-25)', async () => {
    const { sync, deps } = montar([cancelacion]);
    sync.configure(S);

    await sync.requestSend();

    expect(deps.getAlertServerId).toHaveBeenCalledWith('alerta-1');
    expect(deps.cancelAlert).toHaveBeenCalledWith('tok-a', 'srv-alerta');
  });

  it('sin red a mitad del envío se detiene, no borra nada y reintenta a los 30 s (constitución 2.4)', async () => {
    const { sync, deps, bandeja } = montar([sesion, alerta, fin], {
      createAlert: vi
        .fn()
        .mockResolvedValueOnce(sinRed)
        .mockResolvedValue(ok(alertaServidor('srv-alerta'))),
    });
    sync.configure(S);

    expect(await sync.requestSend()).toBe('retry');

    expect(peticiones(deps)).toEqual(['upsertSession', 'createAlert']);
    expect(bandeja.map((i) => i.kind)).toEqual(['alert', 'finish']);
    expect(bandeja[0].attempts).toBe(1);

    await vi.advanceTimersByTimeAsync(REINTENTO_MS - 1);
    expect(deps.createAlert).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await vi.runAllTimersAsync();

    expect(deps.createAlert).toHaveBeenCalledTimes(2);
    expect(deps.finishSession).toHaveBeenCalledTimes(1);
    expect(bandeja).toEqual([]);
  });

  it('un error del servidor (5xx) o 429 también se reintenta', async () => {
    for (const status of [500, 503, 429]) {
      const { sync, bandeja } = montar([ubicacion(5)], {
        postLocation: vi.fn().mockResolvedValue(fallo(status)),
      });
      sync.configure(S);
      expect(await sync.requestSend()).toBe('retry');
      expect(bandeja).toHaveLength(1);
      sync.configure(null);
    }
  });

  it('un 401 detiene todo sin borrar ni programar reintento', async () => {
    const { sync, bandeja } = montar([sesion, alerta], {
      upsertSession: vi.fn().mockResolvedValue(fallo(401)),
    });
    sync.configure(S);

    expect(await sync.requestSend()).toBe('auth');

    expect(bandeja).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('lo que el servidor no aceptará nunca se descarta y se sigue con lo demás', async () => {
    // 409: la sesión ya terminó y no acepta ubicaciones (RN-9).
    const { sync, deps, bandeja } = montar([ubicacion(5), fin], {
      postLocation: vi.fn().mockResolvedValue(fallo(409)),
    });
    sync.configure(S);

    expect(await sync.requestSend()).toBe('done');

    expect(deps.finishSession).toHaveBeenCalled();
    expect(bandeja).toEqual([]);
    expect(deps.log).toHaveBeenCalled();
  });

  it('una cancelación de una alerta que nunca llegó al servidor se descarta', async () => {
    const { sync, deps, bandeja } = montar([cancelacion], {
      getAlertServerId: vi.fn().mockResolvedValue(null),
    });
    sync.configure(S);

    await sync.requestSend();

    expect(deps.cancelAlert).not.toHaveBeenCalled();
    expect(bandeja).toEqual([]);
  });

  it('encolar guarda con el usuario de la sesión y envía en el momento', async () => {
    const { sync, deps, bandeja } = montar();
    sync.configure(S);

    expect(await sync.encolar(alerta)).toBe('done');

    expect(deps.enqueueOutbox).toHaveBeenCalledWith('usuario-a', alerta);
    expect(deps.createAlert).toHaveBeenCalledWith('tok-a', C, alerta.payload);
    expect(bandeja).toEqual([]);
  });

  it('encolar sin red deja la entrada en la bandeja (CA-15)', async () => {
    const { sync, bandeja } = montar([], { isOnline: vi.fn().mockResolvedValue(false) });
    sync.configure(S);

    expect(await sync.encolar(alerta)).toBe('offline');
    expect(bandeja.map((i) => i.kind)).toEqual(['alert']);
  });

  it('dos pedidos a la vez no corren en paralelo: el segundo se atiende al terminar', async () => {
    let soltar!: () => void;
    const { sync, deps } = montar([sesion], {
      upsertSession: vi.fn(
        () =>
          new Promise((resolve) => {
            soltar = () => resolve(ok({}));
          })
      ),
    });
    sync.configure(S);

    const primero = sync.requestSend();
    const segundo = sync.requestSend();
    await vi.waitFor(() => expect(deps.upsertSession).toHaveBeenCalled());
    soltar();

    expect(await primero).toBe('done');
    expect(await segundo).toBe('done');
    expect(deps.listOutbox).toHaveBeenCalledTimes(2);
    expect(deps.upsertSession).toHaveBeenCalledTimes(1);
  });

  it('cambiar de sesión cancela el reintento de la anterior', async () => {
    const { sync, deps } = montar([ubicacion(5)], {
      postLocation: vi.fn().mockResolvedValue(sinRed),
    });
    sync.configure(S);
    await sync.requestSend();
    expect(vi.getTimerCount()).toBe(1);

    sync.configure(null);

    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(REINTENTO_MS);
    expect(deps.postLocation).toHaveBeenCalledTimes(1);
  });

  it('avisa a las pantallas cuando algo se envía o se descarta', async () => {
    const { sync } = montar([sesion, ubicacion(5), ubicacion(6)]);
    const listener = vi.fn();
    sync.subscribe(listener);
    sync.configure(S);

    await sync.requestSend();

    // Una vez por las descartadas y una por cada envío.
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenCalledWith({ type: 'data-changed' });
  });

  it('un error inesperado (p. ej. de SQLite) no pierde nada y reintenta', async () => {
    const { sync, deps } = montar([sesion], {
      listOutbox: vi.fn().mockRejectedValue(new Error('database is locked')),
    });
    sync.configure(S);

    expect(await sync.requestSend()).toBe('retry');
    expect(deps.log).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
  });
});
