import { useCallback, useEffect, useState } from 'react';
import { getSafetySession, type LocalSafetySession } from '../../lib/db/safety';
import { useAuth } from '../../context/AuthContext';
import { safetySync, sessionActions } from '../../lib/safety';
import { getSession, type SafetyAlert } from '../../lib/safety/api';
import { alertActions } from '../../lib/safety/areYouOk';
import { hayAlertaActiva } from '../../lib/safety/recording';

// Cada cuánto se relee la sesión: la alerta por inactividad la crea la tarea de ubicación y, sin
// conexión, no hay un evento de envío que avise a la pantalla.
const RELECTURA_MS = 2000;
// Cada cuánto se pregunta al servidor por la alerta activa: la de la hora de regreso la crea él
// (CA-17, CA-18), y también dice a quiénes se entregó cada una.
const CONSULTA_SERVIDOR_MS = 30_000;

// Sesión de seguridad de la actividad en curso (spec 008, T18): hora de regreso enviada o
// pendiente (CA-23), alerta activa (CA-17), SOS (CA-24) y cancelar (CA-25). El estado vive en
// SQLite; aquí se lee mientras se graba.
export function useSafetySession(activityLocalId: number | null, recording: boolean) {
  const { token } = useAuth();
  const [sesion, setSesion] = useState<LocalSafetySession | null>(null);
  // La alerta activa según el servidor, con sus entregas. null sin respuesta o sin alerta.
  const [remota, setRemota] = useState<SafetyAlert | null>(null);

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

  // Sin conexión la consulta falla y se queda lo del teléfono; la bandeja sigue aparte.
  useEffect(() => {
    if (!recording || activityLocalId === null || !token) return;
    let vigente = true;
    const consultar = async () => {
      try {
        const local = await getSafetySession(activityLocalId);
        if (!local) return;
        const r = await getSession(token, local.clientGeneratedId);
        if (!vigente || !r.ok) return;
        setRemota(r.data.activeAlert);
        if (await sessionActions.adoptarAlerta(activityLocalId, r.data.activeAlert)) await leer();
      } catch (e) {
        console.log('Error consultando la sesión de seguridad:', e);
      }
    };
    void consultar();
    const id = setInterval(() => void consultar(), CONSULTA_SERVIDOR_MS);
    return () => {
      vigente = false;
      clearInterval(id);
      setRemota(null);
    };
  }, [recording, activityLocalId, token, leer]);

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

  const alertaActiva = recording && sesion !== null && hayAlertaActiva(sesion);
  // A quiénes se entregó la alerta activa, si el servidor ya lo dijo (CA-17).
  const entregadaA =
    alertaActiva && remota && remota.id === sesion!.alertServerId
      ? remota.deliveries.filter((d) => d.status === 'SENT').map((d) => d.contactName)
      : null;

  return {
    // null antes de iniciar, o si la actividad no tiene sesión (sin contactos activos).
    sesion: recording ? sesion : null,
    alertaActiva,
    entregadaA,
    cambiarRegreso,
    pedirAyuda,
    cancelarAlerta,
  };
}
