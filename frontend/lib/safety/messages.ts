import { UMBRALES, type Umbrales } from './inactivity';
import { formatoHora, horaDeAviso } from './returnTime';

// Textos de seguridad de la app (spec 008). Los mensajes que reciben los contactos los arma el
// servidor (backend/src/safety/messages.ts).

// "Mamá", "Mamá y Beto", "Mamá, Beto y Tía".
export function listaNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

const minutos = (ms: number) => {
  const n = Math.round(ms / 60_000);
  return n === 1 ? '1 minuto' : `${n} minutos`;
};

// Aviso visible de que SendaBC no sustituye a los servicios de emergencia (spec, "Claridad").
export const AVISO_911 =
  'SendaBC no sustituye a los servicios de emergencia (911). Las alertas dependen de la señal de tu teléfono y de que tus contactos vean el mensaje.';

export const SAFETY_MESSAGES = {
  // Antes de iniciar (CA-8, CA-9).
  sinContactos:
    'No tienes contactos de emergencia activos: si te pasa algo durante la actividad, no podremos avisar a nadie.',
  configurar: 'Configurar contactos',
  // Permiso en segundo plano (CA-10, constitución 3.5).
  permisoTitulo: 'Seguir tu actividad con la pantalla bloqueada',
  permisoExplicacion:
    'Para notar si dejas de moverte aunque tengas la pantalla bloqueada, SendaBC necesita tu ubicación todo el tiempo, pero solo mientras grabas una actividad que iniciaste. En la siguiente pantalla elige "Permitir todo el tiempo".',
  sinPermiso:
    'Sin el permiso de ubicación en segundo plano, la detección de inactividad solo funciona con la app abierta y la pantalla encendida.',
  sinNotificaciones:
    'Sin permiso de notificaciones, la pregunta "¿Estás bien?" solo se ve con la app abierta.',
  // Notificación del servicio en primer plano de Android (plan, locationTask).
  grabandoTitulo: 'SendaBC está grabando tu actividad',
  grabandoCuerpo: 'La detección de inactividad está activa.',
  // Hora de regreso (CA-8, CA-19, CA-23).
  regresoTitulo: 'Hora de regreso (opcional)',
  regresoExplicacion:
    'Si tu teléfono se queda sin señal y no terminas la actividad a tiempo, el servidor avisará a tus contactos.',
  sinRegreso: 'Sin hora de regreso',
  cambiarRegreso: 'Cambiar',
  quitarRegreso: 'Quitar',
  guardarRegreso: 'Guardar',
  cancelar: 'Cancelar',
  regresoEnviado: 'Hora de regreso enviada.',
  regresoPendiente:
    'Hora de regreso pendiente de enviar: hasta que tengas conexión, el servidor no podrá avisar por ella.',
  // SOS (RN-7, CA-24).
  sos: 'Pedir ayuda',
  sosInstruccion: 'Mantén presionado 2 segundos para avisar a tus contactos.',
  sosYaActiva: 'Ya hay una alerta activa: tus contactos ya fueron avisados.',
  // Alerta activa (CA-15, CA-17, CA-25).
  alertaTitulo: 'Alerta activa',
  alertaPendiente: 'Alerta pendiente de enviar: se enviará en cuanto haya conexión.',
  cancelarAlerta: 'Cancelar alerta',
  cancelarConfirmacion: 'Tus contactos recibirán un mensaje de que estás bien.',
  // Al detener con una alerta activa (CA-26).
  terminarConAlertaTitulo: 'Tienes una alerta activa',
  terminarConAlertaPregunta: '¿Quieres cancelarla antes de terminar la actividad?',
  terminarCancelando: 'Cancelar alerta y terminar',
  terminarSinCancelar: 'Terminar sin cancelar',
  seguirGrabando: 'Seguir grabando',
  // Al terminar sin conexión con hora de regreso (CA-21).
  sinRedTitulo: 'Sin conexión',
} as const;

// "Seguridad activa: avisaríamos a Mamá y Beto." (CA-8).
export function textoSeguridadActiva(nombres: string[]): string {
  return `Seguridad activa: si te pasa algo, avisaríamos a ${listaNombres(nombres)}.`;
}

// "Regreso a las 14:05" (CA-8, CA-23).
export function textoRegreso(regreso: number, timeZone?: string): string {
  return `Regreso a las ${formatoHora(regreso, timeZone)}`;
}

// Modal y notificación "¿Estás bien?" (CA-11).
export function textoPregunta(umbrales: Umbrales = UMBRALES) {
  return {
    titulo: '¿Estás bien?',
    cuerpo: `Llevas ${minutos(umbrales.quietoMs)} sin moverte. Si no respondes en ${minutos(umbrales.respuestaMs)}, avisaremos a tus contactos de emergencia.`,
    boton: 'Estoy bien',
  };
}

// Cuenta regresiva del modal: "1:05".
export function formatoCuentaRegresiva(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// "Alerta enviada a las 14:12 a Mamá y Beto." (CA-17).
export function textoAlertaEnviada(triggeredAt: number, nombres: string[], timeZone?: string): string {
  const a = nombres.length ? ` a ${listaNombres(nombres)}` : '';
  return `Alerta enviada a las ${formatoHora(triggeredAt, timeZone)}${a}.`;
}

// Al terminar sin conexión con hora de regreso (CA-21).
export function textoTerminarSinRed(regreso: number, timeZone?: string): string {
  return `No tienes conexión. Si tu teléfono no se conecta antes de las ${formatoHora(horaDeAviso(regreso), timeZone)}, tus contactos recibirán un mensaje de que no has confirmado tu regreso.`;
}

// Texto para compartir la invitación por el medio que el usuario quiera (CA-1).
export function textoInvitacion(inviteUrl: string): string {
  return `Te registré como contacto de emergencia en SendaBC. Si me pasa algo durante una actividad al aire libre, te llegará un aviso por Telegram con mi ubicación. Para aceptar, abre este enlace en Telegram y toca "Iniciar": ${inviteUrl}`;
}

// Pantalla "Seguridad" (CA-1 a CA-7).
export const CONTACTS_PAGE_MESSAGES = {
  titulo: 'Seguridad',
  subtitulo: 'Contactos de emergencia',
  explicacion:
    'Si durante una actividad dejas de moverte y no respondes, o pides ayuda, avisaremos por Telegram a tus contactos activos con tu última ubicación.',
  vacio: 'Todavía no tienes contactos de emergencia. Agrega de uno a tres.',
  sinConexion:
    'Estos son los contactos guardados en tu teléfono. Para cambiarlos o enviar una prueba necesitas conexión.',
  error: 'No se pudieron cargar tus contactos. Inténtalo de nuevo.',
  pendiente: 'Compártele la invitación. Cuando la acepte en Telegram, aparecerá como Activo.',
  inalcanzable:
    'Bloqueó a SendaBC o borró la conversación en Telegram, así que no recibe avisos. Vuelve a compartirle la invitación.',
  agregar: 'Agregar contacto',
  compartir: 'Compartir invitación',
  probar: 'Enviar mensaje de prueba',
  editar: 'Editar',
  quitar: 'Quitar',
  agregadoTitulo: 'Contacto agregado',
  agregadoCuerpo:
    'Comparte la invitación con tu contacto por el medio que quieras. Tiene que abrirla en Telegram y tocar "Iniciar".',
  quitarTitulo: 'Quitar contacto',
  pruebaEnviada: 'Mensaje de prueba enviado. Pregúntale a tu contacto si le llegó.',
} as const;

// "¿Quitar a Mamá? Dejará de recibir tus avisos." (CA-3).
export function textoQuitar(nombre: string): string {
  return `¿Quitar a ${nombre}? Dejará de recibir tus avisos y su invitación ya no servirá.`;
}

// Resultado del mensaje de prueba cuando Telegram no lo entregó (CA-6, CA-7).
export function textoPruebaFallida(error: string | null): string {
  return error ? `No se envió: ${error}.` : 'No se envió el mensaje de prueba.';
}
