import { IsISO8601, IsNumber, Max, Min } from 'class-validator';

// Body de POST /safety/sessions/:clientId/locations (spec 008, CA-20). Grados WGS84.
export class SessionLocationDto {
  @IsNumber({}, { message: 'La latitud debe ser un número' })
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90' })
  latitude!: number;

  @IsNumber({}, { message: 'La longitud debe ser un número' })
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180' })
  longitude!: number;

  @IsISO8601(
    { strict: true },
    { message: 'La hora de la ubicación debe ser una fecha ISO 8601' },
  )
  recordedAt!: string;
}
