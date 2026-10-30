import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContactStatus,
  MessageKind,
  MessageStatus,
  type EmergencyContact as ContactRow,
} from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { mensajePrueba } from '../safety/messages.js';
import {
  TELEGRAM_CONFIG,
  type TelegramConfig,
} from '../telegram/telegram.config.js';
import {
  TELEGRAM_SENDER,
  type TelegramSender,
} from '../telegram/telegram.sender.js';
import type { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto.js';
import type { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto.js';
import { enlaceInvitacion, generarTokenInvitacion } from './invitation.js';

// Una cuenta tiene como máximo tres contactos, activos o pendientes (spec 008, RN-3).
export const MAX_CONTACTOS = 3;

// Un mensaje de prueba por contacto cada minuto (plan, 429).
export const ESPERA_PRUEBA_MS = 60_000;

export const MENSAJES_CONTACTO = {
  noExiste: 'Este contacto de emergencia no existe',
  limite: `Puedes tener como máximo ${MAX_CONTACTOS} contactos de emergencia`,
  pruebaNoActivo:
    'Solo puedes enviar un mensaje de prueba a un contacto que aceptó la invitación',
  pruebaSeguida:
    'Ya enviaste un mensaje de prueba a este contacto hace menos de un minuto. Espera un momento',
};

export type EmergencyContact = {
  id: string;
  name: string;
  status: ContactStatus;
  telegramName: string | null;
  inviteUrl: string | null;
  createdAt: string;
};

export type TestResult = {
  status: 'SENT' | 'FAILED';
  error: string | null;
};

// Contactos de emergencia de la cuenta (spec 008, CA-1 a CA-7). Todas las consultas filtran por
// el usuario del token: un contacto de otra cuenta responde 404 (CA-4, constitución 3.3).
@Injectable()
export class EmergencyContactService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TELEGRAM_SENDER) private readonly telegram: TelegramSender,
    @Inject(TELEGRAM_CONFIG) private readonly config: TelegramConfig,
  ) {}

  async list(userId: string): Promise<EmergencyContact[]> {
    const filas = await this.prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return filas.map((fila) => this.aRespuesta(fila));
  }

  // Queda "Pendiente de aceptar" con su enlace de invitación (CA-1).
  async create(
    userId: string,
    dto: CreateEmergencyContactDto,
  ): Promise<EmergencyContact> {
    const fila = await this.prisma.$transaction(async (tx) => {
      // Bloquear la fila del usuario serializa las altas de la misma cuenta: dos peticiones
      // simultáneas no pueden pasar ambas el conteo (RN-3).
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const total = await tx.emergencyContact.count({ where: { userId } });
      if (total >= MAX_CONTACTOS) {
        throw new ConflictException(MENSAJES_CONTACTO.limite);
      }
      return tx.emergencyContact.create({
        data: {
          userId,
          name: dto.name,
          status: ContactStatus.PENDING,
          inviteToken: generarTokenInvitacion(),
        },
      });
    });
    return this.aRespuesta(fila);
  }

  // Editar el nombre (CA-3).
  async update(
    userId: string,
    id: string,
    dto: UpdateEmergencyContactDto,
  ): Promise<EmergencyContact> {
    await this.buscar(userId, id);
    const fila = await this.prisma.emergencyContact.update({
      where: { id },
      data: { name: dto.name },
    });
    return this.aRespuesta(fila);
  }

  // Al borrar el contacto se borra su token: la invitación deja de servir y ya no recibe
  // avisos (CA-3). Los mensajes ya enviados conservan su copia del nombre (plan).
  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.emergencyContact.deleteMany({
      where: { id, userId },
    });
    if (count === 0) {
      throw new NotFoundException(MENSAJES_CONTACTO.noExiste);
    }
  }

  // Mensaje de prueba (CA-6). Solo a un contacto activo, y uno por minuto como máximo.
  async sendTest(userId: string, id: string): Promise<TestResult> {
    const contacto = await this.buscar(userId, id);
    if (
      contacto.status !== ContactStatus.ACTIVE ||
      contacto.telegramChatId === null
    ) {
      throw new ConflictException(MENSAJES_CONTACTO.pruebaNoActivo);
    }

    const reciente = await this.prisma.alertMessage.findFirst({
      where: {
        contactId: id,
        kind: MessageKind.TEST,
        createdAt: { gt: new Date(Date.now() - ESPERA_PRUEBA_MS) },
      },
      select: { id: true },
    });
    if (reciente) {
      throw new HttpException(
        MENSAJES_CONTACTO.pruebaSeguida,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const usuario = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { displayName: true },
    });
    const resultado = await this.telegram.sendMessage(
      contacto.telegramChatId,
      mensajePrueba({ usuario: usuario.displayName, contacto: contacto.name }),
    );

    await this.prisma.alertMessage.create({
      data: {
        userId,
        contactId: id,
        contactName: contacto.name,
        kind: MessageKind.TEST,
        status: resultado.ok ? MessageStatus.SENT : MessageStatus.FAILED,
        telegramMessageId: resultado.messageId ?? null,
        error: resultado.error ?? null,
      },
    });
    if (resultado.blocked) {
      await this.marcarInalcanzable(id);
    }

    return resultado.ok
      ? { status: 'SENT', error: null }
      : { status: 'FAILED', error: resultado.error ?? null };
  }

  // El contacto bloqueó al bot o borró la conversación: queda "No recibe mensajes" con una
  // invitación nueva para volver a compartirla (CA-7, RN-13). También lo usan las alertas (T7).
  async marcarInalcanzable(id: string): Promise<void> {
    await this.prisma.emergencyContact.update({
      where: { id },
      data: {
        status: ContactStatus.UNREACHABLE,
        inviteToken: generarTokenInvitacion(),
      },
    });
  }

  private async buscar(userId: string, id: string): Promise<ContactRow> {
    const fila = await this.prisma.emergencyContact.findFirst({
      where: { id, userId },
    });
    if (!fila) {
      throw new NotFoundException(MENSAJES_CONTACTO.noExiste);
    }
    return fila;
  }

  private aRespuesta(fila: ContactRow): EmergencyContact {
    return {
      id: fila.id,
      name: fila.name,
      status: fila.status,
      telegramName: fila.telegramName,
      inviteUrl: fila.inviteToken
        ? enlaceInvitacion(this.config.botUsername, fila.inviteToken)
        : null,
      createdAt: fila.createdAt.toISOString(),
    };
  }
}
