import { useCallback, useEffect, useState } from 'react';
import { getSafetySession, type LocalSafetySession } from '../../lib/db/safety';
import { safetySync, sessionActions } from '../../lib/safety';
import { alertActions } from '../../lib/safety/areYouOk';
import { hayAlertaActiva } from '../../lib/safety/recording';

// Cada cuánto se relee la sesión: la alerta por inactividad la crea la tarea de ubicación y, sin
// conexión, no hay un evento de envío que avise a la pantalla.
const RELECTURA_MS = 2000;

// Sesión de seguridad de la actividad en curso (spec 008, T18): hora de regreso enviada o
// pendiente (CA-23), alerta activa (CA-17), SOS (CA-24) y cancelar (CA-25). El estado vive en
// SQLite; aquí se lee mientras se graba.
export function useSafetySession(activityLocalId: number | null, recording: boolean) {
  const [sesion, setSesion] = useState<LocalSafetySession | null>(null);

  const leer = useCallback(async () => {
    if (activityLocalId === null) return;
    try {
      setSesion(await getSafetySession(activityLocalId));
    } catch (e) {
      console.log('Error leyendo la sesión de seguridad:', e);
    }
  }, [activityLocalId]);

  useEffect(() => {
    if (!recording || activityLocalId === null) return;
    void leer();
    const id = setInterval(() => void leer(), RELECTURA_MS);
    // Lo que se envía o se descarta cambia "enviada / pendiente" en el momento.
    const quitar = safetySync.subscribe(() => void leer());
    return () => {
      clearInterval(id);
      quitar();
    };
  }, [recording, activityLocalId, leer]);

  const cambiarRegreso = useCallback(
    async (regreso: number | null) => {
      if (activityLocalId === null) return { kind: 'sin-sesion' } as const;
      const resultado = await sessionActions.cambiarRegreso(activityLocalId, regreso);
      await leer();
      return resultado;
    },
    [activityLocalId, leer]
  );

  const pedirAyuda = useCallback(async () => {
    if (activityLocalId === null) return { kind: 'sin-sesion' } as const;
    const resultado = await alertActions.crear(activityLocalId, 'SOS');
    await leer();
    return resultado;
  }, [activityLocalId, leer]);

  const cancelarAlerta = useCallback(async () => {
    if (activityLocalId === null) return 'sin-alerta' as const;
    const resultado = await alertActions.cancelar(activityLocalId);
    await leer();
    return resultado;
  }, [activityLocalId, leer]);

  return {
    // null antes de iniciar, o si la actividad no tiene sesión (sin contactos activos).
    sesion: recording ? sesion : null,
    alertaActiva: recording && sesion !== null && hayAlertaActiva(sesion),
    cambiarRegreso,
    pedirAyuda,
    cancelarAlerta,
  };
}
