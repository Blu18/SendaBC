import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertReason, Prisma, type ActivityType } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { AlertsService } from './alerts.service.js';

// El servidor avisa cuando pasa la hora de regreso más 30 minutos (spec 008, RN-10).
export const MARGEN_REGRESO_MS = 30 * 60_000;

// Las sesiones vencen cuando returnBy + 30 min < ahora, es decir, returnBy < ahora - 30 min.
export function limiteDeRegreso(ahora: Date): Date {
  return new Date(ahora.getTime() - MARGEN_REGRESO_MS);
}

type SesionVencida = {
  id: string;
  userId: string;
  type: ActivityType;
  returnBy: Date;
  lat: number | null;
  lng: number | null;
  lastLocationAt: Date | null;
};

// Tarea de la hora de regreso (spec 008, CA-18, CA-19, plan D3): cada minuto busca las
// actividades sin terminar cuya hora de regreso más el margen ya pasó, y crea una alerta
// RETURN_TIME con la última ubicación que recibió el servidor, aunque el teléfono no tenga señal.
@Injectable()
export class ReturnTimeJob {
  private readonly logger = new Logger(ReturnTimeJob.name);
  private corriendo = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'hora-de-regreso' })
  async revisar(): Promise<void> {
    // Si una ejecución tarda más de un minuto, la siguiente no se encima en esta instancia.
    // Entre instancias, el índice único parcial evita las alertas duplicadas.
    if (this.corriendo) return;
    this.corriendo = true;
    try {
      await this.ejecutar(new Date());
    } finally {
      this.corriendo = false;
    }
  }

  // Devuelve cuántas alertas creó. `ahora` se recibe para poder probarla con un reloj simulado.
  async ejecutar(ahora: Date): Promise<number> {
    const vencidas = await this.prisma.$queryRaw<SesionVencida[]>(Prisma.sql`
      SELECT s.id, s."userId", s.type, s."returnBy",
             ST_Y(s."lastLocation"::geometry) AS lat,
             ST_X(s."lastLocation"::geometry) AS lng,
             s."lastLocationAt"
        FROM safety_sessions s
       WHERE s."endedAt" IS NULL
         AND s."returnBy" IS NOT NULL
         AND s."returnBy" < ${limiteDeRegreso(ahora)}
         -- Con otra alerta activa no se crea una segunda (CA-27).
         AND NOT EXISTS (
           SELECT 1 FROM emergency_alerts a
            WHERE a."sessionId" = s.id AND a.status = 'ACTIVE')
         -- Ya se avisó por esta hora de regreso: si el usuario canceló esa alerta, no se repite
         -- cada minuto. Cambiar la hora de regreso a una posterior permite volver a avisar.
         AND NOT EXISTS (
           SELECT 1 FROM emergency_alerts a
            WHERE a."sessionId" = s.id
              AND a.reason = 'RETURN_TIME_EXCEEDED'
              AND a."triggeredAt" > s."returnBy")
       ORDER BY s."returnBy"`);

    let creadas = 0;
    for (const sesion of vencidas) {
      try {
        if (await this.alertar(sesion, ahora)) creadas++;
      } catch (error) {
        // Una sesión que falla no detiene a las demás; se reintenta en la siguiente ejecución.
        this.logger.error(
          `No se pudo alertar por la hora de regreso de la sesión ${sesion.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return creadas;
  }

  private async alertar(sesion: SesionVencida, ahora: Date): Promise<boolean> {
    const ubicacion =
      sesion.lat !== null && sesion.lng !== null && sesion.lastLocationAt
        ? { lat: sesion.lat, lng: sesion.lng, at: sesion.lastLocationAt }
        : null;
    const id = await this.alerts.insertar({
      sessionId: sesion.id,
      clientAlertId: null,
      reason: AlertReason.RETURN_TIME_EXCEEDED,
      triggeredAt: ahora,
      ubicacion,
    });
    // null: otra instancia o una alerta del teléfono ganó la carrera; no se avisa dos veces.
    if (!id) return false;

    await this.alerts.avisar(sesion, id);
    return true;
  }
}
