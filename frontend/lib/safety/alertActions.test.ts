import { describe, expect, it, vi, type Mock } from 'vitest';
import type { ActivityPointInput } from '../db/activities';
import type { LocalSafetySession } from '../db/safety';
import { createAlertActions, type AlertActionsDeps } from './alertActions';

const C = '44444444-4444-4444-8444-444444444444';
const T = Date.UTC(2026, 9, 29, 16, 12);

function sesion(overrides: Partial<LocalSafetySession> = {}): LocalSafetySession {
  return {
    activityLocalId: 7,
    clientGeneratedId: C,
    userId: 'u-1',
    returnBy: null,
    serverAck: true,
    locationQueuedAt: null,
    alertClientId: null,
    alertServerId: null,
    alertTriggeredAt: null,
    alertCancelledAt: null,
    ...overrides,
  };
}

const punto: ActivityPointInput = {
  sequence: 12,
  latitude: 32.05,
  longitude: -115.46,
  altitude: 100,
  accuracy: 5,
  recordedAt: '2026-10-29T16:02:00.000Z',
};

type MockDeps = { [K in keyof AlertActionsDeps]: Mock };

function montar(actual: LocalSafetySession | null = sesion(), ultimo: ActivityPointInput | null = punto) {
  const deps: MockDeps = {
    getSafetySession: vi.fn().mockResolvedValue(actual),
    getLastPoint: vi.fn().mockResolvedValue(ultimo),
    setAlert: vi.fn().mockResolvedValue(undefined),
    markAlertCancelled: vi.fn().mockResolvedValue(undefined),
    enqueueOutbox: vi.fn().mockResolvedValue(1),
    requestSend: vi.fn(),
    reiniciarDetector: vi.fn().mockResolvedValue(null),
    randomUUID: vi.fn().mockReturnValue('alerta-1'),
  };
  return { actions: createAlertActions(deps as unknown as AlertActionsDeps), deps };
}

describe('crear (spec 008, CA-14, CA-15)', () => {
  it('guarda la alerta con la última ubicación y su hora, la encola y pide enviarla', async () => {
    const { actions, deps } = montar();

    expect(await actions.crear(7, 'INACTIVITY', T)).toEqual({
      kind: 'creada',
      clientAlertId: 'alerta-1',
    });

    expect(deps.setAlert).toHaveBeenCalledWith(C, 'alerta-1', new Date(T).toISOString());
    expect(deps.enqueueOutbox).toHaveBeenCalledWith('u-1', {
      kind: 'alert',
      clientId: C,
      payload: {
        clientAlertId: 'alerta-1',
        reason: 'INACTIVITY',
        triggeredAt: new Date(T).toISOString(),
        latitude: 32.05,
        longitude: -115.46,
        locationAt: '2026-10-29T16:02:00.000Z',
      },
    });
    expect(deps.requestSend).toHaveBeenCalled();
  });

  it('sin puntos todavía, la alerta sale sin ubicación (SOS al iniciar)', async () => {
    const { actions, deps } = montar(sesion(), null);

    await actions.crear(7, 'SOS', T);

    expect(deps.enqueueOutbox.mock.calls[0][1].payload).toMatchObject({
      reason: 'SOS',
      latitude: null,
      longitude: null,
      locationAt: null,
    });
  });

  it('con una alerta activa no crea otra ni encola nada (CA-27, RN-8)', async () => {
    const { actions, deps } = montar(sesion({ alertClientId: 'previa' }));

    expect(await actions.crear(7, 'SOS', T)).toEqual({ kind: 'ya-activa', clientAlertId: 'previa' });
    expect(deps.setAlert).not.toHaveBeenCalled();
    expect(deps.enqueueOutbox).not.toHaveBeenCalled();
  });

  it('después de cancelar la anterior sí crea otra (RN-8)', async () => {
    const { actions } = montar(sesion({ alertClientId: 'previa', alertCancelledAt: 'x' }));
    expect((await actions.crear(7, 'INACTIVITY', T)).kind).toBe('creada');
  });

  it('sin sesión de seguridad no hay a quién avisar', async () => {
    const { actions, deps } = montar(null);
    expect(await actions.crear(7, 'INACTIVITY', T)).toEqual({ kind: 'sin-sesion' });
    expect(deps.enqueueOutbox).not.toHaveBeenCalled();
  });
});

describe('cancelar (spec 008, CA-25)', () => {
  it('marca la alerta cancelada, encola la cancelación por clientAlertId y reinicia la detección', async () => {
    const { actions, deps } = montar(sesion({ alertClientId: 'alerta-1' }));

    expect(await actions.cancelar(7, T)).toBe('cancelada');

    expect(deps.markAlertCancelled).toHaveBeenCalledWith(C, new Date(T).toISOString());
    expect(deps.enqueueOutbox).toHaveBeenCalledWith('u-1', {
      kind: 'cancel',
      clientId: C,
      payload: { clientAlertId: 'alerta-1' },
    });
    expect(deps.requestSend).toHaveBeenCalled();
    expect(deps.reiniciarDetector).toHaveBeenCalledWith(7, T);
  });

  it('sin alerta activa no hace nada', async () => {
    for (const actual of [null, sesion(), sesion({ alertClientId: 'a', alertCancelledAt: 'x' })]) {
      const { actions, deps } = montar(actual);
      expect(await actions.cancelar(7, T)).toBe('sin-alerta');
      expect(deps.enqueueOutbox).not.toHaveBeenCalled();
    }
  });
});
