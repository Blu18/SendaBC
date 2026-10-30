import { randomBytes } from 'node:crypto';

// Invitación de un solo uso para que el contacto inicie la conversación con el bot
// (spec 008, plan D11).

// 32 bytes aleatorios en base64url: 43 caracteres de [A-Za-z0-9_-], dentro de los 64 que
// permite el parámetro start de Telegram.
export function generarTokenInvitacion(): string {
  return randomBytes(32).toString('base64url');
}

// Con TELEGRAM_MODE=log puede no haber bot configurado: el enlace no abre nada, pero la app
// lo puede mostrar y compartir igual.
const BOT_SIN_CONFIGURAR = 'SendaBC_bot';

export function enlaceInvitacion(
  botUsername: string | null,
  token: string,
): string {
  return `https://t.me/${botUsername ?? BOT_SIN_CONFIGURAR}?start=${token}`;
}
