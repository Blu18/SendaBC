import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

// Body de POST /user (spec 001, RN-3): solo email, displayName y password.
export class CreateUserDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  email!: string;

  @IsString({ message: 'El nombre visible debe ser texto' })
  @IsNotEmpty({ message: 'El nombre visible es obligatorio' })
  displayName!: string;

  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;
}
