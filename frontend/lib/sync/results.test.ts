import { describe, expect, it } from 'vitest';
import type { UploadPayload } from './payload';
import {
  classifyBatchResponse,
  classifyFailure,
  classifyResult,
  RECHAZO_GENERICO,
} from './results';

const payload = (clientGeneratedId: string) => ({ clientGeneratedId }) as UploadPayload;

describe('classifyResult (spec 005)', () => {
  it('CREATED → synced con el id del servidor (CA-13)', () => {
    expect(classifyResult({ clientGeneratedId: 'a', status: 'CREATED', id: 'srv-1' })).toEqual({
      kind: 'synced',
      serverId: 'srv-1',
    });
  });

  it('ALREADY_EXISTS también → synced (reenvío, CA-10)', () => {
    expect(
      classifyResult({ clientGeneratedId: 'a', status: 'ALREADY_EXISTS', id: 'srv-1' })
    ).toEqual({ kind: 'synced', serverId: 'srv-1' });
  });

  it('REJECTED → rejected con los motivos del servidor (CA-11)', () => {
    expect(
      classifyResult({
        clientGeneratedId: 'a',
        status: 'REJECTED',
        errors: ['Punto 2: La latitud debe estar entre -90 y 90', 'La secuencia 3 está repetida'],
      })
    ).toEqual({
      kind: 'rejected',
      message: 'Punto 2: La latitud debe estar entre -90 y 90\nLa secuencia 3 está repetida',
    });
  });

  it('REJECTED sin motivos usa un mensaje genérico', () => {
    expect(classifyResult({ clientGeneratedId: 'a', status: 'REJECTED', errors: [] })).toEqual({
      kind: 'rejected',
      message: RECHAZO_GENERICO,
    });
  });
});

describe('classifyBatchResponse (spec 005, CA-13)', () => {
  it('empareja por clientGeneratedId aunque el orden cambie', () => {
    const acciones = classifyBatchResponse(
      [payload('a'), payload('b')],
      [
        { clientGeneratedId: 'b', status: 'REJECTED', errors: ['x'] },
        { clientGeneratedId: 'a', status: 'CREATED', id: 'srv-a' },
      ]
    );

    expect(acciones).toEqual(
      new Map([
        ['a', { kind: 'synced', serverId: 'srv-a' }],
        ['b', { kind: 'rejected', message: 'x' }],
      ])
    );
  });

  it('una actividad sin resultado no se marca: queda pendiente', () => {
    const acciones = classifyBatchResponse(
      [payload('a'), payload('b')],
      [{ clientGeneratedId: 'a', status: 'CREATED', id: 'srv-a' }]
    );

    expect([...acciones.keys()]).toEqual(['a']);
  });

  it('ignora resultados de actividades que no se enviaron o sin id', () => {
    const acciones = classifyBatchResponse(
      [payload('a')],
      [
        { clientGeneratedId: 'otra', status: 'CREATED', id: 'srv-x' },
        { clientGeneratedId: null, status: 'REJECTED', errors: ['x'] },
      ]
    );

    expect(acciones.size).toBe(0);
  });
});

describe('classifyFailure (spec 005, CA-9, CA-12)', () => {
  it('401 → auth: se detiene sin reintentar', () => {
    expect(classifyFailure({ status: 401 })).toBe('auth');
  });

  it.each([500, 502, 503, 413, 400, 404, 429])('%i → retry', (status) => {
    expect(classifyFailure({ status })).toBe('retry');
  });

  it('sin red o tiempo agotado → retry', () => {
    expect(classifyFailure({ error: new TypeError('Network request failed') })).toBe('retry');
    expect(classifyFailure({ error: new DOMException('Aborted', 'AbortError') })).toBe('retry');
  });
});
