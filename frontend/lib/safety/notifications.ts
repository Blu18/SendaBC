import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { lightColors } from '../theme/colors';
import type { Umbrales } from './inactivity';
import { textoPregunta } from './messages';

// "¿Estás bien?" como notificación local (spec 008, plan D5). Suena aunque la app esté suspendida
// y se puede responder desde ella con la pantalla bloqueada (CA-11, CA-12).

export const CANAL = 'seguridad';
// Sin ":" ni "-": con ellos las categorías no funcionan (docs de expo-notifications).
export const CATEGORIA = 'pregunta_estas_bien';
export const ACCION_ESTOY_BIEN = 'ESTOY_BIEN';
// Un solo id: programar otra vez reemplaza a la anterior, y cancelar quita la programada y la que
// se esté mostrando. Hay una sola actividad en curso a la vez.
export const ID_PREGUNTA = 'pregunta';

const VIBRACION = [0, 500, 300, 500, 300, 500];

let listo: Promise<void> | null = null;

// Canal y categoría. El canal va antes de pedir el permiso: en Android 13 el diálogo solo sale si
// ya existe uno (docs de expo-notifications).
export function prepararNotificaciones(): Promise<void> {
  if (!listo) {
    listo = (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CANAL, {
          name: 'Seguridad',
          description: 'La pregunta "¿Estás bien?" durante una actividad',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: VIBRACION,
          enableVibrate: true,
          lightColor: lightColors.alert,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          // Sin `sound`: el canal usa el sonido de notificación del sistema. 'default' aquí se toma
          // como el nombre de un archivo propio, que no existe.
        });
      }
      await Notifications.setNotificationCategoryAsync(CATEGORIA, [
        {
          identifier: ACCION_ESTOY_BIEN,
          buttonTitle: textoPregunta().boton,
          // Se responde sin abrir la app: la tarea de ubicación sigue viva con el servicio en
          // primer plano y atiende la respuesta.
          options: { opensAppToForeground: false },
        },
      ]);
    })().catch((e) => {
      listo = null;
      throw e;
    });
  }
  return listo;
}

// Pide el permiso de notificaciones (Android 13+) junto con el de ubicación, al iniciar (plan,
// riesgos). Sin él, "¿Estás bien?" solo se ve con la app abierta. Devuelve si quedó concedido.
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  try {
    await prepararNotificaciones();
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    if (!actual.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch (e) {
    console.log('Error pidiendo el permiso de notificaciones:', e);
    return false;
  }
}

function contenido(umbrales: Umbrales): Notifications.NotificationContentInput {
  const { titulo, cuerpo } = textoPregunta(umbrales);
  return {
    title: titulo,
    body: cuerpo,
    categoryIdentifier: CATEGORIA,
    sound: 'default',
    vibrate: VIBRACION,
    priority: Notifications.AndroidNotificationPriority.MAX,
    color: lightColors.alert,
    sticky: true,
    autoDismiss: false,
    data: { tipo: 'pregunta' },
  };
}

// Notificación de respaldo para `para` (ms): suena aunque la tarea no corra a tiempo (D5). Si el
// sistema no da alarmas exactas (Android 14), puede llegar un poco tarde; la tarea pregunta igual
// a los 10 min con preguntarYa().
export async function programarPregunta(para: number, umbrales: Umbrales) {
  await prepararNotificaciones();
  // Si se movió mientras se le preguntaba, la pregunta que está en pantalla ya no aplica.
  await Notifications.dismissNotificationAsync(ID_PREGUNTA).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID_PREGUNTA,
    content: contenido(umbrales),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: para, channelId: CANAL },
  });
}

// Muestra la pregunta en este momento (la tarea llegó a los 10 min).
export async function preguntarYa(umbrales: Umbrales) {
  await prepararNotificaciones();
  await Notifications.scheduleNotificationAsync({
    identifier: ID_PREGUNTA,
    content: contenido(umbrales),
    trigger: { channelId: CANAL },
  });
}

// Quita la pregunta programada y la que se esté mostrando ("Estoy bien", alerta generada o fin
// de la actividad, CA-13).
export async function quitarPregunta() {
  await Notifications.cancelScheduledNotificationAsync(ID_PREGUNTA).catch(() => {});
  await Notifications.dismissNotificationAsync(ID_PREGUNTA).catch(() => {});
}

// ¿La respuesta es "Estoy bien", o abrir la app desde la pregunta? Las dos reinician (plan).
export function esRespuestaEstoyBien(respuesta: Notifications.NotificationResponse) {
  if (respuesta.notification.request.identifier !== ID_PREGUNTA) return false;
  return (
    respuesta.actionIdentifier === ACCION_ESTOY_BIEN ||
    respuesta.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
  );
}
