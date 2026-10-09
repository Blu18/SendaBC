import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  createActivity,
  finishActivity,
  insertBarometerReading,
  insertPoint,
  type ActivityType,
} from '../../lib/db/activities';
import { finalizeMetrics } from '../../lib/db/activityMetrics';
import { createLiveMetrics } from '../../lib/metrics/summary';
import { prepareBarometer, startBarometer } from '../../lib/sensors/barometer';
import { useAuth } from '../../context/AuthContext';
import { useLocationPermission } from './locationPermission.hook';

export type TrackerStatus = 'idle' | 'recording' | 'stopped';
// denied: se puede volver a pedir · blocked: el sistema ya no pregunta, hay que ir a ajustes (CA-3)
export type PermissionError = 'denied' | 'blocked';

// Tag propio para no interferir con otros usos de keep-awake (CA-11)
const KEEP_AWAKE_TAG = 'sendabc-activity';

// Un fallo de keep-awake no debe detener ni impedir la grabación
const keepScreenOn = () =>
  activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch((e) => console.log('Error activando keep-awake:', e));
const releaseScreen = () =>
  deactivateKeepAwake(KEEP_AWAKE_TAG).catch((e) => console.log('Error desactivando keep-awake:', e));

export function useActivityTracker() {
  const { request } = useLocationPermission();
  const { userId } = useAuth();

  // ESTADO: cosas que la pantalla necesita mostrar (cambiarlas redibuja)
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [pointCount, setPointCount] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<PermissionError | null>(null);
  // Métricas en vivo, con los mismos umbrales que el resumen (spec 004, CA-15, CA-16)
  const [liveDistance, setLiveDistance] = useState(0);
  const [liveElevationGain, setLiveElevationGain] = useState(0);

  // REFS: cosas internas que NO se muestran (cambiarlas no redibuja)
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const stopBarometer = useRef<(() => void) | null>(null); // solo si la fuente es el barómetro
  // Guardados en SQLite que siguen en curso; stop() los espera antes de cerrar (spec 004, T14)
  const pendingSaves = useRef(new Set<Promise<void>>());
  const activityId = useRef<number | null>(null);
  const sequence = useRef(0);
  const busy = useRef(false); // evita doble toque en "Iniciar"
  const mounted = useRef(true);
  const startedAtRef = useRef<string | null>(null); // copia de startedAt legible desde la limpieza
  const lastPointAt = useRef<string | null>(null); // recordedAt del último punto guardado

  const start = useCallback(async (type: ActivityType) => {
    // Sin usuario de sesión no hay dueño para la actividad (RN-4)
    if (busy.current || subscription.current || !userId) return;
    busy.current = true;

    try {
      const permiso = await request();
      if (!permiso.granted) {
        setPermissionError(permiso.canAskAgain ? 'denied' : 'blocked');
        return;
      }
      setPermissionError(null);

      // 1. Fuente de la elevación: barómetro si existe y hay permiso; si no, GPS (spec 004, CA-12, CA-13)
      const elevationSource = await prepareBarometer();

      // 2. Crear la actividad del usuario de la sesión y guardar su id local
      const inicio = new Date().toISOString();
      activityId.current = await createActivity(userId, type, elevationSource, inicio);
      setStartedAt(inicio);
      startedAtRef.current = inicio;
      lastPointAt.current = null;
      sequence.current = 0;
      setPointCount(0);
      // Acumuladores en vivo de esta actividad; los callbacks del GPS y del barómetro los alimentan
      const live = createLiveMetrics(elevationSource);
      setLiveDistance(0);
      setLiveElevationGain(0);

      // 3. Empezar a escuchar la ubicación; el callback corre en cada punto nuevo
      subscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,   // solo Android: mínimo 2 s entre puntos
          distanceInterval: 5,  // ambas plataformas: mínimo 5 m de movimiento
        },
        (loc) => track(async () => {
          try {
            sequence.current += 1;
            const n = sequence.current;
            const { latitude, longitude, altitude, accuracy } = loc.coords;
            const recordedAt = new Date(loc.timestamp).toISOString();

            const point = { sequence: n, latitude, longitude, altitude, accuracy, recordedAt };
            await insertPoint(activityId.current!, point);
            lastPointAt.current = recordedAt;
            setPointCount(n);
            // En vivo solo cuenta lo que quedó guardado, igual que el resumen (RN-4)
            live.addPoint(point);
            setLiveDistance(live.distanceMeters);
            setLiveElevationGain(live.elevationGainMeters);
          } catch (e) {
            console.log('Error guardando punto GPS:', e);
          }
        })
      );

      // 4. Con barómetro, guardar cada lectura en el teléfono (spec 004, CA-14)
      if (elevationSource === 'BAROMETER') {
        const id = activityId.current;
        stopBarometer.current = startBarometer((reading) =>
          track(async () => {
            try {
              await insertBarometerReading(id, reading);
              live.addBarometerReading(reading);
              setLiveElevationGain(live.elevationGainMeters);
            } catch (e) {
              console.log('Error guardando lectura del barómetro:', e);
            }
          })
        );
      }

      // Si la pantalla se cerró mientras arrancaba el GPS, no dejar la suscripción viva (CA-10)
      if (!mounted.current) {
        closeOnUnmount();
        return;
      }

      // Pantalla encendida solo mientras se graba (CA-11)
      keepScreenOn();
      setStatus('recording');
    } finally {
      busy.current = false;
    }
  }, [request, userId]);

  // Detiene la grabación y devuelve el local_id de la actividad para abrir su resumen
  // (spec 004, CA-1, CA-18), o null si no había una grabación en curso.
  const stop = useCallback(async () => {
    if (!subscription.current) return null;
    const id = activityId.current!;

    // 1. Dejar de escuchar el GPS y el barómetro
    subscription.current.remove();
    subscription.current = null;
    stopListeningBarometer();
    releaseScreen();

    // 2. Esperar los guardados en curso, para que el último punto no quede fuera de la
    //    actividad ni se guarde en una ya cerrada (corrige O1 de la spec 003)
    await Promise.all(pendingSaves.current);

    // 3. Cerrar la actividad
    await finishActivity(id);

    // 4. Calcular y guardar sus métricas con lo guardado en SQLite (RN-4). Si falla,
    //    computeMissingMetrics() las calcula al volver a abrir la app (CA-19)
    try {
      await finalizeMetrics(id);
    } catch (e) {
      console.log('Error calculando métricas al detener:', e);
    }

    setStatus('stopped');
    return id;
  }, []);

  // Registra un guardado en curso hasta que termine. Las tareas atrapan sus errores.
  const track = (save: () => Promise<void>) => {
    const promise = save().finally(() => pendingSaves.current.delete(promise));
    pendingSaves.current.add(promise);
  };

  // El barómetro solo se escucha entre "Iniciar" y "Detener" (constitución 3.5, spec 004 CA-14)
  const stopListeningBarometer = () => {
    stopBarometer.current?.();
    stopBarometer.current = null;
  };

  // Salir de la pantalla grabando: dejar de escuchar y cerrar la actividad con la hora
  // de su último punto (o startedAt si no tiene), igual que closeOrphanActivities (CA-10)
  const closeOnUnmount = () => {
    stopListeningBarometer();
    if (!subscription.current) return;
    subscription.current.remove();
    subscription.current = null;
    releaseScreen();

    const id = activityId.current;
    const endedAt = lastPointAt.current ?? startedAtRef.current;
    if (id == null || !endedAt) return;
    finishActivity(id, endedAt).catch((e) => {
      // Si falla, closeOrphanActivities la cierra al volver a abrir la app (T12)
      console.log('Error cerrando actividad al salir:', e);
    });
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      closeOnUnmount();
    };
  }, []);

  return {
    status,
    pointCount,
    startedAt,
    permissionError,
    liveDistance,
    liveElevationGain,
    start,
    stop,
  };
}