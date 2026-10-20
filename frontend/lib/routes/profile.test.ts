import { describe, expect, it } from 'vitest';
import { perfilParaGrafica, type Perfil } from './profile';

describe('perfilParaGrafica (spec 007, CA-11)', () => {
  it('agrupa en N columnas de la misma distancia, con su mínima y máxima', () => {
    // 1 km dividido en 4 columnas de 250 m.
    const perfil: Perfil = [
      [0, 100],
      [100, 120],
      [300, 150],
      [400, 140],
      [600, 200],
      [800, 180],
      [1000, 160],
    ];
    const grafica = perfilParaGrafica(perfil, 4)!;

    expect(grafica.distanciaTotalM).toBe(1000);
    expect(grafica.altitudMinM).toBe(100);
    expect(grafica.altitudMaxM).toBe(200);
    expect(grafica.columnas.map((c) => c.distanciaM)).toEqual([125, 375, 625, 875]);
    expect(grafica.columnas.map((c) => [c.altitudMinM, c.altitudMaxM])).toEqual([
      [100, 120],
      [140, 150],
      [200, 200],
      // El último punto (1000 m) cae en la última columna, no en una quinta.
      [160, 180],
    ]);
  });

  it('la altura normaliza la máxima de cada columna entre la mínima y la máxima del perfil', () => {
    const grafica = perfilParaGrafica(
      [
        [0, 100],
        [500, 300],
        [1000, 200],
      ],
      2
    )!;

    // Columna 1: 0 y 500 m caen en [0, 500) y [500, 1000]: máximas 100 y 300.
    expect(grafica.columnas.map((c) => c.altura)).toEqual([0, 1]);
  });

  it('una columna sin puntos toma la altitud interpolada en su centro', () => {
    // Dos puntos, 10 columnas: solo la primera y la última tienen puntos.
    const grafica = perfilParaGrafica(
      [
        [0, 0],
        [1000, 100],
      ],
      10
    )!;

    expect(grafica.columnas).toHaveLength(10);
    // Centro de la 5.ª columna: 450 m → 45 m.
    expect(grafica.columnas[4].altitudMaxM).toBeCloseTo(45);
    const alturas = grafica.columnas.map((c) => c.altura);
    expect(alturas).toEqual([...alturas].sort((a, b) => a - b));
  });

  it('un perfil plano dibuja todas las columnas a media altura', () => {
    const grafica = perfilParaGrafica(
      [
        [0, 50],
        [500, 50],
        [1000, 50],
      ],
      5
    )!;
    expect(new Set(grafica.columnas.map((c) => c.altura))).toEqual(new Set([0.5]));
  });

  it('un perfil que no empieza en 0 m mide su distancia desde el primer punto', () => {
    const grafica = perfilParaGrafica(
      [
        [111.2, 10],
        [611.2, 20],
      ],
      2
    )!;
    expect(grafica.distanciaTotalM).toBeCloseTo(500);
    expect(grafica.columnas[0].distanciaM).toBeCloseTo(236.2);
  });

  it('con 200 puntos y 50 columnas cada columna junta 4 puntos', () => {
    const perfil: Perfil = Array.from({ length: 200 }, (_, i) => [i * 10, 500 + (i % 7)]);
    const grafica = perfilParaGrafica(perfil, 50)!;
    expect(grafica.columnas).toHaveLength(50);
    for (const c of grafica.columnas) {
      expect(c.altura).toBeGreaterThanOrEqual(0);
      expect(c.altura).toBeLessThanOrEqual(1);
    }
  });

  it('sin perfil, vacío, con un solo punto o sin distancia devuelve null', () => {
    expect(perfilParaGrafica(null, 10)).toBeNull();
    expect(perfilParaGrafica(undefined, 10)).toBeNull();
    expect(perfilParaGrafica([], 10)).toBeNull();
    expect(perfilParaGrafica([[0, 100]], 10)).toBeNull();
    expect(
      perfilParaGrafica(
        [
          [0, 100],
          [0, 120],
        ],
        10
      )
    ).toBeNull();
  });

  it('un número de columnas menor que 1 se trata como 1', () => {
    const grafica = perfilParaGrafica(
      [
        [0, 100],
        [1000, 200],
      ],
      0
    )!;
    expect(grafica.columnas).toHaveLength(1);
    expect(grafica.columnas[0]).toMatchObject({ altitudMinM: 100, altitudMaxM: 200, altura: 1 });
  });
});
