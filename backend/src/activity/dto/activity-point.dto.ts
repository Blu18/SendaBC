import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

// Un punto GPS de una actividad subida (spec 005, RN-5). Unidades: grados y metros.
export class ActivityPointDto {
  @IsInt({ message: 'La secuencia debe ser un número entero' })
  @Min(1, { message: 'La secuencia debe empezar en 1' })
  sequence!: number;

  @IsNumber({}, { message: 'La latitud debe ser un número' })
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90' })
  latitude!: number;

  @IsNumber({}, { message: 'La longitud debe ser un número' })
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180' })
  longitude!: number;

  // El GPS puede no entregar altitud ni precisión: null se acepta.
  @IsOptional()
  @IsNumber({}, { message: 'La altitud debe ser un número' })
  altitude!: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'La precisión debe ser un número' })
  @Min(0, { message: 'La precisión no puede ser negativa' })
  accuracy!: number | null;

  @IsISO8601(
    { strict: true },
    { message: 'La hora del punto debe ser una fecha ISO 8601' },
  )
  recordedAt!: string;
}
