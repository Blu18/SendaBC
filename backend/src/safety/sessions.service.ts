import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AlertStatus,
  Prisma,
  type SafetySession as SessionRow,
} from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import type { FinishSessionDto } from './dto/finish-session.dto.js';
import type { SessionLocationDto } from './dto/session-location.dto.js';
import type { UpsertSessionDto } from './dto/upsert-session.dto.js';
import {
  ALERTA_CON_ENTREGAS,
  aSafetySession,
  type SafetySession,
} from './safety.types.js';

export const MENSAJES_SESION = {
  noExiste: 'Esta actividad no tiene una sesión de seguridad',
  regresoAntesDelInicio: 'La hora de regreso debe ser posterior al inicio',
  terminada: 'La actividad ya terminó: ya no se reciben ubicaciones',
};

// Sesiones de seguridad (spec 008, plan D1): una por actividad, con el clientGeneratedId de la
// actividad. Las escrituras son idempotentes para que la bandeja del teléfono pueda reintentarlas.
// Una sesión de otra cuenta responde 404, igual que una que no existe (CA-28).
@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Crea la sesión o actualiza su hora de regreso (CA-19, CA-23). El tipo y el inicio no
  // cambian después de crearla.
  async upsert(
    userId: string,
    clientId: string,
    dto: UpsertSessionDto,
  ): Promise<SafetySession> {
    const returnBy = dto.returnBy ? new Date(dto.returnBy) : null;
    const existente = await this.buscarPorId(clientId);
    if (existente) {
      return this.actualizarRegreso(userId, existente, returnBy);
    }

    validarRegreso(new Date(dto.startedAt), returnBy);
    try {
      const sesion = await this.prisma.safetySession.create({
        data: {
          clientGeneratedId: clientId,
          userId,
          type: dto.type,
          startedAt: new Date(dto.startedAt),
          returnBy,
        },
      });
      return aSafetySession(sesion, null);
    } catch (error) {
      // Dos PUT simultáneos de la misma sesión: el segundo actualiza la que creó el primero.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const ganadora = await this.buscarPorId(clientId);
        if (ganadora) return this.actualizarRegreso(userId, ganadora, returnBy);
      }
      throw error;
    }
  }

  async get(userId: string, clientId: string): Promise<SafetySession> {
    return this.responder(await this.buscar(userId, clientId));
  }

  // Guarda la ubicación solo si es más reciente que la guardada: una que llega atrasada de la
  // bandeja no reemplaza a la última (CA-20, plan D7). Devuelve la sesión y si se guardó.
  async recordLocation(
    userId: string,
    clientId: string,
    dto: SessionLocationDto,
  ): Promise<{ sesion: SessionRow; guardada: boolean }> {
    const sesion = await this.buscar(userId, clientId);
    if (sesion.endedAt) {
      // Al terminar la actividad deja de recibirse su ubicación (RN-9).
      throw new ConflictException(MENSAJES_SESION.terminada);
    }

    const recordedAt = new Date(dto.recordedAt);
    const filas = await this.prisma.$executeRaw`
      UPDATE safety_sessions
         SET "lastLocation" = ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography,
             "lastLocationAt" = ${recordedAt},
             "updatedAt" = now()
       WHERE id = ${sesion.id}::uuid
         AND "endedAt" IS NULL
         AND ("lastLocationAt" IS NULL OR "lastLocationAt" < ${recordedAt})`;
    return { sesion, guardada: filas === 1 };
  }

  // Termina la sesión (CA-19). Idempotente: un reintento conserva el primer fin.
  async finish(
    userId: string,
    clientId: string,
    dto: FinishSessionDto,
  ): Promise<SafetySession> {
    const sesion = await this.buscar(userId, clientId);
    if (sesion.endedAt) return this.responder(sesion);

    const terminada = await this.prisma.safetySession.update({
      where: { id: sesion.id },
      data: { endedAt: new Date(dto.endedAt) },
    });
    return this.responder(terminada);
  }

  // Sesión del usuario o 404.
  async buscar(userId: string, clientId: string): Promise<SessionRow> {
    const sesion = await this.buscarPorId(clientId);
    if (!sesion || sesion.userId !== userId) {
      throw new NotFoundException(MENSAJES_SESION.noExiste);
    }
    return sesion;
  }

  async responder(sesion: SessionRow): Promise<SafetySession> {
    const alerta = await this.prisma.emergencyAlert.findFirst({
      where: { sessionId: sesion.id, status: AlertStatus.ACTIVE },
      ...ALERTA_CON_ENTREGAS,
    });
    return aSafetySession(sesion, alerta);
  }

  private buscarPorId(clientId: string) {
    return this.prisma.safetySession.findUnique({
      where: { clientGeneratedId: clientId },
    });
  }

  private async actualizarRegreso(
    userId: string,
    sesion: SessionRow,
    returnBy: Date | null,
  ): Promise<SafetySession> {
    if (sesion.userId !== userId) {
      throw new NotFoundException(MENSAJES_SESION.noExiste);
    }
    // Con la actividad terminada la hora de regreso ya no sirve: se responde sin cambiarla.
    if (sesion.endedAt || mismaFecha(sesion.returnBy, returnBy)) {
      return this.responder(sesion);
    }
    validarRegreso(sesion.startedAt, returnBy);
    const actualizada = await this.prisma.safetySession.update({
      where: { id: sesion.id },
      data: { returnBy },
    });
    return this.responder(actualizada);
  }
}

// La hora de regreso es posterior al inicio (RN-10). 400 con la forma del ValidationPipe.
function validarRegreso(startedAt: Date, returnBy: Date | null): void {
  if (returnBy && returnBy.getTime() <= startedAt.getTime()) {
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Datos inválidos',
      errors: { returnBy: [MENSAJES_SESION.regresoAntesDelInicio] },
    });
  }
}

function mismaFecha(a: Date | null, b: Date | null): boolean {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}
