import { ActivityType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_RADIUS_KM = 25;
export const MAX_RADIUS_KM = 100;

// Como máximo 50 rutas (spec 006, CA-5). Inicio pide solo 5 (spec 013, CA-9, plan D5).
export const MAX_NEARBY_LIMIT = 50;
// Una sola regla, para que un valor como "cinco" dé un solo mensaje y no tres.
const LIMITES_VALIDOS = Array.from(
  { length: MAX_NEARBY_LIMIT },
  (_, i) => i + 1,
);

// Query de GET /routes/nearby (spec 006). Los parámetros llegan como texto: @Type los
// convierte a número antes de validar.
export class NearbyQueryDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'La latitud debe ser un número' })
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90' })
  lat!: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'La longitud debe ser un número' })
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180' })
  lng!: number;

  // 25 km si no se envía (CA-11); nunca más de 100 km (RN-5).
  @Type(() => Number)
  @IsNumber({}, { message: 'El radio debe ser un número' })
  @Min(1, { message: `El radio debe estar entre 1 y ${MAX_RADIUS_KM} km` })
  @Max(MAX_RADIUS_KM, {
    message: `El radio debe estar entre 1 y ${MAX_RADIUS_KM} km`,
  })
  radiusKm: number = DEFAULT_RADIUS_KM;

  @IsOptional()
  @IsEnum(ActivityType, {
    message: 'El tipo debe ser HIKING, TRAIL_RUNNING o CYCLING',
  })
  type?: ActivityType;

  @IsOptional()
  @Type(() => Number)
  @IsIn(LIMITES_VALIDOS, {
    message: `El límite debe ser un entero entre 1 y ${MAX_NEARBY_LIMIT}`,
  })
  limit?: number;
}
