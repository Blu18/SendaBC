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
import { hayConexion } from './network';
import { createSyncEngine } from './syncEngine';

export async function isOnline() {
  return hayConexion(await Network.getNetworkStateAsync());
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
