import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  MAX_NOMBRE,
  MENSAJES,
  recortar,
} from '../../route/dto/create-route.dto.js';

// Body de POST /emergency-contacts (spec 008, CA-1, CA-2). El nombre es el que el usuario le da
// ("Mamá"): obligatorio sin los espacios de los extremos y de 40 caracteres como máximo, como el
// nombre de una ruta (RN-1). No se pide teléfono: el contacto se vincula al aceptar la invitación (RN-2).
export class CreateEmergencyContactDto {
  @Transform(recortar)
  @IsString({ message: MENSAJES.nombreTexto })
  @IsNotEmpty({ message: MENSAJES.nombreObligatorio })
  @MaxLength(MAX_NOMBRE, { message: MENSAJES.nombreLargo })
  name!: string;
}
