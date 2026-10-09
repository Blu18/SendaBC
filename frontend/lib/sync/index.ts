import * as Network from 'expo-network';
import {
  getActivityPoints,
  insertDownloadedActivity,
  listClientIds,
  listUploadable,
  markSynced,
  markSyncError,
} from '../db/activities';
import { getRemoteActivity, listRemoteActivities, uploadBatch } from './api';
import { createSyncEngine } from './syncEngine';

// Hay red si el sistema dice que hay conexión. isInternetReachable puede venir indefinido;
// en ese caso se intenta y, si falla, el reintento lo resuelve (spec 005, D2).
export async function isOnline() {
  const estado = await Network.getNetworkStateAsync();
  return estado.isConnected === true && estado.isInternetReachable !== false;
}

// Motor de sincronización de la app (spec 005). Una sola instancia para toda la app.
export const syncEngine = createSyncEngine({
  isOnline,
  listUploadable,
  getActivityPoints,
  markSynced,
  markSyncError,
  listClientIds,
  insertDownloadedActivity,
  uploadBatch,
  listRemoteActivities,
  getRemoteActivity,
  log: (mensaje, error) => console.log(mensaje, error ?? ''),
});
