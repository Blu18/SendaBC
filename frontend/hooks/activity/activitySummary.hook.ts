import { useEffect, useState } from 'react';
import { countPoints, getActivity, type Activity } from '../../lib/db/activities';
import { finalizeMetrics } from '../../lib/db/activityMetrics';

// Lee de SQLite una actividad terminada y su número de puntos (spec 004, CA-1, CA-21, RN-4).
// Si sus métricas siguen pendientes (falló el cálculo al detener), las calcula aquí.
export function useActivitySummary(localId: number) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let found = await getActivity(localId);
        if (found && found.distanceMeters === null && found.endedAt) {
          await finalizeMetrics(localId);
          found = await getActivity(localId);
        }
        const points = await countPoints(localId);
        if (!active) return;
        setActivity(found);
        setPointCount(points);
      } catch (e) {
        console.log('Error cargando el resumen de la actividad:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [localId]);

  return { activity, pointCount, loading };
}
