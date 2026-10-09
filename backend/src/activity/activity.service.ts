import { Injectable } from '@nestjs/common';
import { ActivityStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { validarActividad } from './activity-validation.js';
import type { ActivityUploadDto } from './dto/activity-upload.dto.js';

// Resultado por actividad del lote, en el mismo orden en que llegaron (spec 005, D1).
export type SyncResult =
  | {
      clientGeneratedId: string;
      status: 'CREATED' | 'ALREADY_EXISTS';
      id: string;
    }
  | {
      clientGeneratedId: string | null;
      status: 'REJECTED';
      errors: string[];
    };

// Mensaje genérico: no revela que el identificador existe y es de otra cuenta.
export const ID_AJENO = 'Identificador de actividad inválido';

// Guardar una actividad de 3 h (≈ 5 400 puntos) puede tardar más que el límite por defecto
// de una transacción interactiva de Prisma (5 s).
const TRANSACTION_TIMEOUT_MS = 30_000;

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  // Las actividades se procesan una tras otra: un error inesperado (p. ej. la base no
  // responde) se relanza y el cliente reintenta el lote completo. Es seguro porque las ya
  // guardadas vuelven como ALREADY_EXISTS (CA-10).
  async syncBatch(userId: string, items: unknown[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    for (const item of items) {
      results.push(await this.syncOne(userId, item));
    }
    return results;
  }

  private async syncOne(userId: string, item: unknown): Promise<SyncResult> {
    const validacion = await validarActividad(item);
    if (!validacion.ok) {
      return {
        clientGeneratedId: idDe(item),
        status: 'REJECTED',
        errors: validacion.errores,
      };
    }
    const actividad = validacion.actividad;

    const existente = await this.buscar(actividad.clientGeneratedId);
    if (existente) return resultadoExistente(existente, userId, actividad);

    try {
      const id = await this.guardar(userId, actividad);
      return {
        clientGeneratedId: actividad.clientGeneratedId,
        status: 'CREATED',
        id,
      };
    } catch (error) {
      // Dos envíos simultáneos de la misma actividad: el segundo choca con la restricción
      // única de clientGeneratedId y se responde como reenvío (CA-10, D3).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const ganadora = await this.buscar(actividad.clientGeneratedId);
        if (ganadora) return resultadoExistente(ganadora, userId, actividad);
      }
      throw error;
    }
  }

  private buscar(clientGeneratedId: string) {
    return this.prisma.activity.findUnique({
      where: { clientGeneratedId },
      select: { id: true, userId: true },
    });
  }

  // Actividad, puntos y recorrido en una sola transacción: o se guarda todo o nada (CA-13).
  private guardar(userId: string, a: ActivityUploadDto): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        const { id } = await tx.activity.create({
          data: {
            clientGeneratedId: a.clientGeneratedId,
            // El dueño sale del token, nunca del body (CA-18).
            userId,
            type: a.type,
            status: ActivityStatus.SYNCED,
            startedAt: new Date(a.startedAt),
            endedAt: new Date(a.endedAt),
            distanceMeters: a.distanceMeters,
            durationSeconds: a.durationSeconds,
            elevationGainMeters: a.elevationGainMeters,
            elevationLossMeters: a.elevationLossMeters,
            elevationSource: a.elevationSource,
          },
          select: { id: true },
        });

        if (a.points.length > 0) {
          // Prisma no escribe columnas Unsupported: los puntos entran con un solo INSERT
          // desde arreglos paralelos (D4). ST_MakePoint recibe longitud, latitud (constitución 5.2).
          await tx.$executeRaw`
            INSERT INTO activity_points
              ("activityId", sequence, location, "altitudeMeters", "accuracyMeters", "recordedAt")
            SELECT ${id}::uuid, p.sequence,
                   ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326),
                   p.altitude, p.accuracy, p.recorded_at
            FROM unnest(
              ${a.points.map((p) => p.sequence)}::int[],
              ${a.points.map((p) => p.latitude)}::float8[],
              ${a.points.map((p) => p.longitude)}::float8[],
              ${a.points.map((p) => p.altitude ?? null)}::float8[],
              ${a.points.map((p) => p.accuracy ?? null)}::float8[],
              ${a.points.map((p) => p.recordedAt)}::timestamptz[]
            ) AS p(sequence, latitude, longitude, altitude, accuracy, recorded_at)`;
        }

        // Una línea necesita al menos 2 puntos; con menos, path queda en NULL (CA-6).
        if (a.points.length >= 2) {
          await tx.$executeRaw`
            UPDATE activities
            SET path = (
              SELECT ST_MakeLine(location ORDER BY sequence)
              FROM activity_points
              WHERE "activityId" = ${id}::uuid
            )
            WHERE id = ${id}::uuid`;
        }

        return id;
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  }
}

function resultadoExistente(
  existente: { id: string; userId: string },
  userId: string,
  actividad: ActivityUploadDto,
): SyncResult {
  // Ya guardada por este usuario: se conserva la versión del servidor (RN-2).
  if (existente.userId === userId) {
    return {
      clientGeneratedId: actividad.clientGeneratedId,
      status: 'ALREADY_EXISTS',
      id: existente.id,
    };
  }
  return {
    clientGeneratedId: actividad.clientGeneratedId,
    status: 'REJECTED',
    errors: [ID_AJENO],
  };
}

// Para que el cliente identifique una actividad rechazada aunque venga mal formada.
function idDe(item: unknown): string | null {
  if (typeof item !== 'object' || item === null) return null;
  const id = (item as { clientGeneratedId?: unknown }).clientGeneratedId;
  return typeof id === 'string' ? id : null;
}
