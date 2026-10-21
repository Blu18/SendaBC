import { BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '../../validation/validation.pipe.js';
import { UpdateRouteDto } from './update-route.dto.js';

const pipe = new ValidationPipe();
const meta = { type: 'body' as const, metatype: UpdateRouteDto };

async function erroresDe(body: Record<string, unknown>) {
  const error = await pipe.transform(body, meta).catch((e: unknown) => e);
  if (!(error instanceof BadRequestException)) return null;
  return (error.getResponse() as { errors: Record<string, string[]> }).errors;
}

describe('UpdateRouteDto (spec 007, CA-22 a CA-24)', () => {
  it('todo es opcional: un body vacío no cambia nada', async () => {
    expect(await pipe.transform({}, meta)).toEqual({});
  });

  it('acepta nombre, descripción y zona, recortados', async () => {
    expect(
      await pipe.transform(
        { name: ' Nuevo nombre ', description: 'Otra', region: ' Tecate ' },
        meta,
      ),
    ).toEqual({ name: 'Nuevo nombre', description: 'Otra', region: 'Tecate' });
  });

  it('null o vacía borran la descripción y la zona', async () => {
    expect(
      await pipe.transform({ description: null, region: '' }, meta),
    ).toEqual({ description: null, region: null });
  });

  it('mismos límites que al publicar (CA-5): 40/41, 200/201', async () => {
    expect(
      await erroresDe({
        name: 'n'.repeat(40),
        description: 'd'.repeat(200),
        region: 'z'.repeat(40),
      }),
    ).toBeNull();
    expect(
      await erroresDe({
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

  it('el nombre no se puede vaciar ni poner en null', async () => {
    expect(await erroresDe({ name: '   ' })).toEqual({
      name: ['El nombre es obligatorio'],
    });
    expect((await erroresDe({ name: null }))?.name).toContain(
      'El nombre debe ser texto',
    );
  });

  it('acepta archivar y volver a publicar', async () => {
    for (const status of ['ARCHIVED', 'PUBLISHED']) {
      expect(await erroresDe({ status })).toBeNull();
    }
  });

  it('rechaza cualquier otro estado, incluido DELETED', async () => {
    for (const status of ['DELETED', 'DRAFT', 'archived']) {
      expect(await erroresDe({ status })).toEqual({
        status: ['El estado debe ser PUBLISHED o ARCHIVED'],
      });
    }
  });

  it('descarta tipo, dificultad, distancia, elevación y recorrido (RN-1)', async () => {
    expect(
      await pipe.transform(
        {
          name: 'Ruta',
          type: 'CYCLING',
          difficulty: 'EASY',
          distanceMeters: 1,
          elevationGainMeters: 1,
          path: [[-116.6, 31.8]],
          sourceActivityId: '0b6f6c2e-6f3a-4d1b-9a4e-2f7c8d9e0a1b',
        },
        meta,
      ),
    ).toEqual({ name: 'Ruta' });
  });
});
