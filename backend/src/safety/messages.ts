import type { ActivityType } from '@prisma/client';

// Textos de los mensajes de Telegram a los contactos (spec 008, plan "Mensajes").
// Puros: no leen el reloj ni la base. Van en el HTML de Telegram con los datos del usuario escapados
// y nunca incluyen el correo del usuario (RN-6).

export const ZONA_HORARIA = 'America/Tijuana';

export type Ubicacion = { lat: number; lng: number; at: Date };

const TIPOS: Record<ActivityType, string> = {
  HIKING: 'Senderismo',
  TRAIL_RUNNING: 'Trail running',
  CYCLING: 'Ciclismo',
};

const AVISO_911 = 'Si crees que está en peligro, llama al 911.';

// Escapa lo que Telegram interpreta en parse_mode HTML.
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Enlace universal de Google Maps (plan D10).
export function enlaceMapa(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const formatoHora = new Intl.DateTimeFormat('es-MX', {
  timeZone: ZONA_HORARIA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const formatoDia = new Intl.DateTimeFormat('es-MX', {
  timeZone: ZONA_HORARIA,
  day: 'numeric',
  month: 'short',
});

// "14:05" en America/Tijuana; con el día ("21 oct, 14:05") si no es el mismo día que `referencia`.
export function hora(fecha: Date, referencia: Date = fecha): string {
  const hhmm = formatoHora.format(fecha);
  const mismoDia = formatoDia.format(fecha) === formatoDia.format(referencia);
  return mismoDia ? hhmm : `${formatoDia.format(fecha)}, ${hhmm}`;
}

// Última ubicación conocida con su hora (RN-5): si es vieja, el contacto ve de cuándo es.
function lineaUbicacion(ubicacion: Ubicacion | null, referencia: Date): string {
  if (!ubicacion) {
    return 'Última ubicación: la app no registró ninguna.';
  }
  const enlace = escaparHtml(enlaceMapa(ubicacion.lat, ubicacion.lng));
  return (
    `Última ubicación, de las ${hora(ubicacion.at, referencia)}: ` +
    `<a href="${enlace}">ver en el mapa</a>`
  );
}

export function mensajeBienvenida(datos: {
  usuario: string;
  contacto: string;
}): string {
  const usuario = escaparHtml(datos.usuario);
  return [
    `Hola, ${escaparHtml(datos.contacto)}. <b>${usuario}</b> te registró como contacto de emergencia en SendaBC, una app para registrar actividades al aire libre en Baja California.`,
    `Si durante una actividad deja de moverse y no responde, pide ayuda o no confirma su regreso a la hora que indicó, te llegará aquí una alerta con su última ubicación conocida y un enlace al mapa.`,
    `Te recomendamos no silenciar ni archivar este chat para que veas las alertas a tiempo.`,
  ].join('\n\n');
}

export function mensajePrueba(datos: {
  usuario: string;
  contacto: string;
}): string {
  return [
    `🧪 <b>Mensaje de prueba de SendaBC</b>`,
    `Hola, ${escaparHtml(datos.contacto)}. ${escaparHtml(datos.usuario)} envió este mensaje para confirmar que te llegarán sus alertas. No tienes que hacer nada.`,
  ].join('\n\n');
}

export function mensajeAlerta(datos: {
  usuario: string;
  motivo: 'INACTIVITY_TIMEOUT' | 'MANUAL_SOS';
  triggeredAt: Date;
  tipo: ActivityType;
  ubicacion: Ubicacion | null;
}): string {
  const usuario = escaparHtml(datos.usuario);
  const motivo =
    datos.motivo === 'MANUAL_SOS'
      ? `${usuario} pidió ayuda desde la app.`
      : `${usuario} dejó de moverse y no respondió cuando la app le preguntó si estaba bien.`;
  return [
    `🚨 <b>Alerta de SendaBC</b>`,
    `${motivo} Puede necesitar ayuda.`,
    [
      `Hora de la alerta: ${hora(datos.triggeredAt)}`,
      `Actividad: ${TIPOS[datos.tipo]}`,
      lineaUbicacion(datos.ubicacion, datos.triggeredAt),
    ].join('\n'),
    `Si se sigue moviendo y tiene señal, te enviaremos su ubicación actualizada. ${AVISO_911}`,
  ].join('\n\n');
}

export function mensajeNoRegreso(datos: {
  usuario: string;
  returnBy: Date;
  tipo: ActivityType;
  ubicacion: Ubicacion | null;
}): string {
  const usuario = escaparHtml(datos.usuario);
  return [
    `⚠️ <b>Alerta de SendaBC</b>`,
    `${usuario} <b>no ha confirmado su regreso</b>. Indicó que regresaría a las ${hora(datos.returnBy)} y su actividad no ha terminado.`,
    `Puede deberse a falta de señal: si recupera la conexión y ya terminó, te avisaremos. Intenta comunicarte con ${usuario}.`,
    [
      `Actividad: ${TIPOS[datos.tipo]}`,
      lineaUbicacion(datos.ubicacion, datos.returnBy),
    ].join('\n'),
    AVISO_911,
  ].join('\n\n');
}

export function mensajeUbicacion(datos: {
  usuario: string;
  ubicacion: Ubicacion;
}): string {
  const enlace = escaparHtml(
    enlaceMapa(datos.ubicacion.lat, datos.ubicacion.lng),
  );
  return `📍 Ubicación actualizada de ${escaparHtml(datos.usuario)}, de las ${hora(datos.ubicacion.at)}: <a href="${enlace}">ver en el mapa</a>`;
}

export function mensajeCancelada(datos: { usuario: string }): string {
  const usuario = escaparHtml(datos.usuario);
  return `✅ <b>${usuario} está bien.</b> Canceló la alerta de SendaBC. Ya no recibirás su ubicación.`;
}

export function mensajeTermino(datos: {
  usuario: string;
  endedAt: Date;
}): string {
  const usuario = escaparHtml(datos.usuario);
  return `✅ <b>${usuario} terminó su actividad y está bien.</b> La terminó a las ${hora(datos.endedAt)}; la alerta por no confirmar su regreso queda resuelta.`;
}

// Respuesta del bot a un /start con una invitación que ya no sirve: usada, quitada, o de una cuenta
// de Telegram que ya es contacto de ese usuario (spec 008, plan, webhook; RN-3).
export function mensajeInvitacionInvalida(): string {
  return [
    `Esta invitación de SendaBC no es válida: puede que ya se haya usado, que la hayan quitado o que ya seas contacto de emergencia de esa persona.`,
    `Si quieres ser su contacto, pídele que te comparta el enlace de nuevo desde la app.`,
  ].join('\n\n');
}

// Respuesta a cualquier otro mensaje (plan, webhook).
export function mensajeQueEsElBot(): string {
  return [
    `Este es el bot de avisos de SendaBC, una app para registrar actividades al aire libre en Baja California.`,
    `Solo envía alertas a los contactos de emergencia de quienes usan la app. Para serlo, abre el enlace de invitación que te compartan. No responde mensajes.`,
  ].join('\n\n');
}
