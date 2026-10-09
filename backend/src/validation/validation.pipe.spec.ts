import { BadRequestException } from '@nestjs/common';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import { ValidationPipe } from './validation.pipe.js';

const pipe = new ValidationPipe();
const meta = { type: 'body' as const, metatype: CreateUserDto };

describe('ValidationPipe (spec 001, CA-6)', () => {
  it('responde 400 con los mensajes en español por campo', async () => {
    const error = await pipe
      .transform({ email: 'abc', displayName: '', password: '123' }, meta)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Datos inválidos',
      errors: {
        email: ['El correo no es válido'],
        displayName: ['El nombre visible debe tener al menos 5 caracteres'],
        password: ['La contraseña debe tener al menos 8 caracteres'],
      },
    });
  });

  it('descarta los campos que el DTO no declara (whitelist) y normaliza', async () => {
    const result = await pipe.transform(
      {
        email: ' Ana@Senda.BC',
        displayName: 'Ana Luz',
        password: '12345678',
        avatarUrl: 'x',
        passwordHash: 'y',
      },
      meta,
    );

    expect({ ...result }).toEqual({
      email: 'ana@senda.bc',
      displayName: 'Ana Luz',
      password: '12345678',
    });
  });

  it('no toca valores con tipos primitivos', async () => {
    expect(
      await pipe.transform('abc', { type: 'param', metatype: String }),
    ).toBe('abc');
  });
});
