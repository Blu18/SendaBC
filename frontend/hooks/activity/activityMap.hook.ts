import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getActivityPoints, type ActivityPointInput } from '../../lib/db/activities';
import { createLiveMap, type MapSnapshot } from '../../lib/map/liveMap';
import { onGrabacion } from '../../lib/safety/locationTask';

const EMPTY = createLiveMap().snapshot;

// Trazo, posición y rumbo de la actividad en curso (spec 010, CA-2 a CA-4). Separado de
// useActivityTracker para que un fallo del mapa no toque la grabación (RN-2): solo lee SQLite y
// escucha los puntos ya guardados, sin abrir otra escucha del GPS (RN-1).
export function useActivityMap(activityLocalId: number | null, recording: boolean): MapSnapshot {
  const [snapshot, setSnapshot] = useState(EMPTY);

  useEffect(() => {
    if (activityLocalId === null || !recording) {
      setSnapshot(EMPTY);
      return;
    }

    let live = createLiveMap();
    let active = true;
    let loading = false;
    // Puntos que llegan mientras se lee SQLite: se agregan al terminar la lectura.
    let queued: ActivityPointInput[] = [];

    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const saved = await getActivityPoints(activityLocalId);
        if (active) live = createLiveMap(saved);
      } catch (e) {
        console.log('Error leyendo los puntos para el mapa:', e);
      }
      queued.forEach(live.add);
      queued = [];
      loading = false;
      if (active) setSnapshot(live.snapshot);
    };

    const stopListening = onGrabacion((evento) => {
      if (evento.type !== 'punto' || evento.activityLocalId !== activityLocalId) return;
      if (loading) queued.push(evento.point);
      else if (live.add(evento.point)) setSnapshot(live.snapshot);
    });

    // Con la pantalla bloqueada pudo haber puntos que no llegaron aquí (CA-7).
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });

    void load();

    return () => {
      active = false;
      stopListening();
      appState.remove();
    };
  }, [activityLocalId, recording]);

  return snapshot;
}
