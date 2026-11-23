import { describe, expect, it, vi, type Mock } from 'vitest';
import type { LocalSafetySession } from '../db/safety';
import { createSessionActions, debeAdoptarAlerta, type SessionActionsDeps } from './sessionActions';
import { RETURN_TIME_MESSAGES } from './returnTime';

const C = '55555555-5555-4555-8555-555555555555';
const INICIO = Date.UTC(2026, 9, 29, 15, 0);
const HORA = 60 * 60_000;

const actividad = {
  clientGeneratedId: C,
  type: 'HIKING' as const,
  startedAt: new Date(INICIO).toISOString(),
  endedAt: null as string | null,
};

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
    quietMs: null,
    responseMs: null,
    ...overrides,
  };
}

type MockDeps = { [K in keyof SessionActionsDeps]: Mock };

function montar(
  actual: LocalSafetySession | null = sesion(),
  act: typeof actividad | null = actividad
) {
  const deps: MockDeps = {
    getActivity: vi.fn().mockResolvedValue(act),
    createSafetySession: vi.fn().mockResolvedValue(undefined),
    getEleccionUmbrales: vi.fn().mockResolvedValue({ quietoMin: 10, respuestaMin: 2 }),
    getSafetySession: vi.fn().mockResolvedValue(actual),
    setReturnBy: vi.fn().mockResolvedValue(undefined),
    listRecordingSessionIds: vi.fn().mockResolvedValue([]),
    countValidPoints: vi.fn().mockResolvedValue(3),
    discardActivity: vi.fn().mockResolvedValue(true),
    setAlert: vi.fn().mockResolvedValue(undefined),
    markAlertSent: vi.fn().mockResolvedValue(undefined),
    enqueueOutbox: vi.fn().mockResolvedValue(1),
    requestSend: vi.fn(),
  };
  return { actions: createSessionActions(deps as unknown as SessionActionsDeps), deps };
}

describe('iniciar (spec 008, CA-8, CA-23)', () => {
  it('crea la sesión con el id de la actividad, la encola con la hora de regreso y pide enviarla', async () => {
    const { actions, deps } = montar(null);
    const regreso = INICIO + 3 * HORA;

    expect(await actions.iniciar(7, 'u-1', regreso, INICIO)).toBe(true);

    const returnBy = new Date(regreso).toISOString();
    expect(deps.createSafetySession).toHaveBeenCalledWith(7, C, 'u-1', returnBy, { quietMs: 600_000, responseMs: 120_000 });
    expect(deps.enqueueOutbox).toHaveBeenCalledWith('u-1', {
      kind: 'session',
      clientId: C,
      payload: { type: 'HIKING', startedAt: actividad.startedAt, returnBy },
    });
    expect(deps.requestSend).toHaveBeenCalled();
  });

  it('sin hora de regreso la sesión va con returnBy null', async () => {
    const { actions, deps } = montar(null);
    await actions.iniciar(7, 'u-1', null, INICIO);
    expect(deps.createSafetySession).toHaveBeenCalledWith(7, C, 'u-1', null, { quietMs: 600_000, responseMs: 120_000 });
  });

  it('descarta una hora de regreso que ya no es válida al iniciar', async () => {
    const { actions, deps } = montar(null);
    // Se eligió antes del inicio: el servidor rechazaría la sesión completa (RN-10).
    await actions.iniciar(7, 'u-1', INICIO - 1, INICIO);
    expect(deps.createSafetySession).toHaveBeenCalledWith(7, C, 'u-1', null, { quietMs: 600_000, responseMs: 120_000 });
  });

  it('copia a la sesión los umbrales que eligió la cuenta (spec 011, CA-51)', async () => {
    const { actions, deps } = montar(null);
    deps.getEleccionUmbrales.mockResolvedValue({ quietoMin: 20, respuestaMin: 5 });

    await actions.iniciar(7, 'u-1', null, INICIO);

    expect(deps.getEleccionUmbrales).toHaveBeenCalledWith('u-1');
    expect(deps.createSafetySession).toHaveBeenCalledWith(7, C, 'u-1', null, {
      quietMs: 20 * 60_000,
      responseMs: 5 * 60_000,
    });
  });

  it('sin la actividad no crea nada', async () => {
    const { actions, deps } = montar(null, null);
    expect(await actions.iniciar(7, 'u-1', null, INICIO)).toBe(false);
    expect(deps.createSafetySession).not.toHaveBeenCalled();
    expect(deps.enqueueOutbox).not.toHaveBeenCalled();
  });
});

describe('cambiarRegreso (CA-19, CA-23)', () => {
  const ahora = INICIO + HORA;

  it('guarda la hora nueva como pendiente y encola la sesión completa', async () => {
    const { actions, deps } = montar();
    const regreso = INICIO + 4 * HORA;

    expect(await actions.cambiarRegreso(7, regreso, ahora)).toEqual({ kind: 'guardada' });

    const returnBy = new Date(regreso).toISOString();
    expect(deps.setReturnBy).toHaveBeenCalledWith(C, returnBy);
    expect(deps.enqueueOutbox).toHaveBeenCalledWith('u-1', {
      kind: 'session',
      clientId: C,
      payload: { type: 'HIKING', startedAt: actividad.startedAt, returnBy },
    });
    expect(deps.requestSend).toHaveBeenCalled();
  });

  it('quitar la hora de regreso la manda en null', async () => {
    const { actions, deps } = montar(sesion({ returnBy: new Date(INICIO + HORA * 2).toISOString() }));
    expect(await actions.cambiarRegreso(7, null, ahora)).toEqual({ kind: 'guardada' });
    expect(deps.setReturnBy).toHaveBeenCalledWith(C, null);
  });

  it('una hora que ya pasó no se guarda y devuelve el error en español', async () => {
    const { actions, deps } = montar();
    expect(await actions.cambiarRegreso(7, ahora - 60_000, ahora)).toEqual({
      kind: 'invalida',
      error: RETURN_TIME_MESSAGES.yaPaso,
    });
    expect(deps.setReturnBy).not.toHaveBeenCalled();
    expect(deps.enqueueOutbox).not.toHaveBeenCalled();
  });

  it('sin sesión de seguridad no hay hora de regreso que cambiar', async () => {
    const { actions, deps } = montar(null);
    expect(await actions.cambiarRegreso(7, INICIO + 2 * HORA, ahora)).toEqual({ kind: 'sin-sesion' });
    expect(deps.enqueueOutbox).not.toHaveBeenCalled();
  });
});

describe('terminar (CA-19, CA-21, CA-22)', () => {
  it('encola el fin de la sesión con la hora de fin y pide enviarlo', async () => {
    const { actions, deps } = montar();
    const fin = new Date(INICIO + 2 * HORA).toISOString();

    expect(await actions.terminar(7, fin)).toBe(true);

    expect(deps.enqueueOutbox).toHaveBeenCalledWith('u-1', {
      kind: 'finish',
      clientId: C,
      payload: { endedAt: fin },
    });
    expect(deps.requestSend).toHaveBeenCalled();
  });

  it('una actividad sin sesión no encola nada', async () => {
    const { actions, deps } = montar(null);
    expect(await actions.terminar(7, actividad.startedAt)).toBe(false);
    expect(deps.enqueueOutbox).not.toHaveBeenCalled();
  });
});

describe('cerrarHuerfanas', () => {
  it('termina las sesiones de las actividades que cerró, con su hora de fin', async () => {
    const fin = new Date(INICIO + HORA).toISOString();
    const { actions, deps } = montar();
    deps.listRecordingSessionIds.mockResolvedValue([7]);
    const cerrar = vi.fn(async () => {
      // Las ids se leen antes de cerrar: después ya no están en RECORDING.
      expect(deps.listRecordingSessionIds).toHaveBeenCalled();
      deps.getActivity.mockResolvedValue({ ...actividad, endedAt: fin });
      return [7];
    });

    await actions.cerrarHuerfanas(cerrar);

    expect(cerrar).toHaveBeenCalled();
    expect(deps.enqueueOutbox).toHaveBeenCalledWith('u-1', {
      kind: 'finish',
      clientId: C,
      payload: { endedAt: fin },
    });
  });

  it('sin sesiones en curso solo cierra las actividades', async () => {
    const { actions, deps } = montar();
    const cerrar = vi.fn().mockResolvedValue([]);
    await actions.cerrarHuerfanas(cerrar);
    expect(cerrar).toHaveBeenCalled();
    expect(deps.enqueueOutbox).not.toHaveBeenCalled();
    expect(deps.discardActivity).not.toHaveBeenCalled();
  });
});

describe('cerrarHuerfanas: actividades con menos de 3 puntos válidos (spec 012)', () => {
  const fin = new Date(INICIO + HORA).toISOString();

  // Huérfanas: 7 tiene sesión de seguridad, 8 no. `validos` da los puntos válidos de cada una.
  function huerfanas(validos: Record<number, number>, conSesion = [7]) {
    const montado = montar();
    const { deps } = montado;
    const orden: string[] = [];
    deps.listRecordingSessionIds.mockResolvedValue(conSesion);
    deps.getActivity.mockResolvedValue({ ...actividad, endedAt: fin });
    deps.enqueueOutbox.mockImplementation(async () => {
      orden.push('finish');
      return 1;
    });
    deps.countValidPoints.mockImplementation(async (id: number) => validos[id]);
    deps.discardActivity.mockImplementation(async (id: number) => {
      orden.push(`descartar ${id}`);
      return true;
    });
    const cerrar = vi.fn(async () => {
      orden.push('cerrar');
      return Object.keys(validos).map(Number);
    });
    return { ...montado, orden, cerrar };
  }

  it('una huérfana corta se descarta sin aviso, después de encolar finish (CA-22, CA-23, D3)', async () => {
    const { actions, deps, orden, cerrar } = huerfanas({ 7: 2 });

    await actions.cerrarHuerfanas(cerrar);

    expect(orden).toEqual(['cerrar', 'finish', 'descartar 7']);
    expect(deps.enqueueOutbox).toHaveBeenCalledWith('u-1', {
      kind: 'finish',
      clientId: C,
      payload: { endedAt: fin },
    });
  });

  it('una huérfana de 3 puntos válidos no se descarta: queda en PENDING_SYNC (CA-22)', async () => {
    const { actions, deps, orden, cerrar } = huerfanas({ 7: 3 });

    await actions.cerrarHuerfanas(cerrar);

    expect(orden).toEqual(['cerrar', 'finish']);
    expect(deps.discardActivity).not.toHaveBeenCalled();
  });

  it('también descarta las cortas sin sesión de seguridad, y solo esas', async () => {
    const { actions, deps, cerrar } = huerfanas({ 7: 5, 8: 0 });

    await actions.cerrarHuerfanas(cerrar);

    expect(deps.discardActivity).toHaveBeenCalledTimes(1);
    expect(deps.discardActivity).toHaveBeenCalledWith(8);
  });

  it('el fallo al detener: la actividad quedó en RECORDING y se resuelve al abrir la app (CA-24)', async () => {
    // "Detener" no pudo cerrarla (spec 003, CA-12): sigue en RECORDING con su sesión. Al abrir la
    // app, closeOrphanActivities la cierra, la sesión termina y, por ser corta, se descarta.
    const { actions, orden, cerrar } = huerfanas({ 7: 1 });

    await actions.cerrarHuerfanas(cerrar);

    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(orden).toEqual(['cerrar', 'finish', 'descartar 7']);
  });

  it('si el fin de la sesión no se pudo encolar, no la descarta y sigue con las demás', async () => {
    const { actions, deps, cerrar } = huerfanas({ 7: 0, 8: 0 });
    deps.enqueueOutbox.mockRejectedValue(new Error('SQLite ocupado'));

    await expect(actions.cerrarHuerfanas(cerrar)).rejects.toThrow('SQLite ocupado');

    expect(deps.discardActivity).toHaveBeenCalledTimes(1);
    expect(deps.discardActivity).toHaveBeenCalledWith(8);
  });
});

describe('alerta creada por el servidor (CA-17, CA-18)', () => {
  const remota = { id: 'srv-1', triggeredAt: '2026-10-29T18:00:00.000Z' };

  it('se adopta si la app no tiene una alerta activa', () => {
    expect(debeAdoptarAlerta(sesion(), remota)).toBe(true);
    // Una alerta anterior, ya cancelada y enviada, no impide ver la nueva.
    expect(
      debeAdoptarAlerta(
        sesion({ alertClientId: 'a', alertServerId: 'srv-0', alertCancelledAt: 'x' }),
        remota
      )
    ).toBe(true);
  });

  it('no se adopta sin alerta en el servidor, con una alerta local activa o si es la que se canceló', () => {
    expect(debeAdoptarAlerta(sesion(), null)).toBe(false);
    expect(debeAdoptarAlerta(sesion({ alertClientId: 'a', alertServerId: null }), remota)).toBe(false);
    // Cancelada en el teléfono; la cancelación sigue en la bandeja.
    expect(
      debeAdoptarAlerta(
        sesion({ alertClientId: 'srv-1', alertServerId: 'srv-1', alertCancelledAt: 'x' }),
        remota
      )
    ).toBe(false);
  });

  it('la guarda como enviada, con el id del servidor como id local', async () => {
    const { actions, deps } = montar();
    expect(await actions.adoptarAlerta(7, remota)).toBe(true);
    expect(deps.setAlert).toHaveBeenCalledWith(C, 'srv-1', remota.triggeredAt);
    expect(deps.markAlertSent).toHaveBeenCalledWith('srv-1', 'srv-1');
  });

  it('sin sesión local no hace nada', async () => {
    const { actions, deps } = montar(null);
    expect(await actions.adoptarAlerta(7, remota)).toBe(false);
    expect(deps.setAlert).not.toHaveBeenCalled();
  });
});
