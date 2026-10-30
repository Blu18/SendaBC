import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AlertReason,
  AlertStatus,
  ContactStatus,
  MessageKind,
  MessageStatus,
  Prisma,
  type SafetySession as SessionRow,
} from '@prisma/client';
import { EmergencyContactService } from '../emergency-contact/emergency-contact.service.js';
import { PrismaService } from '../prisma.service.js';
import {
  TELEGRAM_SENDER,
  type TelegramSender,
} from '../telegram/telegram.sender.js';
import type { CreateAlertDto } from './dto/create-alert.dto.js';
import type { FinishSessionDto } from './dto/finish-session.dto.js';
import type { SessionLocationDto } from './dto/session-location.dto.js';
import { debeReenviar, type Punto } from './forwarding.js';
import {
  mensajeAlerta,
  mensajeCancelada,
  mensajeNoRegreso,
  mensajeTermino,
  mensajeUbicacion,
  type Ubicacion,
} from './messages.js';
import {
  ALERTA_CON_ENTREGAS,
  aSafetyAlert,
  type SafetyAlert,
  type SafetySession,
} from './safety.types.js';
import { SessionsService } from './sessions.service.js';

export const MENSAJES_ALERTA = {
  noExiste: 'Esta alerta no existe',
  noActiva: 'Esta alerta ya no está activa',
  ubicacionIncompleta:
    'La ubicación de la alerta debe llevar latitud, longitud y hora, o ninguna',
};

const MOTIVO_DB = {
  INACTIVITY: AlertReason.INACTIVITY_TIMEOUT,
  SOS: AlertReason.MANUAL_SOS,
} as const;

type NuevaAlerta = {
  sessionId: string;
  clientAlertId: string | null;
  reason: AlertReason;
  triggeredAt: Date;
  ubicacion: Ubicacion | null;
};

type Contacto = { id: string; name: string; telegramChatId: bigint };

// Alertas de una sesión de seguridad y sus mensajes a los contactos (spec 008, CA-14 a CA-17,
// CA-22, CA-24, CA-25, CA-27). Telegram puede fallar: un envío fallido se registra y no detiene
// a los demás.
@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly contacts: EmergencyContactService,
    @Inject(TELEGRAM_SENDER) private readonly telegram: TelegramSender,
  ) {}

  // Alerta por inactividad o SOS desde el teléfono (CA-14, CA-24). `creada` es false si ya
  // existía (reintento con el mismo clientAlertId, o ya había una activa: CA-27, RN-8); entonces
  // no se envía nada.
  async create(
    userId: string,
    clientId: string,
    dto: CreateAlertDto,
  ): Promise<{ alerta: SafetyAlert; creada: boolean }> {
    const sesion = await this.sessions.buscar(userId, clientId);
    const ubicacion = ubicacionDe(dto);

    const id = await this.insertar({
      sessionId: sesion.id,
      clientAlertId: dto.clientAlertId,
      reason: MOTIVO_DB[dto.reason],
      triggeredAt: new Date(dto.triggeredAt),
      ubicacion,
    });
    if (!id) {
      return {
        alerta: await this.existente(sesion, dto.clientAlertId),
        creada: false,
      };
    }

    await this.avisar(sesion, id);
    return { alerta: await this.leer(id), creada: true };
  }

  // Inserta la alerta si no hay otra activa en la sesión ni otra con el mismo clientAlertId.
  // ON CONFLICT DO NOTHING se apoya en los índices únicos (el parcial de ACTIVE por sesión y el
  // de clientGeneratedId): dos peticiones o dos instancias no la duplican (CA-27, plan D3).
  // Devuelve el id, o null si no se insertó. También la usa la tarea de la hora de regreso (T8).
  async insertar(alerta: NuevaAlerta): Promise<string | null> {
    const id = randomUUID();
    const punto = alerta.ubicacion
      ? Prisma.sql`ST_SetSRID(ST_MakePoint(${alerta.ubicacion.lng}, ${alerta.ubicacion.lat}), 4326)::geography`
      : Prisma.sql`NULL`;
    // El conteo de los 15 min del reenvío empieza en la hora de la ubicación de la alerta (RN-11).
    const desde = alerta.ubicacion?.at ?? alerta.triggeredAt;
    const filas = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      INSERT INTO emergency_alerts
        (id, "sessionId", "clientGeneratedId", reason, status, "triggeredAt",
         location, "locationAt", "lastForwardedAt", "lastForwardedLocation")
      VALUES
        (${id}::uuid, ${alerta.sessionId}::uuid, ${alerta.clientAlertId}::uuid,
         ${alerta.reason}::"AlertReason", 'ACTIVE', ${alerta.triggeredAt},
         ${punto}, ${alerta.ubicacion?.at ?? null}::timestamptz, ${desde}, ${punto})
      ON CONFLICT DO NOTHING
      RETURNING id`);
    return filas[0]?.id ?? null;
  }

  // Manda el aviso de una alerta recién creada a cada contacto activo: el texto (RN-6) y después
  // el pin de la ubicación (plan D10).
  async avisar(
    sesion: Pick<SessionRow, 'userId' | 'type' | 'returnBy'>,
    alertaId: string,
  ): Promise<void> {
    const alerta = await this.prisma.emergencyAlert.findUniqueOrThrow({
      where: { id: alertaId },
      select: { reason: true, triggeredAt: true },
    });
    const [usuario, ubicacion] = await Promise.all([
      this.nombreDe(sesion.userId),
      this.ubicacionDeAlerta(alertaId),
    ]);
    const html =
      alerta.reason === AlertReason.RETURN_TIME_EXCEEDED
        ? mensajeNoRegreso({
            usuario,
            returnBy: sesion.returnBy ?? alerta.triggeredAt,
            tipo: sesion.type,
            ubicacion,
          })
        : mensajeAlerta({
            usuario,
            motivo: alerta.reason,
            triggeredAt: alerta.triggeredAt,
            tipo: sesion.type,
            ubicacion,
          });
    await this.enviarATodos(
      sesion.userId,
      alertaId,
      MessageKind.ALERT,
      html,
      ubicacion,
    );
  }

  // Cancelar (CA-25): los contactos reciben que el usuario está bien y dejan de llegarles sus
  // ubicaciones, porque el reenvío solo sale con la alerta ACTIVE.
  async cancel(userId: string, alertId: string): Promise<SafetyAlert> {
    const alerta = await this.prisma.emergencyAlert.findFirst({
      where: { id: alertId, session: { userId } },
      select: { id: true, status: true },
    });
    if (!alerta) {
      throw new NotFoundException(MENSAJES_ALERTA.noExiste);
    }
    // Condicionado a ACTIVE: dos cancelaciones a la vez solo avisan una vez.
    const { count } = await this.prisma.emergencyAlert.updateMany({
      where: { id: alertId, status: AlertStatus.ACTIVE },
      data: { status: AlertStatus.CANCELLED, resolvedAt: new Date() },
    });
    if (count === 0) {
      throw new ConflictException(MENSAJES_ALERTA.noActiva);
    }

    const usuario = await this.nombreDe(userId);
    await this.enviarATodos(
      userId,
      alertId,
      MessageKind.CANCELLED,
      mensajeCancelada({ usuario }),
      null,
    );
    return this.leer(alertId);
  }

  // Recibe la ubicación del teléfono (CA-20) y, con una alerta activa, la reenvía a los contactos
  // si toca (CA-16, RN-11, plan D7).
  async recordLocation(
    userId: string,
    clientId: string,
    dto: SessionLocationDto,
  ): Promise<void> {
    const { sesion, guardada } = await this.sessions.recordLocation(
      userId,
      clientId,
      dto,
    );
    if (!guardada) return;

    const [activa] = await this.prisma.$queryRaw<
      { id: string; at: Date | null; lat: number | null; lng: number | null }[]
    >(Prisma.sql`
      SELECT id, "lastForwardedAt" AS at,
             ST_Y("lastForwardedLocation"::geometry) AS lat,
             ST_X("lastForwardedLocation"::geometry) AS lng
        FROM emergency_alerts
       WHERE "sessionId" = ${sesion.id}::uuid AND status = 'ACTIVE'`);
    if (!activa) return;

    const nuevo = {
      at: new Date(dto.recordedAt),
      punto: { lat: dto.latitude, lng: dto.longitude },
    };
    const ultimoPunto: Punto | null =
      activa.lat === null || activa.lng === null
        ? null
        : { lat: activa.lat, lng: activa.lng };
    if (!debeReenviar({ at: activa.at, punto: ultimoPunto }, nuevo)) return;

    // Se reclama el reenvío solo si nadie lo movió desde que se leyó y la alerta sigue activa:
    // dos ubicaciones simultáneas no mandan dos mensajes.
    const reclamado = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE emergency_alerts
         SET "lastForwardedAt" = ${nuevo.at},
             "lastForwardedLocation" = ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography
       WHERE id = ${activa.id}::uuid
         AND status = 'ACTIVE'
         AND "lastForwardedAt" IS NOT DISTINCT FROM ${activa.at}::timestamptz`);
    if (reclamado !== 1) return;

    const ubicacion = { ...nuevo.punto, at: nuevo.at };
    const usuario = await this.nombreDe(userId);
    await this.enviarATodos(
      userId,
      activa.id,
      MessageKind.LOCATION,
      mensajeUbicacion({ usuario, ubicacion }),
      ubicacion,
    );
  }

  // Termina la sesión (CA-19). Si la alerta activa es por la hora de regreso, se resuelve y los
  // contactos reciben que ya terminó y está bien (CA-22). Una alerta por inactividad o SOS sigue
  // activa hasta que el usuario la cancele (CA-26).
  async finish(
    userId: string,
    clientId: string,
    dto: FinishSessionDto,
  ): Promise<SafetySession> {
    await this.sessions.finish(userId, clientId, dto);
    const sesion = await this.sessions.buscar(userId, clientId);

    const activa = await this.prisma.emergencyAlert.findFirst({
      where: {
        sessionId: sesion.id,
        status: AlertStatus.ACTIVE,
        reason: AlertReason.RETURN_TIME_EXCEEDED,
      },
      select: { id: true },
    });
    if (activa) {
      const { count } = await this.prisma.emergencyAlert.updateMany({
        where: { id: activa.id, status: AlertStatus.ACTIVE },
        data: { status: AlertStatus.RESOLVED, resolvedAt: new Date() },
      });
      if (count === 1) {
        const usuario = await this.nombreDe(userId);
        await this.enviarATodos(
          userId,
          activa.id,
          MessageKind.FINISHED,
          mensajeTermino({ usuario, endedAt: sesion.endedAt! }),
          null,
        );
      }
    }
    return this.sessions.responder(sesion);
  }

  // Manda el mismo texto (y el pin, si hay ubicación) a cada contacto activo y registra cada
  // envío. Si un contacto bloqueó al bot, pasa a "No recibe mensajes" (CA-7).
  private async enviarATodos(
    userId: string,
    alertId: string,
    kind: MessageKind,
    html: string,
    pin: Punto | null,
  ): Promise<void> {
    const contactos = await this.prisma.emergencyContact.findMany({
      where: {
        userId,
        status: ContactStatus.ACTIVE,
        telegramChatId: { not: null },
      },
      select: { id: true, name: true, telegramChatId: true },
      orderBy: { createdAt: 'asc' },
    });
    for (const contacto of contactos as Contacto[]) {
      await this.enviarA(userId, alertId, kind, html, pin, contacto);
    }
  }

  private async enviarA(
    userId: string,
    alertId: string,
    kind: MessageKind,
    html: string,
    pin: Punto | null,
    contacto: Contacto,
  ): Promise<void> {
    const texto = await this.telegram.sendMessage(
      contacto.telegramChatId,
      html,
    );
    let bloqueado = texto.blocked === true;
    if (texto.ok && pin) {
      const ubicacion = await this.telegram.sendLocation(
        contacto.telegramChatId,
        pin.lat,
        pin.lng,
      );
      bloqueado = ubicacion.blocked === true;
    }

    await this.prisma.alertMessage.create({
      data: {
        userId,
        alertId,
        contactId: contacto.id,
        contactName: contacto.name,
        kind,
        status: texto.ok ? MessageStatus.SENT : MessageStatus.FAILED,
        telegramMessageId: texto.messageId ?? null,
        error: texto.error ?? null,
      },
    });
    if (bloqueado) {
      await this.contacts.marcarInalcanzable(contacto.id);
    }
  }

  // La alerta que ya existía: la del mismo clientAlertId (reintento) o la activa de la sesión.
  private async existente(
    sesion: SessionRow,
    clientAlertId: string,
  ): Promise<SafetyAlert> {
    const alerta =
      (await this.prisma.emergencyAlert.findUnique({
        where: { clientGeneratedId: clientAlertId },
        ...ALERTA_CON_ENTREGAS,
      })) ??
      (await this.prisma.emergencyAlert.findFirst({
        where: { sessionId: sesion.id, status: AlertStatus.ACTIVE },
        ...ALERTA_CON_ENTREGAS,
      }));
    // Un clientAlertId que ya usó otra sesión no se revela.
    if (!alerta || alerta.sessionId !== sesion.id) {
      throw new NotFoundException(MENSAJES_ALERTA.noExiste);
    }
    return aSafetyAlert(alerta);
  }

  private async leer(id: string): Promise<SafetyAlert> {
    return aSafetyAlert(
      await this.prisma.emergencyAlert.findUniqueOrThrow({
        where: { id },
        ...ALERTA_CON_ENTREGAS,
      }),
    );
  }

  private async ubicacionDeAlerta(id: string): Promise<Ubicacion | null> {
    const [fila] = await this.prisma.$queryRaw<
      { lat: number | null; lng: number | null; at: Date | null }[]
    >(Prisma.sql`
      SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng,
             "locationAt" AS at
        FROM emergency_alerts WHERE id = ${id}::uuid`);
    if (!fila || fila.lat === null || fila.lng === null || !fila.at)
      return null;
    return { lat: fila.lat, lng: fila.lng, at: fila.at };
  }

  private async nombreDe(userId: string): Promise<string> {
    const usuario = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { displayName: true },
    });
    return usuario.displayName;
  }
}

// Las tres o ninguna: una ubicación sin hora no sirve para decir de cuándo es (RN-5).
function ubicacionDe(dto: CreateAlertDto): Ubicacion | null {
  const partes = [dto.latitude, dto.longitude, dto.locationAt];
  const presentes = partes.filter((p) => p !== null && p !== undefined).length;
  if (presentes === 0) return null;
  if (presentes < partes.length) {
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Datos inválidos',
      errors: { locationAt: [MENSAJES_ALERTA.ubicacionIncompleta] },
    });
  }
  return {
    lat: dto.latitude!,
    lng: dto.longitude!,
    at: new Date(dto.locationAt!),
  };
}
