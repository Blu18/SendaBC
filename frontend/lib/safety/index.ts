import { getActivity } from '../db/activities';
import {
  createSafetySession,
  deleteOutbox,
  enqueueOutbox,
  getAlertServerId,
  getSafetySession,
  incrementOutboxAttempts,
  listOutbox,
  listRecordingSessionIds,
  markAlertSent,
  markSessionAck,
  setAlert,
  setReturnBy,
} from '../db/safety';
import { isOnline } from '../sync';
import { cancelAlert, createAlert, finishSession, postLocation, upsertSession } from './api';
import { createSafetySync } from './safetySync';
import { createSessionActions } from './sessionActions';

// Envío de la bandeja de seguridad (spec 008). Una sola instancia para toda la app.
export const safetySync = createSafetySync({
  isOnline,
  enqueueOutbox: (userId, entry) => enqueueOutbox(userId, entry),
  listOutbox,
  deleteOutbox,
  incrementOutboxAttempts,
  markSessionAck,
  markAlertSent,
  getAlertServerId,
  upsertSession,
  createAlert,
  cancelAlert,
  postLocation,
  finishSession,
  log: (mensaje, error) => console.log(mensaje, error ?? ''),
});

// Sesión de seguridad de la actividad en curso: iniciar, hora de regreso y terminar (T18).
export const sessionActions = createSessionActions({
  getActivity,
  createSafetySession,
  getSafetySession,
  setReturnBy,
  listRecordingSessionIds,
  setAlert,
  markAlertSent,
  enqueueOutbox: (userId, entry) => enqueueOutbox(userId, entry),
  requestSend: () => void safetySync.requestSend(),
});
