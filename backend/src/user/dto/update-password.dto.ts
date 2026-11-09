import { IsNotEmpty, IsString, MinLength } from 'class-validator';

// Body de PATCH /user/me/password (spec 011, CA-44).
export class UpdatePasswordDto {
  @IsString({ message: 'La contraseña debe ser texto' })
  @IsNotEmpty({ message: 'Escribe tu contraseña actual' })
  currentPassword!: string;

  // Misma regla que el registro (spec 001).
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  newPassword!: string;
}
