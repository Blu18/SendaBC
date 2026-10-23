import { BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '../../validation/validation.pipe.js';
import { CreateAlertDto } from './create-alert.dto.js';

const pipe = new ValidationPipe();

async function erroresDe(body: unknown) {
  const error = await pipe
    .transform(body, { type: 'body', metatype: CreateAlertDto })
    .catch((e: unknown) => e);
  if (!(error instanceof BadRequestException)) return null;
  return (error.getResponse() as { errors: Record<string, string[]> }).errors;
}

const valido = {
  clientAlertId: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
  reason: 'INACTIVITY',
  triggeredAt: '2026-10-22T16:12:00.000Z',
  latitude: 32.05,
  longitude: -115.46,
  locationAt: '2026-10-22T16:10:00.000Z',
};

describe('CreateAlertDto (spec 008, CA-14, CA-24)', () => {
  it('acepta una alerta por inactividad o SOS, con o sin ubicación', async () => {
    expect(await erroresDe(valido)).toBeNull();
    expect(await erroresDe({ ...valido, reason: 'SOS' })).toBeNull();
    expect(
      await erroresDe({
        ...valido,
        latitude: null,
        longitude: null,
        locationAt: null,
      }),
    ).toBeNull();
  });

  it('no acepta RETURN_TIME: esas las crea solo el servidor (CA-18)', async () => {
    expect(await erroresDe({ ...valido, reason: 'RETURN_TIME' })).toEqual({
      reason: ['El motivo debe ser INACTIVITY o SOS'],
    });
  });

  it('exige un UUID v4 y fechas ISO 8601, con mensajes en español', async () => {
    expect(
      await erroresDe({
        ...valido,
        clientAlertId: 'a-1',
        triggeredAt: 'ahora',
        latitude: 100,
        locationAt: 'antes',
      }),
    ).toEqual({
      clientAlertId: ['El identificador de la alerta debe ser un UUID v4'],
      triggeredAt: ['La hora de la alerta debe ser una fecha ISO 8601'],
      latitude: ['La latitud debe estar entre -90 y 90'],
      locationAt: ['La hora de la ubicación debe ser una fecha ISO 8601'],
    });
  });
});
