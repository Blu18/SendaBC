import {
  deleteOutbox,
  enqueueOutbox,
  getAlertServerId,
  incrementOutboxAttempts,
  listOutbox,
  markAlertSent,
  markSessionAck,
} from '../db/safety';
import { isOnline } from '../sync';
import { cancelAlert, createAlert, finishSession, postLocation, upsertSession } from './api';
import { createSafetySync } from './safetySync';

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
