import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useSyncDataChanged } from '../../context/SyncContext';
import { groupByMonth } from '../../lib/activity/months';
import { listFinishedActivities, type Activity } from '../../lib/db/activities';
import { clearTrackPathCache } from './useTrackPath';

// Actividades terminadas del usuario de la sesión, leídas de SQLite (spec 004, CA-20,
// CA-23, CA-24). Se recarga al recibir el foco para incluir las recién terminadas (D8) y cuando
// la sincronización marca o recupera actividades, sin salir de la pantalla (spec 005, CA-15).
// `sections` las agrupa por mes para la bitácora (spec 014, CA-13, CA-14).
export function useActivityHistory() {
  const { userId } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
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
      setActivities([]);
      setLoading(false);
      return;
    }
    try {
      const rows = await listFinishedActivities(userId);
      if (montada.current) setActivities(rows);
    } catch (e) {
      console.log('Error cargando el historial de actividades:', e);
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
    clearTrackPathCache();
    void reload();
  });

  const sections = useMemo(() => groupByMonth(activities, new Date()), [activities]);

  return { activities, sections, loading, reload };
}
