import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { getDb } from '../../lib/db/sqlite';
import { useLocationPermission } from './locationPermission.hook';

export type TrackerStatus = 'idle' | 'recording' | 'stopped';

export function useActivityTracker() {
  const { request } = useLocationPermission();

  // ESTADO: cosas que la pantalla necesita mostrar (cambiarlas redibuja)
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [pointCount, setPointCount] = useState(0);

  // REFS: cosas internas que NO se muestran (cambiarlas no redibuja)
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const activityId = useRef<number | null>(null);
  const sequence = useRef(0);
  const busy = useRef(false); // evita doble toque en "Iniciar"

  const start = useCallback(async () => {
    if (busy.current || subscription.current) return;
    busy.current = true;

    try {
      const permitido = await request();
      if (!permitido) return;

      const db = await getDb();

      // 1. Crear la actividad y guardar su id local
      const result = await db.runAsync(
        `INSERT INTO activities (client_generated_id, type, status, startedAt)
         VALUES (?, ?, ?, ?)`,
        [Crypto.randomUUID(), 'HIKING', 'RECORDING', new Date().toISOString()]
      );
      activityId.current = result.lastInsertRowId;
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

            await db.runAsync(
              `INSERT INTO activity_points
               (activity_id, sequence, latitude, longitude, altitude, accuracy, recordedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                activityId.current,
                n,
                latitude,
                longitude,
                altitude,
                accuracy,
                new Date(loc.timestamp).toISOString(),
              ]
            );
            setPointCount(n);
          } catch (e) {
            console.log('Error guardando punto GPS:', e);
          }
        }
      );

      setStatus('recording');
    } finally {
      busy.current = false;
    }
  }, [request]);

  const stop = useCallback(async () => {
    if (!subscription.current) return;

    // 1. Dejar de escuchar
    subscription.current.remove();
    subscription.current = null;

    // 2. Cerrar la actividad
    const db = await getDb();
    await db.runAsync(
      `UPDATE activities SET endedAt = ?, status = 'PENDING_SYNC' WHERE local_id = ?`,
      [new Date().toISOString(), activityId.current]
    );

    setStatus('stopped');
  }, []);

  // Limpieza: si el usuario sale de la pantalla grabando, cerrar la suscripción
  useEffect(() => {
    return () => {
      subscription.current?.remove();
      subscription.current = null;
    };
  }, []);

  return { status, pointCount, start, stop };
}