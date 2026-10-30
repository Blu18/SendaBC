import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getLastPoint, getRecordingActivity, insertPoint } from '../db/activities';
import {
  enqueueOutbox,
  getDetectorState,
  getSafetySession,
  saveDetectorState,
  setLocationQueuedAt,
} from '../db/safety';
import { colors } from '../theme/colors';
import { safetySync } from '.';
import { umbralesDe } from './inactivity';
import { SAFETY_MESSAGES } from './messages';
import { createLocationProcessor, type EventoGrabacion, type UbicacionGps } from './recording';

// Grabación en segundo plano (spec 008, plan D4 y D5). Este archivo se importa en index.ts antes
// de montar la app: expo-task-manager exige definir la tarea en el ámbito global, porque Android
// puede ejecutarla sin que haya pantallas montadas.

export const LOCATION_TASK = 'sendabc-location';

// Cada cuánto se pide un punto. Sin distancia mínima: así la tarea corre aunque la persona no se
// mueva y el detector mide el tiempo quieta (D5). La distancia mínima de 5 m entre puntos
// guardados la aplica el procesador.
export const INTERVALO_MS = 10_000;

// Umbrales de la app: los de RN-4, o los cortos de EXPO_PUBLIC_SAFETY_DEBUG_MINUTES en
// desarrollo (T17).
export const UMBRALES_APP = umbralesDe(process.env.EXPO_PUBLIC_SAFETY_DEBUG_MINUTES, __DEV__);

const listeners = new Set<(evento: EventoGrabacion) => void>();

// La pantalla de actividad escucha los puntos (métricas en vivo) y T17 las acciones del detector.
export function onGrabacion(listener: (evento: EventoGrabacion) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const locationProcessor = createLocationProcessor({
  getRecordingActivity,
  getLastPoint,
  insertPoint,
  getSafetySession,
  getDetectorState,
  saveDetectorState,
  enqueueOutbox: (userId, entry) => enqueueOutbox(userId, entry),
  setLocationQueuedAt,
  requestSend: () => void safetySync.requestSend(),
  emit: (evento) => {
    for (const listener of listeners) listener(evento);
  },
  umbrales: UMBRALES_APP,
  log: (mensaje, error) => console.log(mensaje, error ?? ''),
});

export function aUbicacion(loc: Location.LocationObject): UbicacionGps {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    altitude: loc.coords.altitude,
    accuracy: loc.coords.accuracy,
    timestamp: loc.timestamp,
  };
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.log('Error en la tarea de ubicación:', error.message);
    return;
  }
  const resultado = await locationProcessor.procesar((data?.locations ?? []).map(aUbicacion));
  // Una tarea que sigue viva sin actividad en curso (p. ej. la app se cerró a media grabación y
  // la actividad se cerró al volver a abrirla) se detiene: fuera de una actividad no se rastrea
  // nada (constitución 3.5, CA-13).
  if (resultado === 'sin-actividad') await detenerTarea();
});

// Con el permiso en segundo plano: los puntos llegan aunque la pantalla esté bloqueada, con la
// notificación del servicio en primer plano de Android (D4).
export async function iniciarTarea() {
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: INTERVALO_MS,
    distanceInterval: 0,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Fitness,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: SAFETY_MESSAGES.grabandoTitulo,
      notificationBody: SAFETY_MESSAGES.grabandoCuerpo,
      notificationColor: colors.alert,
      // Cerrar la app detiene la grabación, como hasta ahora (spec 003, CA-10).
      killServiceOnDestroy: true,
    },
  });
}

export async function detenerTarea() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch (e) {
    console.log('Error deteniendo la tarea de ubicación:', e);
  }
}
