import {
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const MOTIVOS_TELEFONO = ['INACTIVITY', 'SOS'] as const;

// Body de POST /safety/sessions/:clientId/alerts (spec 008, CA-14, CA-24). La crea el teléfono
// sin conexión y la reintenta la bandeja: clientAlertId la hace idempotente (constitución 2.2).
// RETURN_TIME no se acepta: esas alertas las crea solo el servidor (CA-18).
export class CreateAlertDto {
  @IsUUID('4', { message: 'El identificador de la alerta debe ser un UUID v4' })
  clientAlertId!: string;

  @IsIn(MOTIVOS_TELEFONO, { message: 'El motivo debe ser INACTIVITY o SOS' })
  reason!: (typeof MOTIVOS_TELEFONO)[number];

  @IsISO8601(
    { strict: true },
    { message: 'La hora de la alerta debe ser una fecha ISO 8601' },
  )
  triggeredAt!: string;

  // Última ubicación conocida y su hora (RN-5). Puede no haber ninguna si se pide ayuda antes
  // de que el GPS dé la primera posición: entonces van las tres en null.
  @IsOptional()
  @IsNumber({}, { message: 'La latitud debe ser un número' })
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90' })
  latitude?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'La longitud debe ser un número' })
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180' })
  longitude?: number | null;

  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: 'La hora de la ubicación debe ser una fecha ISO 8601' },
  )
  locationAt?: string | null;
}
