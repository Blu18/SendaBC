import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  createActivity,
  finishActivity,
  insertBarometerReading,
  type ActivityType,
} from '../../lib/db/activities';
import { finalizeMetrics } from '../../lib/db/activityMetrics';
import { getDetectorState, saveDetectorState } from '../../lib/db/safety';
import { syncEngine } from '../../lib/sync';
import { createLiveMetrics } from '../../lib/metrics/summary';
import { prepareBarometer, startBarometer } from '../../lib/sensors/barometer';
import { detener } from '../../lib/safety/inactivity';
import {
  aUbicacion,
  detenerTarea,
  iniciarTarea,
  INTERVALO_MS,
  locationProcessor,
  onGrabacion,
} from '../../lib/safety/locationTask';
import { quitarPregunta } from '../../lib/safety/notifications';
import { sessionActions } from '../../lib/safety';
import { useAuth } from '../../context/AuthContext';
import { useLocationPermission } from './locationPermission.hook';

export type TrackerStatus = 'idle' | 'recording' | 'stopped';
// denied: se puede volver a pedir · blocked: el sistema ya no pregunta, hay que ir a ajustes (CA-3)
export type PermissionError = 'denied' | 'blocked';
// background: tarea de expo-task-manager, sigue con la pantalla bloqueada (spec 008, D4).
// foreground: watchPositionAsync con la pantalla encendida, como en la spec 003 (sin el permiso
// en segundo plano, CA-10).
export type TrackerMode = 'background' | 'foreground';

export type StartOptions = {
  // Explica para qué es el permiso en segundo plano y dice si el usuario quiere darlo. Solo se
  // pasa con contactos activos: sin ellos no hay a quién avisar (spec 008, CA-10).
  explicarSegundoPlano?: () => Promise<boolean>;
  // Se llama con la actividad ya creada y antes de empezar a grabar, para crear su sesión de
  // seguridad: el detector solo corre si existe (spec 008, T18). Un fallo no impide grabar
  // (constitución 2.1).
  alCrear?: (localId: number) => Promise<unknown>;
};

// Tag propio para no interferir con otros usos de keep-awake (CA-11)
const KEEP_AWAKE_TAG = 'sendabc-activity';

// Un fallo de keep-awake no debe detener ni impedir la grabación
const keepScreenOn = () =>
  activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch((e) => console.log('Error activando keep-awake:', e));
const releaseScreen = () =>
  deactivateKeepAwake(KEEP_AWAKE_TAG).catch((e) => console.log('Error desactivando keep-awake:', e));

// La detección de inactividad deja de correr al terminar la actividad, y la pregunta pendiente
// se quita (spec 008, CA-13).
async function detenerDetector(localId: number) {
  await quitarPregunta().catch(() => {});
  try {
    const estado = await getDetectorState(localId);
    if (estado) await saveDetectorState(localId, detener(estado));
  } catch (e) {
    console.log('Error deteniendo el detector:', e);
  }
}

// ¿Hay permiso en segundo plano? Si no, y hay a quién avisar, lo explica y lo pide (CA-10). La
// app funciona sin él (constitución 3.5).
async function permisoSegundoPlano(opciones: StartOptions) {
  const actual = await Location.getBackgroundPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain || !opciones.explicarSegundoPlano) return false;
  if (!(await opciones.explicarSegundoPlano())) return false;
  return (await Location.requestBackgroundPermissionsAsync()).granted;
}

export function useActivityTracker() {
  const { request } = useLocationPermission();
  const { userId } = useAuth();

  // ESTADO: cosas que la pantalla necesita mostrar (cambiarlas redibuja)
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [mode, setMode] = useState<TrackerMode | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  // Id local de la actividad en curso, para "¿Estás bien?" y la seguridad (spec 008)
  const [activityLocalId, setActivityLocalId] = useState<number | null>(null);
  const [permissionError, setPermissionError] = useState<PermissionError | null>(null);
  // Métricas en vivo, con los mismos umbrales que el resumen (spec 004, CA-15, CA-16)
  // No se pudo cerrar la actividad al detener (spec 003, CA-12)
  const [stopFailed, setStopFailed] = useState(false);
  const [liveDistance, setLiveDistance] = useState(0);
  const [liveElevationGain, setLiveElevationGain] = useState(0);

  // REFS: cosas internas que NO se muestran (cambiarlas no redibuja)
  const modeRef = useRef<TrackerMode | null>(null); // hay una grabación en curso si no es null
  const subscription = useRef<Location.LocationSubscription | null>(null); // solo en foreground
  const tick = useRef<ReturnType<typeof setInterval> | null>(null); // solo en foreground
  const stopGrabacion = useRef<(() => void) | null>(null); // escucha de los puntos guardados
  const stopBarometer = useRef<(() => void) | null>(null); // solo si la fuente es el barómetro
  // Guardados en SQLite que siguen en curso; stop() los espera antes de cerrar (spec 004, T14)
  const pendingSaves = useRef(new Set<Promise<void>>());
  const activityId = useRef<number | null>(null);
  const busy = useRef(false); // evita doble toque en "Iniciar"
  const mounted = useRef(true);
  const startedAtRef = useRef<string | null>(null); // copia de startedAt legible desde la limpieza
  const lastPointAt = useRef<string | null>(null); // recordedAt del último punto guardado

  const start = useCallback(async (type: ActivityType, opciones: StartOptions = {}) => {
    // Sin usuario de sesión no hay dueño para la actividad (RN-4)
    if (busy.current || modeRef.current || !userId) return;
    busy.current = true;

    try {
      const permiso = await request();
      if (!permiso.granted) {
        setPermissionError(permiso.canAskAgain ? 'denied' : 'blocked');
        return;
      }
      setPermissionError(null);
      // Con el permiso de primer plano ya concedido se puede pedir el de segundo plano (D4).
      const modo: TrackerMode = (await permisoSegundoPlano(opciones)) ? 'background' : 'foreground';

      // 1. Fuente de la elevación: barómetro si existe y hay permiso; si no, GPS (spec 004, CA-12, CA-13)
      const elevationSource = await prepareBarometer();

      // 2. Crear la actividad del usuario de la sesión y guardar su id local
      const inicio = new Date().toISOString();
      activityId.current = await createActivity(userId, type, elevationSource, inicio);
      setActivityLocalId(activityId.current);
      setStartedAt(inicio);
      startedAtRef.current = inicio;
      lastPointAt.current = null;
      setPointCount(0);
      if (opciones.alCrear) {
        await opciones
          .alCrear(activityId.current)
          .catch((e) => console.log('Error creando la sesión de seguridad:', e));
      }
      // Acumuladores en vivo de esta actividad; los puntos guardados y el barómetro los alimentan
      const live = createLiveMetrics(elevationSource);
      setLiveDistance(0);
      setLiveElevationGain(0);

      // 3. Los puntos los guarda el procesador de ubicaciones (lib/safety/recording), en los dos
      //    modos; aquí solo se escuchan para las métricas en vivo. En vivo solo cuenta lo que
      //    quedó guardado, igual que el resumen (RN-4).
      const id = activityId.current;
      stopGrabacion.current = onGrabacion((evento) => {
        if (evento.type !== 'punto' || evento.activityLocalId !== id) return;
        lastPointAt.current = evento.point.recordedAt;
        setPointCount(evento.point.sequence);
        live.addPoint(evento.point);
        setLiveDistance(live.distanceMeters);
        setLiveElevationGain(live.elevationGainMeters);
      });

      modeRef.current = modo;
      if (modo === 'background') {
        await iniciarTarea();
      } else {
        subscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000, // solo Android: mínimo 2 s entre puntos
            distanceInterval: 0, // los 5 m entre puntos guardados los aplica el procesador
          },
          (loc) => track(() => locationProcessor.procesar([aUbicacion(loc)]).then(() => {}))
        );
        // Sin puntos (quieto, sin señal) el detector también tiene que correr (CA-11).
        tick.current = setInterval(
          () => track(() => locationProcessor.procesar([]).then(() => {})),
          INTERVALO_MS
        );
      }
      setMode(modo);

      // 4. Con barómetro, guardar cada lectura en el teléfono (spec 004, CA-14)
      if (elevationSource === 'BAROMETER') {
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

      // Si la pantalla se cerró mientras arrancaba el GPS, no dejar la grabación viva (CA-10)
      if (!mounted.current) {
        closeOnUnmount();
        return;
      }

      // Pantalla encendida solo mientras se graba y solo si no hay grabación en segundo plano
      // (CA-11; spec 008, D4)
      if (modo === 'foreground') keepScreenOn();
      setStatus('recording');
    } finally {
      busy.current = false;
    }
  }, [request, userId]);

  // Deja de escuchar el GPS (o detiene la tarea), el barómetro y los puntos guardados.
  const dejarDeGrabar = () => {
    const modo = modeRef.current;
    modeRef.current = null;
    stopListeningBarometer();
    stopGrabacion.current?.();
    stopGrabacion.current = null;
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
    subscription.current?.remove();
    subscription.current = null;
    if (modo === 'background') track(() => detenerTarea());
    else releaseScreen();
    return modo !== null;
  };

  // Detiene la grabación y devuelve el local_id de la actividad para abrir su resumen
  // (spec 004, CA-1, CA-18), o null si no había una grabación en curso.
  const stop = useCallback(async () => {
    if (!modeRef.current) return null;
    const id = activityId.current!;

    // 1. Dejar de escuchar el GPS (o detener la tarea) y el barómetro
    dejarDeGrabar();

    // 2. Esperar los guardados en curso, para que el último punto no quede fuera de la
    //    actividad ni se guarde en una ya cerrada (corrige O1 de la spec 003)
    await Promise.all(pendingSaves.current);
    await locationProcessor.esperar();
    await detenerDetector(id);

    // 3. Cerrar la actividad. Si falla, la grabación ya se detuvo: se avisa en pantalla en lugar
    //    de dejarla en "Detener", y closeOrphanActivities() la cierra al abrir la app (CA-12, O3)
    const fin = new Date().toISOString();
    try {
      await finishActivity(id, fin);
    } catch (e) {
      console.log('Error cerrando la actividad al detener:', e);
      setStopFailed(true);
      setStatus('stopped');
      return null;
    }

    // La sesión de seguridad también termina: el servidor ya no avisa por la hora de regreso
    // (spec 008, CA-19, CA-22). Sin conexión queda en la bandeja.
    await sessionActions
      .terminar(id, fin)
      .catch((e) => console.log('Error terminando la sesión de seguridad:', e));

    // 4. Calcular y guardar sus métricas con lo guardado en SQLite (RN-4). Si falla,
    //    computeMissingMetrics() las calcula al volver a abrir la app (CA-19)
    try {
      await finalizeMetrics(id);
    } catch (e) {
      console.log('Error calculando métricas al detener:', e);
    }

    // 5. Subirla en cuanto haya conexión (spec 005, CA-1). Sin await: el resumen se muestra
    //    de inmediato y la subida corre aparte (CA-4). Sin métricas no se sube (CA-3).
    void syncEngine.requestSync();

    setStatus('stopped');
    return id;
  }, []);

  // Registra un guardado en curso hasta que termine. Las tareas atrapan sus errores.
  const track = (save: () => Promise<void>) => {
    const promise = save()
      .catch((e) => console.log('Error en un guardado de la grabación:', e))
      .finally(() => pendingSaves.current.delete(promise));
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
    if (!dejarDeGrabar()) return;

    const id = activityId.current;
    const endedAt = lastPointAt.current ?? startedAtRef.current;
    if (id == null || !endedAt) return;
    void detenerDetector(id);
    finishActivity(id, endedAt)
      .then(() => sessionActions.terminar(id, endedAt))
      .catch((e) => {
        // Si falla, closeOrphanActivities la cierra al volver a abrir la app (T12), junto con su
        // sesión de seguridad
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
    mode,
    activityLocalId,
    pointCount,
    startedAt,
    permissionError,
    stopFailed,
    liveDistance,
    liveElevationGain,
    start,
    stop,
  };
}
