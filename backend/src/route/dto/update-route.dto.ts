import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  MAX_DESCRIPCION,
  MAX_NOMBRE,
  MAX_ZONA,
  MENSAJES,
  recortar,
  recortarOVaciar,
} from './create-route.dto.js';

export const ESTADOS_EDITABLES = ['PUBLISHED', 'ARCHIVED'] as const;

// Body de PATCH /routes/:id (spec 007, CA-22 a CA-24). Todo es opcional: lo que no se envía
// no cambia. Mismas validaciones que al publicar (CA-5); tipo, dificultad, distancia,
// elevación y recorrido no se pueden editar (RN-1) y el whitelist los descarta.
export class UpdateRouteDto {
  // Opcional, pero si se envía no puede quedar vacío ni ser null.
  @ValidateIf((dto: UpdateRouteDto) => dto.name !== undefined)
  @Transform(recortar)
  @IsString({ message: MENSAJES.nombreTexto })
  @IsNotEmpty({ message: MENSAJES.nombreObligatorio })
  @MaxLength(MAX_NOMBRE, { message: MENSAJES.nombreLargo })
  name?: string;

  // null o vacía la borran.
  @Transform(recortarOVaciar)
  @IsOptional()
  @IsString({ message: MENSAJES.descripcionTexto })
  @MaxLength(MAX_DESCRIPCION, { message: MENSAJES.descripcionLarga })
  description?: string | null;

  // null o vacía la borran (plan, RN-7).
  @Transform(recortarOVaciar)
  @IsOptional()
  @IsString({ message: MENSAJES.zonaTexto })
  @MaxLength(MAX_ZONA, { message: MENSAJES.zonaLarga })
  region?: string | null;

  // Archivar y volver a publicar (CA-23, CA-24). Borrar es DELETE, no un estado editable.
  @IsOptional()
  @IsIn(ESTADOS_EDITABLES, {
    message: 'El estado debe ser PUBLISHED o ARCHIVED',
  })
  status?: (typeof ESTADOS_EDITABLES)[number];
}
