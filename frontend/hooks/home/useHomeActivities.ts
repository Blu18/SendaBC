import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useSyncDataChanged } from '../../context/SyncContext';
import {
  countPendingUploads,
  getActivityPoints,
  listRecentActivities,
  summarizeSince,
  type Activity,
  type ActivityTotals,
} from '../../lib/db/activities';
import { inicioDeUltimos7Dias } from '../../lib/home/summary';
import { activityThumbnailPath } from '../../lib/map/thumbnail';
import type { LngLat } from '../../lib/map/track';

// Actividades recientes que muestra Inicio (spec 013, CA-3).
export const HOME_RECENT_ACTIVITIES = 3;

export type HomeActivity = Activity & { path: LngLat[] };

type HomeActivitiesState = {
  recent: HomeActivity[];
  totals: ActivityTotals | null; // null mientras carga
  pending: number; // actividades sin subir (CA-19)
};

const VACIO: HomeActivitiesState = { recent: [], totals: null, pending: 0 };

// Lo que Inicio lee del teléfono (spec 013, CA-3, CA-6, CA-19, CA-21): las 3 actividades más
// recientes con su recorrido para la miniatura, los totales de los últimos 7 días y cuántas faltan
// por subir. No usa la red, así que se ve igual sin conexión. Se recarga al volver a Inicio, para
// incluir la actividad recién terminada, y cuando la sincronización sube o recupera actividades
// (como el historial, spec 004 D8 y spec 005 CA-15).
export function useHomeActivities() {
  const { userId } = useAuth();
  const [state, setState] = useState<HomeActivitiesState>(VACIO);
  const [loading, setLoading] = useState(true);
  // Evita actualizar el estado si la pantalla ya se desmontó.
  const montada = useRef(true);
  useEffect(() => {
    montada.current = true;
    return () => {
      montada.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!userId) {
      setState(VACIO);
      setLoading(false);
      return;
    }
    try {
      const desde = inicioDeUltimos7Dias(new Date());
      const [actividades, totals, pending] = await Promise.all([
        listRecentActivities(userId, HOME_RECENT_ACTIVITIES),
        summarizeSince(userId, desde),
        countPendingUploads(userId),
      ]);
      const recent = await Promise.all(
        actividades.map(async (a) => ({ ...a, path: activityThumbnailPath(await getActivityPoints(a.localId)) }))
      );
      if (montada.current) setState({ recent, totals, pending });
    } catch (e) {
      // Se queda lo último que se pudo leer; Inicio sigue usable.
      console.log('Error cargando las actividades de Inicio:', e);
    } finally {
      if (montada.current) setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  useSyncDataChanged(() => {
    void reload();
  });

  return { ...state, loading, reload };
}
