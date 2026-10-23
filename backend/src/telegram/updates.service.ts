import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ContactStatus,
  MessageKind,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import {
  mensajeBienvenida,
  mensajeInvitacionInvalida,
  mensajeQueEsElBot,
} from '../safety/messages.js';
import { TELEGRAM_SENDER, type TelegramSender } from './telegram.sender.js';

// Lo que se lee de un Update de Telegram (https://core.telegram.org/bots/api#update). El resto
// se ignora; llega del webhook o de getUpdates sin pasar por un DTO, así que todo es opcional.
export type TelegramUpdate = {
  update_id?: number;
  message?: {
    chat?: { id?: number; type?: string };
    from?: { first_name?: string; last_name?: string; username?: string };
    text?: string;
  };
};

export type ResultadoUpdate =
  'ignorado' | 'vinculado' | 'invitacion-invalida' | 'explicacion';

// "/start <token>", también como "/start@SendaBCBot <token>".
const START = /^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/;

// Atiende los mensajes que recibe el bot (spec 008, CA-5, CA-7, RN-13). Solo hace algo con
// /start <token>; a todo lo demás responde qué es el bot.
@Injectable()
export class UpdatesService {
  private readonly logger = new Logger(UpdatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(TELEGRAM_SENDER) private readonly telegram: TelegramSender,
  ) {}

  async atender(update: TelegramUpdate): Promise<ResultadoUpdate> {
    const mensaje = update.message;
    const chat = mensaje?.chat;
    // Solo chats privados: el bot no atiende grupos ni canales.
    if (typeof chat?.id !== 'number' || chat.type !== 'private') {
      return 'ignorado';
    }
    const chatId = BigInt(chat.id);

    const token = START.exec(mensaje?.text?.trim() ?? '')?.[1];
    if (!token) {
      await this.responder(chatId, mensajeQueEsElBot());
      return 'explicacion';
    }

    const vinculado = await this.vincular(
      token,
      chatId,
      nombreTelegram(mensaje?.from),
    );
    if (!vinculado) {
      await this.responder(chatId, mensajeInvitacionInvalida());
      return 'invitacion-invalida';
    }
    await this.darBienvenida(chatId, vinculado);
    return 'vinculado';
  }

  // Deja el contacto ACTIVE con su chat y quita el token: la invitación es de un solo uso (D11).
  // Un contacto UNREACHABLE que vuelve a aceptar su invitación pasa a ACTIVE (RN-13).
  private async vincular(
    token: string,
    chatId: bigint,
    telegramName: string | null,
  ) {
    const contacto = await this.prisma.emergencyContact.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        name: true,
        userId: true,
        user: { select: { displayName: true } },
      },
    });
    if (!contacto) return null;

    try {
      // Condicionado al token: si dos /start con el mismo token llegan a la vez, solo uno vincula.
      const { count } = await this.prisma.emergencyContact.updateMany({
        where: { id: contacto.id, inviteToken: token },
        data: {
          status: ContactStatus.ACTIVE,
          inviteToken: null,
          telegramChatId: chatId,
          telegramName,
          acceptedAt: new Date(),
        },
      });
      return count === 1 ? contacto : null;
    } catch (error) {
      // UNIQUE (userId, telegramChatId): esa cuenta de Telegram ya es otro contacto del mismo
      // usuario (RN-3).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
  }

  private async darBienvenida(
    chatId: bigint,
    contacto: {
      id: string;
      name: string;
      userId: string;
      user: { displayName: string };
    },
  ): Promise<void> {
    const resultado = await this.telegram.sendMessage(
      chatId,
      mensajeBienvenida({
        usuario: contacto.user.displayName,
        contacto: contacto.name,
      }),
    );
    await this.prisma.alertMessage.create({
      data: {
        userId: contacto.userId,
        contactId: contacto.id,
        contactName: contacto.name,
        kind: MessageKind.WELCOME,
        status: resultado.ok ? MessageStatus.SENT : MessageStatus.FAILED,
        telegramMessageId: resultado.messageId ?? null,
        error: resultado.error ?? null,
      },
    });
  }

  private async responder(chatId: bigint, html: string): Promise<void> {
    const resultado = await this.telegram.sendMessage(chatId, html);
    if (!resultado.ok) {
      this.logger.warn(`No se pudo responder a ${chatId}: ${resultado.error}`);
    }
  }
}

// Nombre visible del contacto en Telegram, para que el usuario lo reconozca en la app (CA-5).
export function nombreTelegram(
  from: { first_name?: string; last_name?: string; username?: string } = {},
): string | null {
  const nombre = [from.first_name, from.last_name]
    .filter((parte) => parte?.trim())
    .join(' ')
    .trim();
  if (nombre) return nombre;
  return from.username ? `@${from.username}` : null;
}
