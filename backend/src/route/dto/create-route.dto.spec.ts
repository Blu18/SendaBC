import { BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '../../validation/validation.pipe.js';
import { CreateRouteDto } from './create-route.dto.js';

const pipe = new ValidationPipe();
const meta = { type: 'body' as const, metatype: CreateRouteDto };
const ACTIVIDAD = '0b6f6c2e-6f3a-4d1b-9a4e-2f7c8d9e0a1b';

async function erroresDe(body: Record<string, unknown>) {
  const error = await pipe.transform(body, meta).catch((e: unknown) => e);
  if (!(error instanceof BadRequestException)) return null;
  return (error.getResponse() as { errors: Record<string, string[]> }).errors;
}

describe('CreateRouteDto (spec 007, CA-5)', () => {
  it('acepta un body válido y recorta los espacios', async () => {
    const result = await pipe.transform(
      {
        activityId: ACTIVIDAD,
        name: '  Cañón de Doña Petra  ',
        description: ' Sube por el arroyo. ',
        region: ' Ensenada ',
      },
      meta,
    );
    expect(result).toEqual({
      activityId: ACTIVIDAD,
      name: 'Cañón de Doña Petra',
      description: 'Sube por el arroyo.',
      region: 'Ensenada',
    });
  });

  it('descripción y zona son opcionales; vacías quedan en null (RN-7)', async () => {
    expect(
      await pipe.transform({ activityId: ACTIVIDAD, name: 'Ruta' }, meta),
    ).toEqual({ activityId: ACTIVIDAD, name: 'Ruta' });

    const result = await pipe.transform(
      { activityId: ACTIVIDAD, name: 'Ruta', description: '   ', region: '' },
      meta,
    );
    expect(result.description).toBeNull();
    expect(result.region).toBeNull();
  });

  it('acepta los bordes: nombre de 40, descripción de 200 y zona de 40', async () => {
    expect(
      await erroresDe({
        activityId: ACTIVIDAD,
        name: 'n'.repeat(40),
        description: 'd'.repeat(200),
        region: 'z'.repeat(40),
      }),
    ).toBeNull();
  });

  it('el límite del nombre no cuenta los espacios de los extremos', async () => {
    expect(
      await erroresDe({ activityId: ACTIVIDAD, name: `  ${'n'.repeat(40)}  ` }),
    ).toBeNull();
  });

  it('rechaza nombre de 41, descripción de 201 y zona de 41', async () => {
    expect(
      await erroresDe({
        activityId: ACTIVIDAD,
        name: 'n'.repeat(41),
        description: 'd'.repeat(201),
        region: 'z'.repeat(41),
      }),
    ).toEqual({
      name: ['El nombre debe tener como máximo 40 caracteres'],
      description: ['La descripción debe tener como máximo 200 caracteres'],
      region: ['La zona debe tener como máximo 40 caracteres'],
    });
  });

  it('rechaza un nombre vacío o solo con espacios (RN-4)', async () => {
    for (const name of ['', '    ']) {
      expect(await erroresDe({ activityId: ACTIVIDAD, name })).toEqual({
        name: ['El nombre es obligatorio'],
      });
    }
  });

  it('rechaza un body sin nombre ni actividad', async () => {
    const errores = await erroresDe({});
    expect(errores?.name).toContain('El nombre es obligatorio');
    expect(errores?.activityId).toEqual([
      'El identificador de la actividad debe ser un UUID',
    ]);
  });

  it('rechaza un activityId que no es UUID', async () => {
    expect(await erroresDe({ activityId: '42', name: 'Ruta' })).toEqual({
      activityId: ['El identificador de la actividad debe ser un UUID'],
    });
  });

  it('descarta los datos que salen de la actividad (RN-1, RN-6)', async () => {
    const result = await pipe.transform(
      {
        activityId: ACTIVIDAD,
        name: 'Ruta',
        type: 'CYCLING',
        difficulty: 'EASY',
        distanceMeters: 99_000,
        elevationGainMeters: 1,
        path: [[-116.6, 31.8]],
        status: 'PUBLISHED',
        createdByUserId: '11111111-1111-4111-8111-111111111111',
      },
      meta,
    );
    expect(result).toEqual({ activityId: ACTIVIDAD, name: 'Ruta' });
  });
});
