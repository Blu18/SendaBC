import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { listFinishedActivities, type Activity } from '../../lib/db/activities';

// Actividades terminadas del usuario de la sesión, leídas de SQLite (spec 004, CA-20,
// CA-23, CA-24). Se recarga al recibir el foco para incluir las recién terminadas (D8).
export function useActivityHistory() {
  const { userId } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!userId) {
        setActivities([]);
        setLoading(false);
        return;
      }
      listFinishedActivities(userId)
        .then((rows) => {
          if (active) setActivities(rows);
        })
        .catch((e) => console.log('Error cargando el historial de actividades:', e))
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [userId])
  );

  return { activities, loading };
}
