import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSyncDataChanged } from '../../context/SyncContext';
import { contextLine } from '../../lib/activity/context';
import {
  countPoints,
  getActivity,
  getActivityPoints,
  getBarometerReadings,
  listFinishedActivities,
  type Activity,
} from '../../lib/db/activities';
import { finalizeMetrics } from '../../lib/db/activityMetrics';
import { activityThumbnailPath } from '../../lib/map/thumbnail';
import type { LngLat } from '../../lib/map/track';
import { activityProfile, type ActivityProfile } from '../../lib/metrics/profile';

// Lo que el resumen de la spec 014 agrega a los datos de la actividad. Se calcula después de
// mostrarla, para que el resumen se abra igual de rápido que antes (plan, D1).
export type SummaryDetails = {
  profile: ActivityProfile | null; // null: sin datos suficientes para el perfil (CA-7)
  path: LngLat[]; // recorrido de la miniatura; vacío si no hay puntos (CA-11)
  context: string | null; // línea de contexto (CA-2, CA-3)
};

// Lee de SQLite una actividad terminada y su número de puntos (spec 004, CA-1, CA-21, RN-4).
// Si sus métricas siguen pendientes (falló el cálculo al detener), las calcula aquí.
// Se vuelve a leer cuando la sincronización la marca, para que su estado pase de "Pendiente
// de subir" a "Sincronizada" sin salir del resumen (spec 005, CA-14).
//
// Con `details`, además calcula el perfil, el recorrido y la línea de contexto (spec 014, CA-2,
// CA-4, CA-10, CA-19). Todo sale del teléfono, sin red. Publicar como ruta usa el hook sin ellos.
export function useActivitySummary(localId: number, { details = false }: { details?: boolean } = {}) {
  const { userId } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // null mientras se calculan; el resumen reserva su lugar para que no salte.
  const [summaryDetails, setSummaryDetails] = useState<SummaryDetails | null>(null);
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

  // Después de mostrar la actividad (D1). Si algo falla, el resumen sigue con sus cifras.
  const ready = activity !== null;
  useEffect(() => {
    if (!details || !ready) return;
    let vigente = true;
    (async () => {
      try {
        const [points, readings, all, current] = await Promise.all([
          getActivityPoints(localId),
          getBarometerReadings(localId),
          userId ? listFinishedActivities(userId) : Promise.resolve([] as Activity[]),
          getActivity(localId),
        ]);
        if (!vigente || !current) return;
        setSummaryDetails({
          profile: activityProfile({
            points,
            barometerReadings: readings,
            source: current.elevationSource ?? 'GPS',
          }),
          path: activityThumbnailPath(points),
          context: contextLine(current, all),
        });
      } catch (e) {
        console.log('Error calculando el perfil y el contexto del resumen:', e);
        if (vigente) setSummaryDetails({ profile: null, path: [], context: null });
      }
    })();
    return () => {
      vigente = false;
    };
  }, [details, ready, localId, userId]);

  // Solo cambia el estado de sincronización: basta con releer la actividad.
  useSyncDataChanged(() => {
    getActivity(localId)
      .then((found) => {
        if (montada.current && found) setActivity(found);
      })
      .catch((e) => console.log('Error actualizando el resumen de la actividad:', e));
  });

  return { activity, pointCount, loading, details: summaryDetails };
}
