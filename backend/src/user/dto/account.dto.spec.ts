import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateEmailDto } from './update-email.dto.js';
import { UpdatePasswordDto } from './update-password.dto.js';
import { DeleteAccountDto } from './delete-account.dto.js';

async function validar<T extends object>(clase: new () => T, body: object) {
  const dto = plainToInstance(clase, body);
  const errors = await validate(dto, { whitelist: true });
  return { dto, campos: errors.map((e) => e.property).sort() };
}

describe('UpdateEmailDto (spec 011, CA-43)', () => {
  it('acepta un correo válido y lo normaliza (spec 001, RN-1)', async () => {
    const { dto, campos } = await validar(UpdateEmailDto, {
      email: ' Ana@Senda.BC ',
      password: 'x',
    });
    expect(campos).toEqual([]);
    expect(dto.email).toBe('ana@senda.bc');
  });

  it('rechaza un correo inválido', async () => {
    expect((await validar(UpdateEmailDto, { email: 'abc', password: 'x' })).campos).toEqual([
      'email',
    ]);
  });

  it('pide la contraseña', async () => {
    expect(
      (await validar(UpdateEmailDto, { email: 'ana@senda.bc', password: '' })).campos,
    ).toEqual(['password']);
    expect((await validar(UpdateEmailDto, { email: 'ana@senda.bc' })).campos).toEqual([
      'password',
    ]);
  });
});

describe('UpdatePasswordDto (spec 011, CA-44)', () => {
  it('acepta la actual y una nueva de 8 caracteres', async () => {
    expect(
      (await validar(UpdatePasswordDto, { currentPassword: 'x', newPassword: '12345678' }))
        .campos,
    ).toEqual([]);
  });

  it('rechaza una nueva de menos de 8 caracteres', async () => {
    expect(
      (await validar(UpdatePasswordDto, { currentPassword: 'x', newPassword: '1234567' }))
        .campos,
    ).toEqual(['newPassword']);
  });

  it('pide la contraseña actual', async () => {
    expect(
      (await validar(UpdatePasswordDto, { currentPassword: '', newPassword: '12345678' }))
        .campos,
    ).toEqual(['currentPassword']);
  });
});

describe('DeleteAccountDto (spec 011, CA-46)', () => {
  it('pide la contraseña', async () => {
    expect((await validar(DeleteAccountDto, { password: 'x' })).campos).toEqual([]);
    expect((await validar(DeleteAccountDto, { password: '' })).campos).toEqual(['password']);
    expect((await validar(DeleteAccountDto, {})).campos).toEqual(['password']);
  });
});
