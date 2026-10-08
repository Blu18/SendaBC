import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

async function erroresDe(body: object) {
  const errors = await validate(plainToInstance(CreateUserDto, body));
  return errors.map((e) => e.property);
}

const valido = {
  email: 'prueba@senda.bc',
  displayName: 'Prueba',
  password: '12345678',
};

describe('CreateUserDto (spec 001, CA-6)', () => {
  it('acepta un body válido', async () => {
    expect(await erroresDe(valido)).toEqual([]);
  });

  it('rechaza un correo inválido', async () => {
    expect(await erroresDe({ ...valido, email: 'abc' })).toEqual(['email']);
  });

  it('rechaza un nombre visible vacío', async () => {
    expect(await erroresDe({ ...valido, displayName: '' })).toEqual([
      'displayName',
    ]);
  });

  it('rechaza una contraseña de menos de 8 caracteres', async () => {
    expect(await erroresDe({ ...valido, password: '1234567' })).toEqual([
      'password',
    ]);
  });

  it('rechaza un body sin campos', async () => {
    expect((await erroresDe({})).sort()).toEqual([
      'displayName',
      'email',
      'password',
    ]);
  });

  it('normaliza el correo antes de validarlo (RN-1)', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...valido,
      email: '  Prueba@Senda.BC ',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.email).toBe('prueba@senda.bc');
  });

  it('rechaza un nombre visible de menos de 5 caracteres (RN-4)', async () => {
    expect(await erroresDe({ ...valido, displayName: 'Ana' })).toEqual([
      'displayName',
    ]);
  });

  it('no cuenta los espacios al inicio y al final del nombre (RN-4)', async () => {
    expect(await erroresDe({ ...valido, displayName: '  Ana  ' })).toEqual([
      'displayName',
    ]);
    const dto = plainToInstance(CreateUserDto, {
      ...valido,
      displayName: '  Ana Luz ',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.displayName).toBe('Ana Luz');
  });

  it('acepta un nombre visible de exactamente 5 caracteres', async () => {
    expect(await erroresDe({ ...valido, displayName: 'Diego' })).toEqual([]);
  });
});
