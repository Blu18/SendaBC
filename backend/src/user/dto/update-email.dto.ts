import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { normalizarEmail } from '../normalizar-email.js';

// Body de PATCH /user/me/email (spec 011, CA-43): el correo nuevo y la contraseña actual.
export class UpdateEmailDto {
  // Igual que en el registro (spec 001, RN-1).
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizarEmail(value) : value,
  )
  @IsEmail({}, { message: 'El correo no es válido' })
  email!: string;

  @IsString({ message: 'La contraseña debe ser texto' })
  @IsNotEmpty({ message: 'Escribe tu contraseña' })
  password!: string;
}
