import { computeDistance } from '../metrics/distance';
import { hasOldPoints, withoutOldPoints } from '../metrics/oldPoints';
import { activityProfile } from '../metrics/profile';
import { computeActivityMetrics } from '../metrics/summary';
import {
  getActivity,
  getActivityPoints,
  getBarometerReadings,
  listActivityIdsMissingMetrics,
  listActivityIdsMissingPeak,
  listActivityIdsWithDistance,
  saveDistance,
  saveMetrics,
  savePeak,
  type Activity,
  type ActivityPointInput,
} from './activities';
import { getSetting, setSetting } from './settings';

// La cumbre del perfil de la spec 014, con los mismos puntos, lecturas y fuente que el resumen,
// para que el filtro de altura dé la misma cifra (spec 015, CA-5, RN-5). null sin perfil.
function peakOf(
  activity: Pick<Activity, 'elevationSource'>,
  points: ActivityPointInput[],
  barometerReadings: Awaited<ReturnType<typeof getBarometerReadings>>
) {
  const profile = activityProfile({ points, barometerReadings, source: activity.elevationSource ?? 'GPS' });
  return profile ? profile.cumbre.altitudM : null;
}

// Calcula las métricas de una actividad terminada con lo guardado en el teléfono y las
// guarda junto a ella (spec 004, CA-18, RN-4). También guarda su cumbre (spec 015, plan D1).
// Devuelve null si no existe o sigue en curso.
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
  await savePeak(localId, peakOf(activity, points, barometerReadings));
  return metrics;
}

// Calcula y guarda la cumbre de una actividad terminada (spec 015, CA-5; plan D1). Devuelve si la
// guardó: no lo hace si la actividad no existe o sigue en curso.
export async function computePeak(localId: number) {
  const activity = await getActivity(localId);
  if (!activity?.endedAt) return false;
  const [points, barometerReadings] = await Promise.all([
    getActivityPoints(localId),
    getBarometerReadings(localId),
  ]);
  await savePeak(localId, peakOf(activity, points, barometerReadings));
  return true;
}

// Calcula las cumbres pendientes: las actividades de antes de la v7 y las recuperadas cuya cumbre
// no se pudo calcular al guardarlas (spec 015, plan D1). Si una falla, sigue con las demás; queda
// pendiente y se reintenta en la siguiente apertura. Devuelve cuántas calculó.
export async function computeMissingPeaks() {
  let computed = 0;
  for (const id of await listActivityIdsMissingPeak()) {
    try {
      if (await computePeak(id)) computed++;
    } catch (e) {
      console.log(`Error calculando la cumbre de la actividad ${id}:`, e);
    }
  }
  return computed;
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
