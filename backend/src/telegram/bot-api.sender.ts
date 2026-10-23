import {
  CONTACTO_BLOQUEO,
  type SendResult,
  type TelegramSender,
} from './telegram.sender.js';

// Límite de tiempo de cada llamada a la Bot API (spec 008, T2).
export const TELEGRAM_TIMEOUT_MS = 10_000;

type RespuestaBotApi = {
  ok: boolean;
  result?: { message_id?: number };
  description?: string;
};

// Emisor real: llama a la Bot API con fetch, sin librería (spec 008, plan D2).
export class BotApiTelegramSender implements TelegramSender {
  constructor(
    private readonly token: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  sendMessage(chatId: bigint, html: string): Promise<SendResult> {
    return this.llamar('sendMessage', {
      chat_id: chatIdJson(chatId),
      text: html,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  }

  sendLocation(chatId: bigint, lat: number, lng: number): Promise<SendResult> {
    return this.llamar('sendLocation', {
      chat_id: chatIdJson(chatId),
      latitude: lat,
      longitude: lng,
    });
  }

  private async llamar(metodo: string, body: object): Promise<SendResult> {
    let respuesta: Response;
    try {
      respuesta = await this.fetchFn(
        `https://api.telegram.org/bot${this.token}/${metodo}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
        },
      );
    } catch (e) {
      const agotado = e instanceof Error && e.name === 'TimeoutError';
      return {
        ok: false,
        error: agotado
          ? 'Telegram tardó demasiado en responder'
          : 'No se pudo conectar con Telegram',
      };
    }

    // 403: el contacto bloqueó al bot o borró la conversación (CA-7).
    if (respuesta.status === 403) {
      return { ok: false, blocked: true, error: CONTACTO_BLOQUEO };
    }

    const datos = (await respuesta
      .json()
      .catch(() => null)) as RespuestaBotApi | null;
    if (!respuesta.ok || !datos?.ok) {
      const motivo = datos?.description ? `: ${datos.description}` : '';
      return {
        ok: false,
        error: `Telegram respondió ${respuesta.status}${motivo}`,
      };
    }
    return { ok: true, messageId: datos.result?.message_id };
  }
}

// Telegram garantiza que los id de chat caben en 52 bits, así que el número de JSON es exacto.
function chatIdJson(chatId: bigint): number {
  return Number(chatId);
}
