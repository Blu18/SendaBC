import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { getLastPoint, getRecordingActivity } from '../db/activities';
import { enqueueOutbox, getSafetySession, markAlertCancelled, setAlert } from '../db/safety';
import { safetySync } from '.';
import { createAlertActions } from './alertActions';
import type { Umbrales } from './inactivity';
import { locationProcessor, onGrabacion, UMBRALES_APP } from './locationTask';
import {
  esRespuestaEstoyBien,
  preguntarYa,
  programarPregunta,
  quitarPregunta,
} from './notifications';
import { umbralesDeSesion } from './thresholds';

// Atiende lo que pide el detector de inactividad (spec 008, T17): programar la notificación de
// respaldo, preguntar "¿Estás bien?" y, sin respuesta, crear la alerta. Se importa en index.ts
// antes de montar la app: con la pantalla bloqueada no hay pantallas montadas que lo hagan.

// La notificación se muestra aunque la app esté al frente: así suena y vibra junto con el modal.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const alertActions = createAlertActions({
  getSafetySession,
  getLastPoint,
  setAlert,
  markAlertCancelled,
  enqueueOutbox: (userId, entry) => enqueueOutbox(userId, entry),
  requestSend: () => void safetySync.requestSend(),
  reiniciarDetector: (localId, ahora) => locationProcessor.reiniciarDetector(localId, ahora),
  randomUUID: () => Crypto.randomUUID(),
});

const log = (mensaje: string) => (e: unknown) => console.log(mensaje, e);

// Umbrales con los que corre la actividad: los de su sesión (spec 011, CA-51) o los de la app.
// La notificación los usa para decir cuánto tiempo lleva quieto y cuánto queda para responder.
export async function umbralesDeActividad(activityLocalId: number): Promise<Umbrales> {
  return umbralesDeSesion(await getSafetySession(activityLocalId), UMBRALES_APP);
}

onGrabacion((evento) => {
  if (evento.type !== 'detector') return;
  switch (evento.accion) {
    case 'programar-pregunta': {
      const para = evento.estado.programadaPara;
      if (para !== null) {
        umbralesDeActividad(evento.activityLocalId)
          .then((umbrales) => programarPregunta(para, umbrales))
          .catch(log('Error programando "¿Estás bien?":'));
      }
      return;
    }
    case 'preguntar':
      umbralesDeActividad(evento.activityLocalId)
        .then((umbrales) => preguntarYa(umbrales))
        .catch(log('Error mostrando "¿Estás bien?":'));
      return;
    case 'alertar':
      // Terminó la cuenta regresiva sin respuesta (CA-14). Sin conexión se queda en la bandeja y
      // sale en cuanto haya (CA-15).
      quitarPregunta().catch(() => {});
      alertActions
        .crear(evento.activityLocalId, 'INACTIVITY')
        .catch(log('Error creando la alerta por inactividad:'));
      return;
  }
});

// "Estoy bien" desde el modal o desde la notificación (CA-12): la detección vuelve a empezar desde
// ahora y se quita la pregunta. Devuelve false si no había una actividad en curso.
export async function responderEstoyBien(): Promise<boolean> {
  const actividad = await getRecordingActivity();
  await quitarPregunta();
  if (!actividad) return false;
  await locationProcessor.reiniciarDetector(actividad.localId);
  return true;
}

// Respuesta desde la notificación, con la pantalla bloqueada o al abrir la app desde ella.
Notifications.addNotificationResponseReceivedListener((respuesta) => {
  if (!esRespuestaEstoyBien(respuesta)) return;
  responderEstoyBien().catch(log('Error respondiendo "Estoy bien":'));
});
