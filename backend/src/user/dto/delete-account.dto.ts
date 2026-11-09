import { IsNotEmpty, IsString } from 'class-validator';

// Body de DELETE /user/me (spec 011, CA-46): la contraseña actual confirma el borrado.
export class DeleteAccountDto {
  @IsString({ message: 'La contraseña debe ser texto' })
  @IsNotEmpty({ message: 'Escribe tu contraseña' })
  password!: string;
}
