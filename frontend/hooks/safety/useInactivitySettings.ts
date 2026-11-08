import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getEleccionUmbrales, saveEleccionUmbrales } from '../../lib/db/settings';
import { ELECCION_POR_DEFECTO, type EleccionUmbrales } from '../../lib/safety/thresholds';

// Umbrales de inactividad de la cuenta (spec 011, CA-50). Se guardan en el teléfono, sin red, y se
// usan desde la siguiente actividad (CA-51).
export function useInactivitySettings() {
  const { userId } = useAuth();
  const [eleccion, setEleccion] = useState<EleccionUmbrales>(ELECCION_POR_DEFECTO);
  const [cargada, setCargada] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let vigente = true;
    getEleccionUmbrales(userId)
      .then((e) => {
        if (vigente) setEleccion(e);
      })
      .catch((e) => console.log('Error leyendo los umbrales:', e))
      .finally(() => {
        if (vigente) setCargada(true);
      });
    return () => {
      vigente = false;
    };
  }, [userId]);

  const cambiar = useCallback(
    (cambios: Partial<EleccionUmbrales>) => {
      if (!userId) return;
      const nueva = { ...eleccion, ...cambios };
      setEleccion(nueva);
      saveEleccionUmbrales(userId, nueva).catch((e) => console.log('Error guardando los umbrales:', e));
    },
    [userId, eleccion]
  );

  return { eleccion, cargada, cambiar };
}
