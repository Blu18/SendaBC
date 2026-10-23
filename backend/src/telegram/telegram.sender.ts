// Emisor de mensajes de Telegram (spec 008, plan D2). Los servicios dependen de esta interfaz;
// el módulo elige el emisor real o el que solo registra según TELEGRAM_MODE.

export const TELEGRAM_SENDER = Symbol('TELEGRAM_SENDER');

export type SendResult = {
  ok: boolean;
  messageId?: number;
  // Motivo del fallo, en español: se guarda en alert_messages y se muestra al usuario (CA-6).
  error?: string;
  // El contacto bloqueó al bot o borró la conversación: pasa a UNREACHABLE (CA-7).
  blocked?: boolean;
};

export interface TelegramSender {
  // Texto en el HTML de Telegram (parse_mode HTML).
  sendMessage(chatId: bigint, html: string): Promise<SendResult>;
  // Pin nativo de la ubicación (plan D10).
  sendLocation(chatId: bigint, lat: number, lng: number): Promise<SendResult>;
}

export const CONTACTO_BLOQUEO =
  'El contacto bloqueó a SendaBC o borró la conversación en Telegram';
