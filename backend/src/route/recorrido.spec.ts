import { describe, expect, it } from 'vitest';
import {
  sinPuntosViejos,
  sinSaltos,
  type PuntoRecorrido,
} from './recorrido.js';
import { perfilDe } from './elevation-profile.js';

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

// Puntos cada 10 s hacia el norte, ~11 m entre cada uno (1.1 m/s, a pie). `lejos` los mueve
// ~11 km al este: llegar ahí en 10 s es un salto imposible (spec 004, CA-25).
const enCamino = (sequence: number, lejos = false): PuntoRecorrido => ({
  lat: 32 + sequence * 0.0001,
  lng: lejos ? -114.88 : -115,
  altitudeMeters: 100,
  sequence,
  recordedAt: new Date(INICIO.getTime() + sequence * 10_000),
});
const camino = (n: number, saltos: number[] = []) =>
  Array.from({ length: n }, (_, i) => enCamino(i + 1, saltos.includes(i + 1)));

describe('sinSaltos (spec 011, CA-15, CA-16, D8)', () => {
  it('sin saltos conserva todos', () => {
    const puntos = camino(5);
    expect(sinSaltos(puntos)).toEqual(puntos);
  });

  it('quita un salto aislado a media grabación', () => {
    expect(secuencias(sinSaltos(camino(6, [3])))).toEqual([1, 2, 4, 5, 6]);
  });

  it('quita varios puntos seguidos lejos del recorrido', () => {
    expect(secuencias(sinSaltos(camino(8, [4, 5])))).toEqual([
      1, 2, 3, 6, 7, 8,
    ]);
  });

  it('un GPS que se pierde con tiempo de por medio no es salto', () => {
    // ~1 km en 10 minutos: 1.7 m/s.
    const puntos = [
      enCamino(1),
      {
        ...enCamino(2),
        lat: 32.01,
        recordedAt: new Date(INICIO.getTime() + 600_000),
      },
    ];
    expect(sinSaltos(puntos)).toEqual(puntos);
  });

  it('si el primer punto es el falso usa el tramo sin saltos más largo', () => {
    expect(secuencias(sinSaltos(camino(5, [1])))).toEqual([2, 3, 4, 5]);
  });

  it('con menos de 2 puntos sin saltos conserva todos', () => {
    const puntos = camino(2, [2]);
    expect(sinSaltos(puntos)).toEqual(puntos);
  });

  it('el perfil no suma el salto a su eje de distancia (CA-16)', () => {
    const conSalto = camino(6, [3]);
    const sinElSalto = camino(6).filter((p) => p.sequence !== 3);
    expect(perfilDe(sinSaltos(conSalto))).toEqual(perfilDe(sinElSalto));
  });
});
