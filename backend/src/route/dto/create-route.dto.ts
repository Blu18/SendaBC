import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const MAX_NOMBRE = 40;
export const MAX_DESCRIPCION = 200;
export const MAX_ZONA = 40;

// El nombre cuenta sin los espacios del principio y del final (spec 007, RN-4).
export const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Descripción y zona son opcionales: una cadena vacía (o solo espacios) se guarda como null.
export const recortarOVaciar = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const recortado = value.trim();
  return recortado === '' ? null : recortado;
};

export const MENSAJES = {
  nombreObligatorio: 'El nombre es obligatorio',
  nombreTexto: 'El nombre debe ser texto',
  nombreLargo: `El nombre debe tener como máximo ${MAX_NOMBRE} caracteres`,
  descripcionTexto: 'La descripción debe ser texto',
  descripcionLarga: `La descripción debe tener como máximo ${MAX_DESCRIPCION} caracteres`,
  zonaTexto: 'La zona debe ser texto',
  zonaLarga: `La zona debe tener como máximo ${MAX_ZONA} caracteres`,
};

// Body de POST /routes (spec 007, CA-4, CA-5). Tipo, dificultad, distancia, elevación y
// recorrido salen de la actividad (RN-1, RN-6): el DTO no los declara y el whitelist los descarta.
export class CreateRouteDto {
  @IsUUID('all', {
    message: 'El identificador de la actividad debe ser un UUID',
  })
  activityId!: string;

  @Transform(recortar)
  @IsString({ message: MENSAJES.nombreTexto })
  @IsNotEmpty({ message: MENSAJES.nombreObligatorio })
  @MaxLength(MAX_NOMBRE, { message: MENSAJES.nombreLargo })
  name!: string;

  @Transform(recortarOVaciar)
  @IsOptional()
  @IsString({ message: MENSAJES.descripcionTexto })
  @MaxLength(MAX_DESCRIPCION, { message: MENSAJES.descripcionLarga })
  description?: string | null;

  // La propone la app (RN-7); si no se envía o llega vacía, la ruta queda sin zona.
  @Transform(recortarOVaciar)
  @IsOptional()
  @IsString({ message: MENSAJES.zonaTexto })
  @MaxLength(MAX_ZONA, { message: MENSAJES.zonaLarga })
  region?: string | null;
}
