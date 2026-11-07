import { describe, expect, it } from 'vitest';
import { sinPuntosViejos, type PuntoRecorrido } from './recorrido.js';

const INICIO = new Date('2026-11-06T16:00:00Z');

const punto = (sequence: number, segundos: number): PuntoRecorrido => ({
  lat: 32,
  lng: -115,
  altitudeMeters: 100,
  sequence,
  recordedAt: new Date(INICIO.getTime() + segundos * 1000),
});
const secuencias = (puntos: PuntoRecorrido[]) => puntos.map((p) => p.sequence);

describe('sinPuntosViejos (spec 007, CA-28, RN-10)', () => {
  it('sin puntos viejos conserva todos', () => {
    const puntos = [punto(1, 5), punto(2, 15), punto(3, 25)];
    expect(sinPuntosViejos(puntos, INICIO)).toEqual(puntos);
  });

  it('quita los puntos del principio de más de 30 s antes del inicio', () => {
    const puntos = [punto(1, -1500), punto(2, -31), punto(3, 5), punto(4, 15)];
    expect(secuencias(sinPuntosViejos(puntos, INICIO))).toEqual([3, 4]);
  });

  it('acepta un punto justo en el margen', () => {
    const puntos = [punto(1, -30), punto(2, 5)];
    expect(secuencias(sinPuntosViejos(puntos, INICIO))).toEqual([1, 2]);
  });

  it('solo mira el principio: un punto atrasado a media actividad se queda', () => {
    const puntos = [punto(1, 5), punto(2, -100), punto(3, 15)];
    expect(secuencias(sinPuntosViejos(puntos, INICIO))).toEqual([1, 2, 3]);
  });

  it('con el reloj desfasado conserva todos', () => {
    const puntos = [punto(1, -600), punto(2, -590), punto(3, -580)];
    expect(sinPuntosViejos(puntos, INICIO)).toEqual(puntos);
  });

  it('si quedaría un solo punto conserva todos', () => {
    const puntos = [punto(1, -600), punto(2, 5)];
    expect(sinPuntosViejos(puntos, INICIO)).toEqual(puntos);
  });
});
