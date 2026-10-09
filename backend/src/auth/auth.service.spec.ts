import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { hash } from 'bcrypt';
import { AuthService } from './auth.service.js';
import type { UserService } from '../user/user.service.js';

const password = 'contrasena-correcta';

function serviceCon(user: object | null) {
  const findByEmail = vi.fn().mockResolvedValue(user);
  const service = new AuthService(
    { findByEmail } as unknown as UserService,
    {} as JwtService,
  );
  return { service, findByEmail };
}

async function errorDe(promesa: Promise<unknown>) {
  return promesa.then(
    () => null,
    (e: unknown) => e,
  );
}

describe('AuthService.validateUser (spec 002)', () => {
  // Mismo formato que guarda el trigger de Supabase ($2a$/$2b$); costo bajo para que sea rápido.
  let passwordHash: string;
  beforeAll(async () => {
    passwordHash = await hash(password, 4);
  });

  it('responde 401 si el correo no existe (CA-2)', async () => {
    const { service } = serviceCon(null);

    const error = await errorDe(
      service.validateUser('nadie@senda.bc', password),
    );

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).message).toBe(
      'Credenciales invalidas',
    );
  });

  it('responde 401 con el mismo mensaje si la contraseña es incorrecta (CA-2)', async () => {
    const { service } = serviceCon({ id: 'u1', passwordHash });

    const error = await errorDe(
      service.validateUser('ana@senda.bc', 'otra-contrasena'),
    );

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).message).toBe(
      'Credenciales invalidas',
    );
  });

  it('devuelve solo { id } si las credenciales son correctas (CA-1)', async () => {
    const { service, findByEmail } = serviceCon({
      id: 'u1',
      email: 'ana@senda.bc',
      passwordHash,
    });

    await expect(
      service.validateUser('ana@senda.bc', password),
    ).resolves.toEqual({
      id: 'u1',
    });
    expect(findByEmail).toHaveBeenCalledWith('ana@senda.bc');
  });
});
