import { useEffect, useState } from 'react';
import { getActivityPoints } from '../../lib/db/activities';
import { activityThumbnailPath } from '../../lib/map/thumbnail';
import type { LngLat } from '../../lib/map/track';

// Recorridos ya calculados, por id local. Guarda los últimos MAX_CACHED para que, al volver a una
// fila de la bitácora, la miniatura salga sin leer otra vez los puntos (spec 014, plan D4).
const MAX_CACHED = 100;
const cache = new Map<number, LngLat[]>();

function remember(localId: number, path: LngLat[]) {
  cache.delete(localId);
  cache.set(localId, path);
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
}

// Se llama cuando la sincronización recupera o cambia actividades (spec 005, CA-15).
export function clearTrackPathCache() {
  cache.clear();
}

/**
 * Recorrido de la miniatura de una actividad, leído de SQLite solo cuando su fila se muestra
 * (plan, D4). null mientras carga, si la actividad no tiene puntos o si `enabled` es false (sin
 * distancia): la fila muestra el ícono del deporte (CA-16).
 */
export function useTrackPath(localId: number, enabled = true): LngLat[] | null {
  const cached = enabled ? cache.get(localId) : undefined;
  const [path, setPath] = useState<LngLat[] | null>(cached && cached.length > 0 ? cached : null);

  useEffect(() => {
    // Sin distancia no se lee nada: la fila muestra el ícono (spec 014, CA-16).
    if (!enabled) {
      setPath(null);
      return;
    }
    const known = cache.get(localId);
    if (known) {
      remember(localId, known);
      setPath(known.length > 0 ? known : null);
      return;
    }
    let vigente = true;
    getActivityPoints(localId)
      .then((points) => {
        const p = activityThumbnailPath(points);
        remember(localId, p);
        if (vigente) setPath(p.length > 0 ? p : null);
      })
      .catch((e) => console.log('Error leyendo el recorrido de la actividad:', e));
    return () => {
      vigente = false;
    };
  }, [localId, enabled]);

  return path;
}
