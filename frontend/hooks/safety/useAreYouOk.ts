import { useCallback, useEffect, useState } from 'react';
import { Vibration } from 'react-native';
import { getDetectorState } from '../../lib/db/safety';
import { responderEstoyBien } from '../../lib/safety/areYouOk';
import { restanteMs, type EstadoDetector } from '../../lib/safety/inactivity';
import { UMBRALES_APP } from '../../lib/safety/locationTask';

const VIBRACION = [0, 600, 400];

// "¿Estás bien?" en la pantalla de la actividad (spec 008, CA-11, CA-12). El detector corre en la
// tarea de ubicación y guarda su estado en SQLite; aquí se lee cada segundo, que es lo que necesita
// la cuenta regresiva. Así el modal aparece también si la pregunta llegó con la pantalla bloqueada
// y se abrió la app después.
export function useAreYouOk(activityLocalId: number | null, recording: boolean) {
  const [estado, setEstado] = useState<EstadoDetector | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [respondiendo, setRespondiendo] = useState(false);

  const leer = useCallback(async () => {
    if (activityLocalId === null) return;
    try {
      setEstado(await getDetectorState(activityLocalId));
    } catch (e) {
      console.log('Error leyendo el detector:', e);
    }
    setAhora(Date.now());
  }, [activityLocalId]);

  useEffect(() => {
    if (!recording || activityLocalId === null) {
      setEstado(null);
      return;
    }
    void leer();
    const id = setInterval(() => void leer(), 1000);
    return () => clearInterval(id);
  }, [recording, activityLocalId, leer]);

  const visible = recording && estado?.fase === 'preguntando';

  // Vibra mientras se pregunta (spec, accesibilidad). El sonido lo da la notificación.
  useEffect(() => {
    if (!visible) return;
    Vibration.vibrate(VIBRACION, true);
    return () => Vibration.cancel();
  }, [visible]);

  const estoyBien = useCallback(async () => {
    setRespondiendo(true);
    try {
      await responderEstoyBien();
      await leer();
    } catch (e) {
      console.log('Error respondiendo "Estoy bien":', e);
    } finally {
      setRespondiendo(false);
    }
  }, [leer]);

  return {
    visible,
    restanteMs: estado ? (restanteMs(estado, ahora, UMBRALES_APP) ?? 0) : 0,
    alertada: estado?.fase === 'alertada',
    respondiendo,
    estoyBien,
  };
}
