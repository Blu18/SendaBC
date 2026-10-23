import { BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '../../validation/validation.pipe.js';
import { CreateEmergencyContactDto } from './create-emergency-contact.dto.js';
import { UpdateEmergencyContactDto } from './update-emergency-contact.dto.js';

const pipe = new ValidationPipe();

async function erroresDe(
  body: Record<string, unknown>,
  metatype: new () => object = CreateEmergencyContactDto,
) {
  const error = await pipe
    .transform(body, { type: 'body', metatype })
    .catch((e: unknown) => e);
  if (!(error instanceof BadRequestException)) return null;
  return (error.getResponse() as { errors: Record<string, string[]> }).errors;
}

describe('CreateEmergencyContactDto (spec 008, CA-2, RN-1)', () => {
  it('acepta el nombre recortado y descarta lo que no declara (RN-2: sin teléfono)', async () => {
    expect(
      await pipe.transform(
        { name: '  Mamá  ', phone: '6461234567' },
        { type: 'body', metatype: CreateEmergencyContactDto },
      ),
    ).toEqual({ name: 'Mamá' });
  });

  it('el nombre es obligatorio sin contar los espacios', async () => {
    for (const name of ['', '   ']) {
      expect(await erroresDe({ name })).toEqual({
        name: ['El nombre es obligatorio'],
      });
    }
    expect((await erroresDe({}))?.name).toContain('El nombre es obligatorio');
  });

  it('el nombre tiene como máximo 40 caracteres sin los extremos: 40/41', async () => {
    expect(await erroresDe({ name: ` ${'n'.repeat(40)} ` })).toBeNull();
    expect(await erroresDe({ name: 'n'.repeat(41) })).toEqual({
      name: ['El nombre debe tener como máximo 40 caracteres'],
    });
  });

  it('el nombre debe ser texto', async () => {
    expect((await erroresDe({ name: 12 }))?.name).toContain(
      'El nombre debe ser texto',
    );
  });

  it('al editar se aplican las mismas reglas (CA-3)', async () => {
    expect(await erroresDe({ name: '' }, UpdateEmergencyContactDto)).toEqual({
      name: ['El nombre es obligatorio'],
    });
    expect(
      await erroresDe({ name: 'n'.repeat(41) }, UpdateEmergencyContactDto),
    ).toEqual({ name: ['El nombre debe tener como máximo 40 caracteres'] });
  });
});
