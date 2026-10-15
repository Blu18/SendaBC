import { useEffect, useRef, useState } from 'react';
import { useSyncDataChanged } from '../../context/SyncContext';
import { countPoints, getActivity, type Activity } from '../../lib/db/activities';
import { finalizeMetrics } from '../../lib/db/activityMetrics';

// Lee de SQLite una actividad terminada y su número de puntos (spec 004, CA-1, CA-21, RN-4).
// Si sus métricas siguen pendientes (falló el cálculo al detener), las calcula aquí.
// Se vuelve a leer cuando la sincronización la marca, para que su estado pase de "Pendiente
// de subir" a "Sincronizada" sin salir del resumen (spec 005, CA-14).
export function useActivitySummary(localId: number) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const montada = useRef(true);

  useEffect(() => {
    montada.current = true;
    (async () => {
      try {
        let found = await getActivity(localId);
        if (found && found.distanceMeters === null && found.endedAt) {
          await finalizeMetrics(localId);
          found = await getActivity(localId);
        }
        const points = await countPoints(localId);
        if (!montada.current) return;
        setActivity(found);
        setPointCount(points);
      } catch (e) {
        console.log('Error cargando el resumen de la actividad:', e);
      } finally {
        if (montada.current) setLoading(false);
      }
    })();
    return () => {
      montada.current = false;
    };
  }, [localId]);

  // Solo cambia el estado de sincronización: basta con releer la actividad.
  useSyncDataChanged(() => {
    getActivity(localId)
      .then((found) => {
        if (montada.current && found) setActivity(found);
      })
      .catch((e) => console.log('Error actualizando el resumen de la actividad:', e));
  });

  return { activity, pointCount, loading };
}
