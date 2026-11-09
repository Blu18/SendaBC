import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { AVATAR_IDS } from '../avatars.js';

// Body de PATCH /user/me (spec 011, CA-41 y CA-42). Los dos campos son opcionales.
export class UpdateProfileDto {
  // Misma regla que el registro (spec 001, RN-4). Si viene, no puede ser null.
  @ValidateIf((o: UpdateProfileDto) => o.displayName !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre visible debe ser texto' })
  @MinLength(5, {
    message: 'El nombre visible debe tener al menos 5 caracteres',
  })
  displayName?: string;

  // null quita el avatar y vuelve el ícono por defecto (RN-15).
  @IsOptional()
  @IsIn(AVATAR_IDS, { message: 'El avatar no es válido' })
  avatarId?: string | null;
}
