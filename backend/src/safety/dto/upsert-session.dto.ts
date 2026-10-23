import { ActivityType } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

// Body de PUT /safety/sessions/:clientId (spec 008, CA-19, CA-23). El id de la actividad va en
// la URL; el dueño sale del token (constitución 3.3).
export class UpsertSessionDto {
  @IsEnum(ActivityType, { message: 'El tipo de actividad no es válido' })
  type!: ActivityType;

  @IsISO8601(
    { strict: true },
    { message: 'El inicio debe ser una fecha ISO 8601' },
  )
  startedAt!: string;

  // Opcional (RN-10): null o ausente quita la hora de regreso. Que sea posterior al inicio lo
  // comprueba el servicio, que conoce el inicio guardado.
  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: 'La hora de regreso debe ser una fecha ISO 8601' },
  )
  returnBy?: string | null;
}
