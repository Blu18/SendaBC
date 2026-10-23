import { Logger } from '@nestjs/common';
import {
  CONTACTO_BLOQUEO,
  type SendResult,
  type TelegramSender,
} from './telegram.sender.js';

export type MensajeRegistrado =
  | { method: 'sendMessage'; chatId: bigint; html: string }
  | { method: 'sendLocation'; chatId: bigint; lat: number; lng: number };

// Emisor que no llama a Telegram: registra cada envío en el log y en `sent` (spec 008, plan D2).
// Se usa en desarrollo (TELEGRAM_MODE=log) y en las pruebas.
export class LogTelegramSender implements TelegramSender {
  private readonly logger = new Logger('Telegram');
  private siguienteId = 1;

  readonly sent: MensajeRegistrado[] = [];
  // Chats que simulan haber bloqueado al bot (CA-7, e2e de T10).
  readonly blockedChats = new Set<bigint>();

  sendMessage(chatId: bigint, html: string): Promise<SendResult> {
    return this.registrar({ method: 'sendMessage', chatId, html });
  }

  sendLocation(chatId: bigint, lat: number, lng: number): Promise<SendResult> {
    return this.registrar({ method: 'sendLocation', chatId, lat, lng });
  }

  private registrar(mensaje: MensajeRegistrado): Promise<SendResult> {
    if (this.blockedChats.has(mensaje.chatId)) {
      this.logger.log(
        `${mensaje.method} a ${mensaje.chatId}: bloqueado (simulado)`,
      );
      return Promise.resolve({
        ok: false,
        blocked: true,
        error: CONTACTO_BLOQUEO,
      });
    }
    this.sent.push(mensaje);
    const detalle =
      mensaje.method === 'sendMessage'
        ? mensaje.html
        : `${mensaje.lat},${mensaje.lng}`;
    this.logger.log(`${mensaje.method} a ${mensaje.chatId}: ${detalle}`);
    return Promise.resolve({ ok: true, messageId: this.siguienteId++ });
  }
}
