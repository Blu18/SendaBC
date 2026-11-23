import * as Network from 'expo-network';
import {
  getActivityPoints,
  insertDownloadedActivity,
  listClientIds,
  listUploadable,
  markSynced,
  markSyncError,
} from '../db/activities';
import type { DownloadedActivity } from '../db/activities';
import { computePeak } from '../db/activityMetrics';
import { getRemoteActivity, listRemoteActivities, uploadBatch } from './api';
import { hayConexion } from './network';
import { createSyncEngine } from './syncEngine';

export async function isOnline() {
  return hayConexion(await Network.getNetworkStateAsync());
}

// Guarda la actividad recuperada y calcula su cumbre antes de que el motor avise que cambiaron
// los datos, para que el filtro de altura ya la tenga (spec 015, plan D1). Si la cumbre falla, la
// actividad queda guardada y computeMissingPeaks la calcula en la siguiente apertura.
async function insertDownloadedWithPeak(activity: DownloadedActivity, userId: string) {
  const localId = await insertDownloadedActivity(activity, userId);
  await computePeak(localId).catch((e) => console.log(`Error calculando la cumbre de la actividad ${localId}:`, e));
  return localId;
}

// Motor de sincronización de la app (spec 005). Una sola instancia para toda la app.
export const syncEngine = createSyncEngine({
  isOnline,
  listUploadable,
  getActivityPoints,
  markSynced,
  markSyncError,
  listClientIds,
  insertDownloadedActivity: insertDownloadedWithPeak,
  uploadBatch,
  listRemoteActivities,
  getRemoteActivity,
  log: (mensaje, error) => console.log(mensaje, error ?? ''),
});
