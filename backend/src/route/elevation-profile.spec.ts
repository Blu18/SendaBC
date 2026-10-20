import {
  MAX_PUNTOS_PERFIL,
  perfilDe,
  type PuntoPerfil,
} from './elevation-profile.js';

// En el ecuador, 0.001° de longitud son ~111.2 m (radio medio 6 371 008.8 m).
const M_POR_MILESIMA = 111.195;

function punto(
  lngMilesimas: number,
  altitudeMeters: number | null,
): PuntoPerfil {
  return { lat: 0, lng: lngMilesimas / 1000, altitudeMeters };
}

describe('perfilDe (spec 007, RN-8, CA-11)', () => {
  it('lleva la distancia acumulada con haversine', () => {
    const perfil = perfilDe([punto(0, 100), punto(1, 110), punto(3, 105)]);

    expect(perfil).toHaveLength(3);
    expect(perfil![1][0]).toBeCloseTo(M_POR_MILESIMA, 0);
    expect(perfil![2][0]).toBeCloseTo(3 * M_POR_MILESIMA, 0);
    expect(perfil!.map(([, altitud]) => altitud)).toEqual([100, 110, 105]);
  });

  it('1° de latitud sobre un meridiano mide πR/180 ≈ 111 195.1 m', () => {
    const perfil = perfilDe([
      { lat: 31, lng: -116.6, altitudeMeters: 20 },
      { lat: 32, lng: -116.6, altitudeMeters: 10 },
    ]);
    expect(perfil![1][0]).toBeCloseTo(111_195.1, 0);
  });

  it('el primer punto está en 0 m y el último en la distancia total', () => {
    const puntos = Array.from({ length: 50 }, (_, i) => punto(i, 100 + i));
    const perfil = perfilDe(puntos)!;

    expect(perfil[0]).toEqual([0, 100]);
    expect(perfil.at(-1)![0]).toBeCloseTo(49 * M_POR_MILESIMA, 0);
    expect(perfil.at(-1)![1]).toBe(149);
  });

  it('reduce 5 400 puntos (una ruta de 3 h) a 200 como máximo, en orden', () => {
    const puntos = Array.from({ length: 5_400 }, (_, i) =>
      punto(i / 10, 500 + Math.sin(i / 100) * 50),
    );
    const perfil = perfilDe(puntos)!;

    expect(perfil.length).toBeLessThanOrEqual(MAX_PUNTOS_PERFIL);
    expect(perfil.length).toBeGreaterThan(MAX_PUNTOS_PERFIL - 10);
    expect(perfil[0][0]).toBe(0);
    expect(perfil.at(-1)![0]).toBeCloseTo(539.9 * M_POR_MILESIMA, 0);
    for (let i = 1; i < perfil.length; i++) {
      expect(perfil[i][0]).toBeGreaterThan(perfil[i - 1][0]);
    }
  });

  it('muestrea por distancia, no por número de puntos', () => {
    // 4 000 puntos apretados en los primeros 400 m y 1 000 repartidos en los siguientes 10 km.
    const puntos = [
      ...Array.from({ length: 4_000 }, (_, i) => punto(i / 1000, 100)),
      ...Array.from({ length: 1_000 }, (_, i) => punto(4 + (i + 1) / 10, 200)),
    ];
    const perfil = perfilDe(puntos)!;
    const enLaParteApretada = perfil.filter(([, altitud]) => altitud === 100);

    // La parte apretada mide ~4% del recorrido: no debe llevarse la mitad del perfil.
    expect(enLaParteApretada.length).toBeLessThan(20);
  });

  it('salta los puntos sin altitud, pero cuenta su distancia', () => {
    const perfil = perfilDe([
      punto(0, null),
      punto(1, 100),
      punto(2, null),
      punto(3, 120),
    ]);

    expect(perfil).toHaveLength(2);
    expect(perfil![0][0]).toBeCloseTo(M_POR_MILESIMA, 0);
    expect(perfil![1][0]).toBeCloseTo(3 * M_POR_MILESIMA, 0);
  });

  it('con el GPS detenido conserva un solo punto por distancia', () => {
    const perfil = perfilDe([punto(0, 100), punto(0, 103), punto(1, 105)]);
    expect(perfil!.map(([, altitud]) => altitud)).toEqual([100, 105]);
  });

  it('sin altitudes o sin puntos devuelve null', () => {
    expect(perfilDe([punto(0, null), punto(1, null)])).toBeNull();
    expect(perfilDe([])).toBeNull();
  });
});
