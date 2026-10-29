import { describe, expect, it, vi, type Mock } from 'vitest';
import type { ActivityPointInput } from '../db/activities';
import type { LocalSafetySession } from '../db/safety';
import { iniciarDetector, UMBRALES, type EstadoDetector } from './inactivity';
import {
  createLocationProcessor,
  debeGuardarPunto,
  hayAlertaActiva,
  type EventoGrabacion,
  type RecordingDeps,
  type UbicacionGps,
} from './recording';

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 26, 16, 0);
const BASE = { latitude: 32.0471, longitude: -115.4614 };
const C = '44444444-4444-4444-8444-444444444444';

// `metros` al norte de BASE.
function gps(metros = 0, t = T0, accuracy: number | null = 5): UbicacionGps {
  return {
    latitude: BASE.latitude + metros / 111_195,
    longitude: BASE.longitude,
    altitude: 100,
    accuracy,
    timestamp: t,
  };
}

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

type MockDeps = { [K in keyof Required<RecordingDeps>]: Mock };

// Una actividad en curso con sus puntos y su detector en memoria.
function montar(opciones: { conSesion?: boolean; sesion?: Partial<LocalSafetySession> } = {}) {
  const puntos: ActivityPointInput[] = [];
  let detector: EstadoDetector | null = null;
  let actual: LocalSafetySession | null =
    opciones.conSesion === false ? null : sesion(opciones.sesion);
  const eventos: EventoGrabacion[] = [];

  const deps: MockDeps = {
    getRecordingActivity: vi
      .fn()
      .mockResolvedValue({ localId: 7, userId: 'u-1', startedAt: new Date(T0).toISOString() }),
    getLastPoint: vi.fn(async () => puntos.at(-1) ?? null),
    insertPoint: vi.fn(async (_id: number, p: ActivityPointInput) => {
      puntos.push(p);
    }),
    getSafetySession: vi.fn(async () => actual),
    getDetectorState: vi.fn(async () => detector),
    saveDetectorState: vi.fn(async (_id: number, e: EstadoDetector) => {
      detector = e;
    }),
    enqueueOutbox: vi.fn().mockResolvedValue(1),
    setLocationQueuedAt: vi.fn(async (_c: string, at: number) => {
      if (actual) actual = { ...actual, locationQueuedAt: at };
    }),
    requestSend: vi.fn(),
    emit: vi.fn((e: EventoGrabacion) => {
      eventos.push(e);
    }),
    umbrales: UMBRALES as never,
    log: vi.fn(),
  };
  const processor = createLocationProcessor(deps as unknown as RecordingDeps);
  return { processor, deps, puntos, eventos, detector: () => detector };
}

describe('debeGuardarPunto (spec 003)', () => {
  it('guarda el primero y los que están a 5 m o más del anterior', () => {
    expect(debeGuardarPunto(null, gps())).toBe(true);
    expect(debeGuardarPunto(gps(), gps(4.9))).toBe(false);
    expect(debeGuardarPunto(gps(), gps(5.1))).toBe(true);
  });
});

describe('hayAlertaActiva', () => {
  it('solo con una alerta que no se canceló', () => {
    expect(hayAlertaActiva(sesion())).toBe(false);
    expect(hayAlertaActiva(sesion({ alertClientId: 'a' }))).toBe(true);
    expect(hayAlertaActiva(sesion({ alertClientId: 'a', alertCancelledAt: 'x' }))).toBe(false);
  });
});

describe('createLocationProcessor (spec 008, T16)', () => {
  it('guarda los puntos a 5 m o más del anterior, con secuencia creciente y la hora del GPS', async () => {
    const { processor, puntos, eventos } = montar();

    await processor.procesar([gps(0, T0)], T0);
    await processor.procesar([gps(3, T0 + 10_000)], T0 + 10_000);
    await processor.procesar([gps(20, T0 + 20_000)], T0 + 20_000);

    expect(puntos.map((p) => p.sequence)).toEqual([1, 2]);
    expect(puntos[1]).toMatchObject({
      latitude: gps(20).latitude,
      altitude: 100,
      accuracy: 5,
      recordedAt: new Date(T0 + 20_000).toISOString(),
    });
    expect(eventos.filter((e) => e.type === 'punto')).toHaveLength(2);
  });

  it('procesa un lote en orden de hora aunque llegue desordenado', async () => {
    const { processor, puntos } = montar();

    await processor.procesar([gps(40, T0 + 20_000), gps(0, T0), gps(20, T0 + 10_000)], T0 + 20_000);

    expect(puntos.map((p) => p.recordedAt)).toEqual([
      new Date(T0).toISOString(),
      new Date(T0 + 10_000).toISOString(),
      new Date(T0 + 20_000).toISOString(),
    ]);
  });

  it('sin actividad en curso no hace nada (CA-13)', async () => {
    const { processor, deps } = montar();
    deps.getRecordingActivity.mockResolvedValue(null);

    expect(await processor.procesar([gps()], T0)).toBe('sin-actividad');
    expect(deps.insertPoint).not.toHaveBeenCalled();
    expect(deps.saveDetectorState).not.toHaveBeenCalled();
  });

  it('sin sesión de seguridad graba los puntos pero no vigila ni envía nada', async () => {
    const { processor, deps, puntos } = montar({ conSesion: false });

    await processor.procesar([gps()], T0);

    expect(puntos).toHaveLength(1);
    expect(deps.saveDetectorState).not.toHaveBeenCalled();
    expect(deps.enqueueOutbox).not.toHaveBeenCalled();
  });

  it('pasa cada ubicación por el detector, empezando en el inicio de la actividad, y guarda su estado', async () => {
    const { processor, detector, eventos } = montar();

    await processor.procesar([gps()], T0 + MIN);

    expect(detector()).toMatchObject({ fase: 'vigilando', quietoDesde: T0 });
    expect(eventos).toContainEqual(
      expect.objectContaining({ type: 'detector', accion: 'programar-pregunta' })
    );
  });

  it('quieto 10 min avisa "preguntar" y a los 12 "alertar" (CA-11, CA-14)', async () => {
    const { processor, eventos } = montar();

    for (let s = 0; s <= 12 * 60; s += 10) {
      await processor.procesar([gps(0, T0 + s * 1000)], T0 + s * 1000);
    }

    const acciones = eventos.flatMap((e) => (e.type === 'detector' ? [e.accion] : []));
    expect(acciones).toEqual(['programar-pregunta', 'preguntar', 'alertar']);
  });

  it('sin puntos, el detector corre igual con el paso del tiempo', async () => {
    const { processor, deps, eventos } = montar();

    await processor.procesar([], T0 + 10 * MIN);

    expect(deps.insertPoint).not.toHaveBeenCalled();
    expect(eventos).toContainEqual(expect.objectContaining({ type: 'detector', accion: 'preguntar' }));
  });

  it('el detector usa el reloj del teléfono, no la hora del GPS', async () => {
    const { processor, detector } = montar();

    // GPS desfasado una hora hacia atrás.
    await processor.procesar([gps(0, T0 - 60 * MIN)], T0 + MIN);
    await processor.procesar([gps(100, T0 - 59 * MIN)], T0 + 2 * MIN);

    expect(detector()?.quietoDesde).toBe(T0 + 2 * MIN);
  });

  it('encola la ubicación para el servidor cada 5 min y pide enviarla (CA-20)', async () => {
    const { processor, deps } = montar();

    await processor.procesar([gps(0, T0)], T0);
    await processor.procesar([gps(50, T0 + 4 * MIN)], T0 + 4 * MIN);
    await processor.procesar([gps(100, T0 + 5 * MIN)], T0 + 5 * MIN);

    expect(deps.enqueueOutbox).toHaveBeenCalledTimes(2);
    expect(deps.enqueueOutbox.mock.calls[1]).toEqual([
      'u-1',
      {
        kind: 'location',
        clientId: C,
        payload: {
          latitude: gps(100).latitude,
          longitude: BASE.longitude,
          recordedAt: new Date(T0 + 5 * MIN).toISOString(),
        },
      },
    ]);
    expect(deps.setLocationQueuedAt).toHaveBeenLastCalledWith(C, T0 + 5 * MIN);
    expect(deps.requestSend).toHaveBeenCalledTimes(2);
  });

  it('con una alerta activa la encola cada minuto (CA-16)', async () => {
    const { processor, deps } = montar({ sesion: { alertClientId: 'a' } });

    await processor.procesar([gps(0, T0)], T0);
    await processor.procesar([gps(50, T0 + MIN)], T0 + MIN);

    expect(deps.enqueueOutbox).toHaveBeenCalledTimes(2);
  });

  it('sin puntos no encola ubicación', async () => {
    const { processor, deps } = montar();
    await processor.procesar([], T0);
    expect(deps.enqueueOutbox).not.toHaveBeenCalled();
  });

  it('dos llamadas seguidas no se encimen: no guardan el mismo punto dos veces', async () => {
    const { processor, puntos } = montar();

    await Promise.all([
      processor.procesar([gps(0, T0)], T0),
      processor.procesar([gps(0, T0 + 1000)], T0 + 1000),
    ]);

    expect(puntos).toHaveLength(1);
  });

  it('un error de SQLite no detiene la grabación: se registra y sigue', async () => {
    const { processor, deps, puntos } = montar();
    deps.insertPoint.mockRejectedValueOnce(new Error('database is locked'));

    expect(await processor.procesar([gps(0, T0)], T0)).toBe('procesado');
    await processor.procesar([gps(0, T0 + 10_000)], T0 + 10_000);

    expect(deps.log).toHaveBeenCalled();
    expect(puntos).toHaveLength(1);
  });

  it('usa el estado guardado del detector si ya existía', async () => {
    const { processor, deps, eventos } = montar();
    deps.getDetectorState.mockResolvedValue({ ...iniciarDetector(T0), programadaPara: T0 + 10 * MIN, programadaEn: T0 });

    await processor.procesar([gps()], T0 + 30_000);

    expect(eventos.filter((e) => e.type === 'detector')).toEqual([]);
  });
});

describe('esperar', () => {
  it('resuelve cuando termina lo que estaba en proceso', async () => {
    const { processor, deps, puntos } = montar();
    let soltar!: () => void;
    deps.insertPoint.mockImplementationOnce(
      (_id: number, p: ActivityPointInput) =>
        new Promise<void>((resolve) => {
          soltar = () => {
            puntos.push(p);
            resolve();
          };
        })
    );

    void processor.procesar([gps()], T0);
    let listo = false;
    const espera = processor.esperar().then(() => {
      listo = true;
    });
    await vi.waitFor(() => expect(deps.insertPoint).toHaveBeenCalled());
    expect(listo).toBe(false);

    soltar();
    await espera;
    expect(puntos).toHaveLength(1);
  });
});

describe('reiniciarDetector (CA-12)', () => {
  it('"Estoy bien" deja el detector vigilando desde ahora', async () => {
    const { processor, detector } = montar();
    await processor.procesar([], T0 + 10 * MIN);
    expect(detector()?.fase).toBe('preguntando');

    const reiniciado = await processor.reiniciarDetector(7, T0 + 11 * MIN);

    expect(reiniciado).toMatchObject({ fase: 'vigilando', quietoDesde: T0 + 11 * MIN });
    expect(detector()).toEqual(reiniciado);
  });

  it('sin detector no hace nada', async () => {
    const { processor, deps } = montar();
    expect(await processor.reiniciarDetector(7, T0)).toBeNull();
    expect(deps.saveDetectorState).not.toHaveBeenCalled();
  });

  it('corre en la cola: un punto que llega a la vez no pisa el reinicio', async () => {
    const { processor, deps, detector } = montar();
    await processor.procesar([], T0 + 10 * MIN);
    // El punto lee el estado "preguntando" despacio; el reinicio espera su turno.
    let soltar!: () => void;
    const lectura = deps.getDetectorState.getMockImplementation()!;
    deps.getDetectorState.mockImplementationOnce(
      () => new Promise((resolve) => (soltar = () => resolve(lectura(7))))
    );

    const punto = processor.procesar([gps(0, T0 + 11 * MIN)], T0 + 11 * MIN);
    const reinicio = processor.reiniciarDetector(7, T0 + 11 * MIN);
    await vi.waitFor(() => expect(soltar).toBeDefined());
    soltar();
    await punto;
    await reinicio;

    expect(detector()?.fase).toBe('vigilando');
  });
});
