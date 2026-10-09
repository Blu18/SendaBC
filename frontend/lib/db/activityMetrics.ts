import { computeActivityMetrics } from '../metrics/summary';
import {
  getActivity,
  getActivityPoints,
  getBarometerReadings,
  listActivityIdsMissingMetrics,
  saveMetrics,
} from './activities';

// Calcula las métricas de una actividad terminada con lo guardado en el teléfono y las
// guarda junto a ella (spec 004, CA-18, RN-4). Devuelve null si no existe o sigue en curso.
export async function finalizeMetrics(localId: number) {
  const activity = await getActivity(localId);
  if (!activity?.endedAt) return null;

  const [points, barometerReadings] = await Promise.all([
    getActivityPoints(localId),
    getBarometerReadings(localId),
  ]);
  const metrics = computeActivityMetrics({
    points,
    barometerReadings,
    // Las actividades anteriores a la v3 no tienen fuente ni lecturas: usan GPS.
    source: activity.elevationSource ?? 'GPS',
    startedAt: activity.startedAt,
    endedAt: activity.endedAt,
  });
  await saveMetrics(localId, metrics);
  return metrics;
}

// Calcula las métricas pendientes al abrir la app: actividades cerradas por
// closeOrphanActivities() o grabadas antes de la v3 (CA-19). Si una falla, sigue con
// las demás para no bloquear el arranque; se reintenta en la siguiente apertura.
export async function computeMissingMetrics() {
  const ids = await listActivityIdsMissingMetrics();
  let computed = 0;
  for (const id of ids) {
    try {
      if (await finalizeMetrics(id)) computed++;
    } catch (e) {
      console.log(`Error calculando métricas de la actividad ${id}:`, e);
    }
  }
  return computed;
}
