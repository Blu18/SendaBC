import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ActivityType, ElevationSource } from '@prisma/client';
import { ActivityPointDto } from './activity-point.dto.js';

// Una actividad terminada que sube el teléfono (spec 005, CA-5, RN-5). No declara userId:
// el dueño sale del token y un userId en el body se descarta (CA-18).
export class ActivityUploadDto {
  @IsUUID('4', {
    message: 'El identificador de la actividad debe ser un UUID v4',
  })
  clientGeneratedId!: string;

  @IsEnum(ActivityType, { message: 'El tipo de actividad no es válido' })
  type!: ActivityType;

  @IsISO8601(
    { strict: true },
    { message: 'El inicio debe ser una fecha ISO 8601' },
  )
  startedAt!: string;

  @IsISO8601(
    { strict: true },
    { message: 'El fin debe ser una fecha ISO 8601' },
  )
  endedAt!: string;

  // Métricas calculadas en el teléfono (spec 004); el servidor no las recalcula.
  @IsNumber({}, { message: 'La distancia debe ser un número' })
  @Min(0, { message: 'La distancia no puede ser negativa' })
  distanceMeters!: number;

  @IsInt({ message: 'La duración debe ser un número entero de segundos' })
  @Min(0, { message: 'La duración no puede ser negativa' })
  durationSeconds!: number;

  @IsNumber({}, { message: 'La elevación ganada debe ser un número' })
  @Min(0, { message: 'La elevación ganada no puede ser negativa' })
  elevationGainMeters!: number;

  @IsNumber({}, { message: 'La elevación perdida debe ser un número' })
  @Min(0, { message: 'La elevación perdida no puede ser negativa' })
  elevationLossMeters!: number;

  @IsEnum(ElevationSource, {
    message: 'La fuente de la elevación no es válida',
  })
  elevationSource!: ElevationSource;

  // Puede estar vacío: una actividad sin puntos válidos también se sube (spec 004, CA-17).
  @IsArray({ message: 'Los puntos deben ser una lista' })
  @ValidateNested({ each: true, message: 'Cada punto debe ser un objeto' })
  @Type(() => ActivityPointDto)
  points!: ActivityPointDto[];
}
