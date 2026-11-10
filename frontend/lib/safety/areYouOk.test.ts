import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UMBRALES } from './inactivity';

// Spec 008, CA-12 a CA-14 (spec 011, CA-23): areYouOk.ts conecta el detector de inactividad con
// las notificaciones y las alertas. Se simulan Expo, la base y la tarea de ubicación para ver qué
// hace con cada evento del detector y con la respuesta "Estoy bien".

type Evento = { type: string; activityLocalId: number; accion: string; estado: { programadaPara: number | null } };

const m = vi.hoisted(() => ({
  oyenteGrabacion: null as null | ((e: Evento) => void),
  oyenteRespuesta: null as null | ((r: unknown) => void),
  getSafetySession: vi.fn(),
  getRecordingActivity: vi.fn(),
  programarPregunta: vi.fn(),
  preguntarYa: vi.fn(),
  quitarPregunta: vi.fn(),
  esRespuestaEstoyBien: vi.fn(),
  reiniciarDetector: vi.fn(),
  crear: vi.fn(),
}));

vi.mock('expo-crypto', () => ({ randomUUID: () => 'uuid' }));
vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  addNotificationResponseReceivedListener: (fn: (r: unknown) => void) => {
    m.oyenteRespuesta = fn;
  },
}));
vi.mock('../db/activities', () => ({ getLastPoint: vi.fn(), getRecordingActivity: m.getRecordingActivity }));
vi.mock('../db/safety', () => ({
  enqueueOutbox: vi.fn(),
  getSafetySession: m.getSafetySession,
  markAlertCancelled: vi.fn(),
  setAlert: vi.fn(),
}));
vi.mock('.', () => ({ safetySync: { requestSend: vi.fn() } }));
vi.mock('./alertActions', () => ({ createAlertActions: () => ({ crear: m.crear }) }));
vi.mock('./locationTask', async () => ({
  UMBRALES_APP: (await import('./inactivity')).UMBRALES,
  locationProcessor: { reiniciarDetector: m.reiniciarDetector },
  onGrabacion: (fn: (e: Evento) => void) => {
    m.oyenteGrabacion = fn;
  },
}));
vi.mock('./notifications', () => ({
  programarPregunta: m.programarPregunta,
  preguntarYa: m.preguntarYa,
  quitarPregunta: m.quitarPregunta,
  esRespuestaEstoyBien: m.esRespuestaEstoyBien,
}));

const { responderEstoyBien, umbralesDeActividad } = await import('./areYouOk');

const evento = (accion: string, programadaPara: number | null = null): Evento => ({
  type: 'detector',
  activityLocalId: 7,
  accion,
  estado: { programadaPara },
});
// Deja correr las promesas que el oyente encadena sin esperar.
const pendientes = () => new Promise((r) => setTimeout(r, 0));

const DE_SESION = { quietMs: 20 * 60_000, responseMs: 5 * 60_000 };

beforeEach(() => {
  vi.clearAllMocks();
  m.getSafetySession.mockResolvedValue(DE_SESION);
  m.quitarPregunta.mockResolvedValue(undefined);
  m.crear.mockResolvedValue({ ok: true });
});

describe('areYouOk (spec 008)', () => {
  it('umbralesDeActividad usa los de la sesión (spec 011, CA-51) o los de la app sin sesión', async () => {
    expect(await umbralesDeActividad(7)).toMatchObject({ quietoMs: 20 * 60_000, respuestaMs: 5 * 60_000 });
    m.getSafetySession.mockResolvedValue(null);
    expect(await umbralesDeActividad(7)).toEqual(UMBRALES);
  });

  it('programar-pregunta agenda la notificación de respaldo con los umbrales de la sesión', async () => {
    m.oyenteGrabacion!(evento('programar-pregunta', 1_000_000));
    await pendientes();

    expect(m.programarPregunta).toHaveBeenCalledWith(
      1_000_000,
      expect.objectContaining({ quietoMs: 20 * 60_000, respuestaMs: 5 * 60_000 })
    );
  });

  it('programar-pregunta sin hora no agenda nada', async () => {
    m.oyenteGrabacion!(evento('programar-pregunta', null));
    await pendientes();

    expect(m.programarPregunta).not.toHaveBeenCalled();
  });

  it('preguntar muestra "¿Estás bien?" ahora (CA-12)', async () => {
    m.oyenteGrabacion!(evento('preguntar'));
    await pendientes();

    expect(m.preguntarYa).toHaveBeenCalledWith(expect.objectContaining({ respuestaMs: 5 * 60_000 }));
  });

  it('alertar quita la pregunta y crea la alerta por inactividad (CA-14)', async () => {
    m.oyenteGrabacion!(evento('alertar'));
    await pendientes();

    expect(m.quitarPregunta).toHaveBeenCalled();
    expect(m.crear).toHaveBeenCalledWith(7, 'INACTIVITY');
  });

  it('ignora los eventos que no son del detector', async () => {
    m.oyenteGrabacion!({ ...evento('alertar'), type: 'punto' });
    await pendientes();

    expect(m.crear).not.toHaveBeenCalled();
    expect(m.quitarPregunta).not.toHaveBeenCalled();
  });

  it('un error al crear la alerta no se escapa como promesa sin atrapar', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    m.crear.mockRejectedValue(new Error('sin base'));

    m.oyenteGrabacion!(evento('alertar'));
    await pendientes();

    expect(log).toHaveBeenCalledWith('Error creando la alerta por inactividad:', expect.any(Error));
    log.mockRestore();
  });
});

describe('responderEstoyBien (spec 008, CA-12)', () => {
  it('con una actividad en curso quita la pregunta y reinicia la detección', async () => {
    m.getRecordingActivity.mockResolvedValue({ localId: 7 });

    expect(await responderEstoyBien()).toBe(true);
    expect(m.quitarPregunta).toHaveBeenCalled();
    expect(m.reiniciarDetector).toHaveBeenCalledWith(7);
  });

  it('sin actividad en curso solo quita la pregunta', async () => {
    m.getRecordingActivity.mockResolvedValue(null);

    expect(await responderEstoyBien()).toBe(false);
    expect(m.quitarPregunta).toHaveBeenCalled();
    expect(m.reiniciarDetector).not.toHaveBeenCalled();
  });

  it('la respuesta desde la notificación solo reinicia si es "Estoy bien"', async () => {
    m.getRecordingActivity.mockResolvedValue({ localId: 7 });

    m.esRespuestaEstoyBien.mockReturnValue(false);
    m.oyenteRespuesta!({});
    await pendientes();
    expect(m.reiniciarDetector).not.toHaveBeenCalled();

    m.esRespuestaEstoyBien.mockReturnValue(true);
    m.oyenteRespuesta!({});
    await pendientes();
    expect(m.reiniciarDetector).toHaveBeenCalledWith(7);
  });
});
