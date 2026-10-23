import { BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '../../validation/validation.pipe.js';
import { FinishSessionDto } from './finish-session.dto.js';
import { SessionLocationDto } from './session-location.dto.js';
import { UpsertSessionDto } from './upsert-session.dto.js';

const pipe = new ValidationPipe();

async function erroresDe(metatype: new () => object, body: unknown) {
  const error = await pipe
    .transform(body, { type: 'body', metatype })
    .catch((e: unknown) => e);
  if (!(error instanceof BadRequestException)) return null;
  return (error.getResponse() as { errors: Record<string, string[]> }).errors;
}

describe('UpsertSessionDto (spec 008, T6)', () => {
  const valido = {
    type: 'HIKING',
    startedAt: '2026-10-22T15:00:00.000Z',
    returnBy: '2026-10-22T18:00:00.000Z',
  };

  it('acepta la sesión con o sin hora de regreso (RN-10)', async () => {
    expect(await erroresDe(UpsertSessionDto, valido)).toBeNull();
    expect(
      await erroresDe(UpsertSessionDto, { ...valido, returnBy: null }),
    ).toBeNull();
    const { returnBy: _returnBy, ...sinRegreso } = valido;
    expect(await erroresDe(UpsertSessionDto, sinRegreso)).toBeNull();
  });

  it('descarta un userId en el body (constitución 3.3)', async () => {
    expect(
      await pipe.transform(
        { ...valido, userId: 'otro' },
        { type: 'body', metatype: UpsertSessionDto },
      ),
    ).not.toHaveProperty('userId');
  });

  it('rechaza un tipo desconocido y fechas que no son ISO 8601, en español', async () => {
    expect(
      await erroresDe(UpsertSessionDto, {
        type: 'SWIMMING',
        startedAt: 'ayer',
        returnBy: '22/10/2026 18:00',
      }),
    ).toEqual({
      type: ['El tipo de actividad no es válido'],
      startedAt: ['El inicio debe ser una fecha ISO 8601'],
      returnBy: ['La hora de regreso debe ser una fecha ISO 8601'],
    });
  });
});

describe('SessionLocationDto (spec 008, CA-20)', () => {
  it('acepta lat, lng y hora válidas', async () => {
    expect(
      await erroresDe(SessionLocationDto, {
        latitude: 32.05,
        longitude: -115.46,
        recordedAt: '2026-10-22T16:00:00Z',
      }),
    ).toBeNull();
  });

  it('rechaza coordenadas fuera de rango y la hora inválida', async () => {
    expect(
      await erroresDe(SessionLocationDto, {
        latitude: 91,
        longitude: -181,
        recordedAt: 'ahora',
      }),
    ).toEqual({
      latitude: ['La latitud debe estar entre -90 y 90'],
      longitude: ['La longitud debe estar entre -180 y 180'],
      recordedAt: ['La hora de la ubicación debe ser una fecha ISO 8601'],
    });
  });
});

describe('FinishSessionDto (spec 008, T6)', () => {
  it('exige el fin como fecha ISO 8601', async () => {
    expect(
      await erroresDe(FinishSessionDto, { endedAt: '2026-10-22T18:00:00Z' }),
    ).toBeNull();
    expect(await erroresDe(FinishSessionDto, {})).toEqual({
      endedAt: ['El fin debe ser una fecha ISO 8601'],
    });
  });
});
