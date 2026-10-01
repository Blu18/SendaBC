import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import {
  countPoints,
  createActivity,
  finishActivity,
  insertPoint,
  type ActivityType,
} from '../../lib/db/activities';
import { useAuth } from '../../context/AuthContext';
import { useLocationPermission } from './locationPermission.hook';

export type TrackerStatus = 'idle' | 'recording' | 'stopped';
// denied: se puede volver a pedir · blocked: el sistema ya no pregunta, hay que ir a ajustes (CA-3)
export type PermissionError = 'denied' | 'blocked';

export function useActivityTracker() {
  const { request } = useLocationPermission();
  const { userId } = useAuth();

  // ESTADO: cosas que la pantalla necesita mostrar (cambiarlas redibuja)
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [pointCount, setPointCount] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<PermissionError | null>(null);
  const [savedPointCount, setSavedPointCount] = useState<number | null>(null); // leído de SQLite al detener

  // REFS: cosas internas que NO se muestran (cambiarlas no redibuja)
  const subscription = useRef<Location.LocationSubscription | null>(null);
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
      setSavedPointCount(null);

      // 1. Crear la actividad del usuario de la sesión y guardar su id local
      const inicio = new Date().toISOString();
      activityId.current = await createActivity(userId, type, inicio);
      setStartedAt(inicio);
      startedAtRef.current = inicio;
      lastPointAt.current = null;
      sequence.current = 0;
      setPointCount(0);

      // 2. Empezar a escuchar la ubicación; el callback corre en cada punto nuevo
      subscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,   // solo Android: mínimo 2 s entre puntos
          distanceInterval: 5,  // ambas plataformas: mínimo 5 m de movimiento
        },
        async (loc) => {
          try {
            sequence.current += 1;
            const n = sequence.current;
            const { latitude, longitude, altitude, accuracy } = loc.coords;
            const recordedAt = new Date(loc.timestamp).toISOString();

            await insertPoint(activityId.current!, {
              sequence: n,
              latitude,
              longitude,
              altitude,
              accuracy,
              recordedAt,
            });
            lastPointAt.current = recordedAt;
            setPointCount(n);
          } catch (e) {
            console.log('Error guardando punto GPS:', e);
          }
        }
      );

      // Si la pantalla se cerró mientras arrancaba el GPS, no dejar la suscripción viva (CA-10)
      if (!mounted.current) {
        closeOnUnmount();
        return;
      }

      setStatus('recording');
    } finally {
      busy.current = false;
    }
  }, [request, userId]);

  const stop = useCallback(async () => {
    if (!subscription.current) return;

    // 1. Dejar de escuchar
    subscription.current.remove();
    subscription.current = null;

    // 2. Cerrar la actividad
    await finishActivity(activityId.current!);

    // 3. Contar lo que realmente quedó guardado (CA-8)
    setSavedPointCount(await countPoints(activityId.current!));
    setStatus('stopped');
  }, []);

  // Salir de la pantalla grabando: dejar de escuchar y cerrar la actividad con la hora
  // de su último punto (o startedAt si no tiene), igual que closeOrphanActivities (CA-10)
  const closeOnUnmount = () => {
    if (!subscription.current) return;
    subscription.current.remove();
    subscription.current = null;

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

  return { status, pointCount, startedAt, permissionError, savedPointCount, start, stop };
}