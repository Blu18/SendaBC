import { computeDistance } from '../metrics/distance';
import { hasOldPoints, withoutOldPoints } from '../metrics/oldPoints';
import { computeActivityMetrics } from '../metrics/summary';
import {
  getActivity,
  getActivityPoints,
  getBarometerReadings,
  listActivityIdsMissingMetrics,
  listActivityIdsWithDistance,
  saveDistance,
  saveMetrics,
} from './activities';
import { getSetting, setSetting } from './settings';

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

// app_settings es por cuenta; este paso es del teléfono, así que se marca con una cuenta vacía.
const DEVICE = '';
export const RECALCULATED_DISTANCES_KEY = 'distancias_recalculadas';

// Una sola vez por teléfono: recalcula la distancia de las actividades que empiezan con puntos
// de más de 30 s antes del inicio, sin esos puntos, con el mismo criterio que el script del
// servidor (spec 011, CA-17, RN-11, plan D7). Solo guarda la distancia; el estado no cambia, así
// que una actividad sincronizada sigue sincronizada y una pendiente sube con la distancia nueva.
// Si una falla, no se marca y todo se repite en la siguiente apertura: recalcular dos veces da
// lo mismo. Devuelve cuántas cambiaron.
export async function recalcularDistanciasViejas() {
  if (await getSetting(DEVICE, RECALCULATED_DISTANCES_KEY)) return 0;

  let changed = 0;
  let failed = false;
  for (const id of await listActivityIdsWithDistance()) {
    try {
      const activity = await getActivity(id);
      const points = await getActivityPoints(id);
      if (!activity || !hasOldPoints(points, activity.startedAt)) continue;
      const distance = computeDistance(withoutOldPoints(points, activity.startedAt));
      if (activity.distanceMeters !== null && Math.abs(activity.distanceMeters - distance) <= 0.01) continue;
      await saveDistance(id, distance);
      changed++;
    } catch (e) {
      failed = true;
      console.log(`Error recalculando la distancia de la actividad ${id}:`, e);
    }
  }
  if (!failed) await setSetting(DEVICE, RECALCULATED_DISTANCES_KEY, new Date().toISOString());
  return changed;
}
