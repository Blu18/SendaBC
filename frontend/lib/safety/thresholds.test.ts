import { describe, expect, it } from 'vitest';
import { UMBRALES, umbralesDe } from './inactivity';
import {
  aSesion,
  ELECCION_POR_DEFECTO,
  guardarEleccion,
  leerEleccion,
  OPCIONES_QUIETO_MIN,
  OPCIONES_RESPUESTA_MIN,
  umbralesDeSesion,
} from './thresholds';

const MIN = 60_000;

describe('opciones (spec 011, RN-9)', () => {
  it('son las de RN-9, con 10 y 2 por defecto', () => {
    expect(OPCIONES_QUIETO_MIN).toEqual([5, 10, 15, 20, 30]);
    expect(OPCIONES_RESPUESTA_MIN).toEqual([1, 2, 3, 5]);
    expect(ELECCION_POR_DEFECTO).toEqual({ quietoMin: 10, respuestaMin: 2 });
  });

  it('la distancia de 30 m no se puede cambiar', () => {
    expect(umbralesDeSesion({ quietMs: 5 * MIN, responseMs: MIN }, UMBRALES).radioM).toBe(30);
  });
});

describe('leerEleccion (CA-50, CA-52)', () => {
  it('lee una elección guardada', () => {
    expect(leerEleccion(guardarEleccion({ quietoMin: 20, respuestaMin: 5 }))).toEqual({
      quietoMin: 20,
      respuestaMin: 5,
    });
  });

  it('sin nada guardado o con JSON dañado usa los valores por defecto', () => {
    expect(leerEleccion(null)).toEqual(ELECCION_POR_DEFECTO);
    expect(leerEleccion(undefined)).toEqual(ELECCION_POR_DEFECTO);
    expect(leerEleccion('{no es json')).toEqual(ELECCION_POR_DEFECTO);
    expect(leerEleccion('null')).toEqual(ELECCION_POR_DEFECTO);
  });

  it('un valor fuera de las opciones usa el de por defecto solo en ese campo', () => {
    expect(leerEleccion('{"quietoMin":7,"respuestaMin":3}')).toEqual({ quietoMin: 10, respuestaMin: 3 });
    expect(leerEleccion('{"quietoMin":15,"respuestaMin":"5"}')).toEqual({ quietoMin: 15, respuestaMin: 2 });
  });

  it('guardarEleccion no guarda valores fuera de las opciones', () => {
    expect(JSON.parse(guardarEleccion({ quietoMin: 99, respuestaMin: 1 }))).toEqual({
      quietoMin: 10,
      respuestaMin: 1,
    });
  });
});

describe('aSesion (CA-51)', () => {
  it('convierte la elección a milisegundos para copiarla a la sesión', () => {
    expect(aSesion({ quietoMin: 15, respuestaMin: 3 })).toEqual({ quietMs: 15 * MIN, responseMs: 3 * MIN });
  });
});

describe('umbralesDeSesion (CA-51, CA-52)', () => {
  it('usa los de la sesión', () => {
    expect(umbralesDeSesion({ quietMs: 20 * MIN, responseMs: 5 * MIN }, UMBRALES)).toEqual({
      ...UMBRALES,
      quietoMs: 20 * MIN,
      respuestaMs: 5 * MIN,
    });
  });

  it('una sesión de antes de v6 o sin sesión usa la base (RN-4)', () => {
    expect(umbralesDeSesion({ quietMs: null, responseMs: null }, UMBRALES)).toEqual(UMBRALES);
    expect(umbralesDeSesion(null, UMBRALES)).toBe(UMBRALES);
  });

  it('un valor inválido en la sesión usa el de la base solo en ese campo', () => {
    expect(umbralesDeSesion({ quietMs: 0, responseMs: 3 * MIN }, UMBRALES)).toMatchObject({
      quietoMs: UMBRALES.quietoMs,
      respuestaMs: 3 * MIN,
    });
  });

  it('en desarrollo, EXPO_PUBLIC_SAFETY_DEBUG_MINUTES sigue mandando', () => {
    const depuracion = umbralesDe('1', true);
    expect(umbralesDeSesion({ quietMs: 20 * MIN, responseMs: 5 * MIN }, depuracion)).toBe(depuracion);
  });
});
