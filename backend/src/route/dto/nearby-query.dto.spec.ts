import { BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '../../validation/validation.pipe.js';
import { NearbyQueryDto } from './nearby-query.dto.js';

const pipe = new ValidationPipe();
const meta = { type: 'query' as const, metatype: NearbyQueryDto };

async function erroresDe(query: Record<string, string>) {
  const error = await pipe.transform(query, meta).catch((e: unknown) => e);
  if (!(error instanceof BadRequestException)) return null;
  return (error.getResponse() as { errors: Record<string, string[]> }).errors;
}

describe('NearbyQueryDto (spec 006)', () => {
  it('convierte los parámetros de texto a número y acepta el tipo', async () => {
    const result = await pipe.transform(
      { lat: '31.8667', lng: '-116.5964', radiusKm: '50', type: 'CYCLING' },
      meta,
    );
    expect(result).toEqual({
      lat: 31.8667,
      lng: -116.5964,
      radiusKm: 50,
      type: 'CYCLING',
    });
  });

  it('usa 25 km si no se envía el radio y el tipo es opcional (CA-11)', async () => {
    const result = await pipe.transform({ lat: '32.5', lng: '-116.6' }, meta);
    expect(result.radiusKm).toBe(25);
    expect(result.type).toBeUndefined();
  });

  it('acepta los extremos 1 y 100 km', async () => {
    for (const radiusKm of ['1', '100']) {
      expect(await erroresDe({ lat: '32', lng: '-116', radiusKm })).toBeNull();
    }
  });

  it('rechaza un radio de 0 o de 101 km (RN-5)', async () => {
    for (const radiusKm of ['0', '101']) {
      expect(await erroresDe({ lat: '32', lng: '-116', radiusKm })).toEqual({
        radiusKm: ['El radio debe estar entre 1 y 100 km'],
      });
    }
  });

  it('rechaza una latitud de 91 y una longitud fuera de rango', async () => {
    expect(await erroresDe({ lat: '91', lng: '-181' })).toEqual({
      lat: ['La latitud debe estar entre -90 y 90'],
      lng: ['La longitud debe estar entre -180 y 180'],
    });
  });

  it('rechaza coordenadas que faltan o no son números', async () => {
    const errores = await erroresDe({ lat: 'abc' });
    expect(errores?.lat).toContain('La latitud debe ser un número');
    expect(errores?.lng).toContain('La longitud debe ser un número');
  });

  it('rechaza un tipo inválido', async () => {
    expect(await erroresDe({ lat: '32', lng: '-116', type: 'NADO' })).toEqual({
      type: ['El tipo debe ser HIKING, TRAIL_RUNNING o CYCLING'],
    });
  });
});
