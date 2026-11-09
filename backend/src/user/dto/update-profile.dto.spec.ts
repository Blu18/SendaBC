import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto.js';

async function validar(body: object) {
  const dto = plainToInstance(UpdateProfileDto, body);
  const errors = await validate(dto, { whitelist: true });
  return { dto, campos: errors.map((e) => e.property).sort() };
}

describe('UpdateProfileDto (spec 011, CA-41, CA-42)', () => {
  it('acepta un body vacío', async () => {
    expect((await validar({})).campos).toEqual([]);
  });

  it('acepta un nombre válido y lo recorta (spec 001, RN-4)', async () => {
    const { dto, campos } = await validar({ displayName: '  Ana Luz  ' });
    expect(campos).toEqual([]);
    expect(dto.displayName).toBe('Ana Luz');
  });

  it('rechaza un nombre de menos de 5 caracteres sin contar espacios', async () => {
    expect((await validar({ displayName: '  Ana  ' })).campos).toEqual(['displayName']);
  });

  it('rechaza un nombre null o que no es texto', async () => {
    expect((await validar({ displayName: null })).campos).toEqual(['displayName']);
    expect((await validar({ displayName: 12345 })).campos).toEqual(['displayName']);
  });

  it('acepta un avatar predefinido (RN-15)', async () => {
    expect((await validar({ avatarId: 'cactus' })).campos).toEqual([]);
  });

  it('acepta null para quitar el avatar', async () => {
    const { dto, campos } = await validar({ avatarId: null });
    expect(campos).toEqual([]);
    expect(dto.avatarId).toBeNull();
  });

  it('rechaza un avatar fuera de la lista, como una URL', async () => {
    expect((await validar({ avatarId: 'https://x.y/z.png' })).campos).toEqual([
      'avatarId',
    ]);
  });
});
