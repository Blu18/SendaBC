import type { ActivityPointInput } from '../db/activities';
import type { LocalSafetySession } from '../db/safety';
import { haversineMeters, type Coordinates } from '../metrics/geo';
import {
  evaluar,
  iniciarDetector,
  reiniciar,
  UMBRALES,
  type AccionDetector,
  type EstadoDetector,
  type Umbrales,
} from './inactivity';
import { tocaEncolarUbicacion, type OutboxEntry } from './outbox';

// Procesa las ubicaciones de una actividad en curso (spec 008, T16): las guarda, las pasa por el
// detector de inactividad y encola la ubicación para el servidor. Lo usan la tarea en segundo
// plano y, sin ese permiso, la grabación con la pantalla encendida, para que la detección sea la
// misma en los dos modos (CA-10). Sin dependencias de React Native: se prueba con dependencias
// simuladas.

// Un punto a menos de esto del anterior no se guarda, como con distanceInterval: 5 (spec 003).
// La tarea pide un punto cada 10 s aunque la persona no se mueva, para que corra el detector.
export const MIN_DISTANCIA_PUNTO_M = 5;

export function debeGuardarPunto(ultimo: Coordinates | null, nuevo: Coordinates) {
  return ultimo === null || haversineMeters(ultimo, nuevo) >= MIN_DISTANCIA_PUNTO_M;
}

// La alerta está activa si hay una y no se canceló (lib/db/safety).
export function hayAlertaActiva(
  sesion: Pick<LocalSafetySession, 'alertClientId' | 'alertCancelledAt'>
) {
  return sesion.alertClientId !== null && sesion.alertCancelledAt === null;
}

export type UbicacionGps = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number; // ms
};

export type EventoGrabacion =
  // Un punto guardado: la pantalla actualiza las métricas en vivo (spec 004, CA-15).
  | { type: 'punto'; activityLocalId: number; point: ActivityPointInput }
  // El detector pidió algo (preguntar, alertar, reprogramar la notificación); lo atiende T17.
  | { type: 'detector'; activityLocalId: number; accion: AccionDetector; estado: EstadoDetector };

export type RecordingDeps = {
  getRecordingActivity(): Promise<{ localId: number; userId: string | null; startedAt: string } | null>;
  getLastPoint(localId: number): Promise<ActivityPointInput | null>;
  insertPoint(localId: number, point: ActivityPointInput): Promise<void>;
  getSafetySession(localId: number): Promise<LocalSafetySession | null>;
  getDetectorState(localId: number): Promise<EstadoDetector | null>;
  saveDetectorState(localId: number, estado: EstadoDetector): Promise<void>;
  enqueueOutbox(userId: string, entry: OutboxEntry): Promise<number>;
  setLocationQueuedAt(clientId: string, at: number): Promise<void>;
  requestSend(): void;
  emit(evento: EventoGrabacion): void;
  umbrales?: Umbrales;
  log?(mensaje: string, error?: unknown): void;
};

export type ResultadoProceso = 'procesado' | 'sin-actividad';

export function createLocationProcessor(deps: RecordingDeps) {
  const log = deps.log ?? (() => {});
  // Las ubicaciones se procesan de una en una: dos llamadas seguidas no deben leer el mismo
  // último punto ni el mismo estado del detector.
  let cola: Promise<unknown> = Promise.resolve();

  // Corre fn en esa misma cola: un cambio al detector ("Estoy bien", cancelar la alerta) no se
  // cruza con un punto que llega al mismo tiempo y pisaría el cambio.
  function enCola<T>(fn: () => Promise<T>): Promise<T> {
    const actual = cola.then(fn);
    cola = actual.catch(() => {});
    return actual;
  }

  async function procesarUna(
    actividad: { localId: number; userId: string | null; startedAt: string },
    ubicacion: UbicacionGps | null,
    ahora: number
  ) {
    const id = actividad.localId;

    if (ubicacion) {
      const ultimo = await deps.getLastPoint(id);
      if (debeGuardarPunto(ultimo, ubicacion)) {
        const point: ActivityPointInput = {
          sequence: (ultimo?.sequence ?? 0) + 1,
          latitude: ubicacion.latitude,
          longitude: ubicacion.longitude,
          altitude: ubicacion.altitude,
          accuracy: ubicacion.accuracy,
          recordedAt: new Date(ubicacion.timestamp).toISOString(),
        };
        await deps.insertPoint(id, point);
        deps.emit({ type: 'punto', activityLocalId: id, point });
      }
    }

    // Sin sesión de seguridad no se vigila nada: la actividad se graba como en la spec 003.
    const sesion = await deps.getSafetySession(id);
    if (!sesion) return;

    const previo =
      (await deps.getDetectorState(id)) ?? iniciarDetector(new Date(actividad.startedAt).getTime());
    const { estado, accion } = evaluar(previo, ubicacion, ahora, deps.umbrales ?? UMBRALES);
    await deps.saveDetectorState(id, estado);
    if (accion !== 'nada') deps.emit({ type: 'detector', activityLocalId: id, accion, estado });

    // La ubicación va al servidor cada 5 min, o cada minuto con una alerta activa (CA-20, D7).
    if (ubicacion && tocaEncolarUbicacion(sesion.locationQueuedAt, ahora, hayAlertaActiva(sesion))) {
      await deps.enqueueOutbox(sesion.userId, {
        kind: 'location',
        clientId: sesion.clientGeneratedId,
        payload: {
          latitude: ubicacion.latitude,
          longitude: ubicacion.longitude,
          recordedAt: new Date(ubicacion.timestamp).toISOString(),
        },
      });
      await deps.setLocationQueuedAt(sesion.clientGeneratedId, ahora);
      deps.requestSend();
    }
  }

  // Procesa las ubicaciones que entregó el GPS, en orden. Con una lista vacía solo corre el
  // detector: así pregunta aunque no lleguen puntos (sin señal, quieto bajo techo).
  async function procesar(ubicaciones: UbicacionGps[], ahora = Date.now()): Promise<ResultadoProceso> {
    return enCola(async (): Promise<ResultadoProceso> => {
      const actividad = await deps.getRecordingActivity();
      if (!actividad) return 'sin-actividad';
      const ordenadas = [...ubicaciones].sort((a, b) => a.timestamp - b.timestamp);
      try {
        if (ordenadas.length === 0) await procesarUna(actividad, null, ahora);
        // El detector usa siempre el reloj del teléfono: la hora del GPS puede venir desfasada y
        // haría saltar el tiempo sin moverse. La del punto se guarda tal cual en recordedAt.
        for (const ubicacion of ordenadas) await procesarUna(actividad, ubicacion, ahora);
      } catch (error) {
        // Un error de SQLite con un punto no debe detener la grabación.
        log('Error procesando la ubicación', error);
      }
      return 'procesado';
    });
  }

  // "Estoy bien" (CA-12) o cancelar la alerta (RN-8): la detección vuelve a empezar desde ahora.
  // Devuelve el estado nuevo, o null si la actividad no tiene detector.
  function reiniciarDetector(localId: number, ahora = Date.now()): Promise<EstadoDetector | null> {
    return enCola(async () => {
      const estado = await deps.getDetectorState(localId);
      if (!estado) return null;
      const reiniciado = reiniciar(estado, ahora);
      await deps.saveDetectorState(localId, reiniciado);
      return reiniciado;
    });
  }

  // Espera a que termine lo que está en proceso, para que al detener el último punto no quede
  // fuera de la actividad ni se guarde en una ya cerrada (como pendingSaves en la spec 004).
  function esperar(): Promise<void> {
    return cola.then(() => undefined);
  }

  return { procesar, esperar, enCola, reiniciarDetector };
}

export type LocationProcessor = ReturnType<typeof createLocationProcessor>;
