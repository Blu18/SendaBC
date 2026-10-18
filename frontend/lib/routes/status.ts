import type { NearbyRoute } from './api';

// Estado de la búsqueda que pinta la pantalla (CA-13, CA-15, CA-16).
export type NearbyStatus = 'idle' | 'loading' | 'success' | 'empty' | 'offline' | 'error';

// Resultado de una búsqueda: sin conexión no se hace la petición (CA-15).
export type NearbyOutcome = { offline: true } | { offline: false; routes: NearbyRoute[] };

export function nearbyStatus(q: {
  requested: boolean; // ya se pidió al menos una búsqueda
  isFetching: boolean;
  isError: boolean;
  data: NearbyOutcome | undefined;
}): NearbyStatus {
  if (!q.requested) return 'idle'; // sin permiso aún no se busca (CA-14)
  if (q.isFetching) return 'loading';
  if (q.isError || !q.data) return 'error';
  if (q.data.offline) return 'offline';
  return q.data.routes.length === 0 ? 'empty' : 'success';
}
