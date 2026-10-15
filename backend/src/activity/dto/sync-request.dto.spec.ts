import { BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '../../validation/validation.pipe.js';
import { SyncRequestDto } from './sync-request.dto.js';

const pipe = new ValidationPipe();
const meta = { type: 'body' as const, metatype: SyncRequestDto };

async function erroresDe(body: unknown) {
  const error = await pipe.transform(body, meta).catch((e: unknown) => e);
  if (!(error instanceof BadRequestException)) return null;
  return (error.getResponse() as { errors: Record<string, string[]> }).errors;
}

describe('SyncRequestDto (spec 005, D1)', () => {
  it('acepta de 1 a 5 actividades sin validarlas por dentro (CA-11)', async () => {
    const body = { activities: [{ cualquier: 'cosa' }, { type: 'NADO' }] };
    const result = await pipe.transform(body, meta);
    // Las actividades llegan intactas: cada una se valida después por separado.
    expect(result.activities).toEqual(body.activities);
  });

  it('rechaza un lote vacío', async () => {
    expect(await erroresDe({ activities: [] })).toEqual({
      activities: ['Envía al menos una actividad'],
    });
  });

  it('rechaza más de 5 actividades', async () => {
    const activities = Array.from({ length: 6 }, () => ({}));
    expect(await erroresDe({ activities })).toEqual({
      activities: ['Envía como máximo 5 actividades por lote'],
    });
  });

  it('rechaza un body sin la lista', async () => {
    const errores = await erroresDe({});
    expect(errores?.activities).toContain('activities debe ser una lista');
  });

  it('rechaza elementos que no son objetos', async () => {
    expect(await erroresDe({ activities: [1, 'x'] })).toEqual({
      activities: ['Cada actividad debe ser un objeto'],
    });
  });
});
