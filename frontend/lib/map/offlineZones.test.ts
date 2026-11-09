import { describe, expect, it } from 'vitest';
import {
  MAX_ZONES,
  areaKm2,
  boundsParaMapbox,
  contarMosaicos,
  formatoTamano,
  marcoALimites,
  revisarZona,
  tamanoAproximadoMb,
  type ZoneBounds,
} from './offlineZones';

// Sierra de San Pedro Mártir, donde se midió en T2.
const sierra = { latitude: 31.0, longitude: -115.5 };

// Una zona cuadrada de `km` de lado alrededor de un centro.
function cuadro(km: number, center = sierra): ZoneBounds {
  const dLat = km / 2 / 111.32;
  const dLng = km / 2 / (111.32 * Math.cos((center.latitude * Math.PI) / 180));
  return {
    north: center.latitude + dLat,
    south: center.latitude - dLat,
    east: center.longitude + dLng,
    west: center.longitude - dLng,
  };
}

describe('marcoALimites (CA-31)', () => {
  it('queda centrado en el centro del mapa', () => {
    const b = marcoALimites({ center: sierra, zoom: 11, widthPx: 300, heightPx: 300 });
    expect((b.east + b.west) / 2).toBeCloseTo(sierra.longitude, 6);
    // En Mercator el centro en latitud no es el promedio exacto, pero a esta escala casi.
    expect((b.north + b.south) / 2).toBeCloseTo(sierra.latitude, 3);
    expect(b.north).toBeGreaterThan(b.south);
    expect(b.east).toBeGreaterThan(b.west);
  });

  it('a zoom 0 un marco de 512 px es el mundo entero de ancho', () => {
    const b = marcoALimites({ center: { latitude: 0, longitude: 0 }, zoom: 0, widthPx: 512, heightPx: 10 });
    expect(b.west).toBeCloseTo(-180, 6);
    expect(b.east).toBeCloseTo(180, 6);
  });

  it('un nivel más de zoom reduce el área a la cuarta parte', () => {
    const a11 = areaKm2(marcoALimites({ center: sierra, zoom: 11, widthPx: 300, heightPx: 300 }));
    const a12 = areaKm2(marcoALimites({ center: sierra, zoom: 12, widthPx: 300, heightPx: 300 }));
    expect(a11 / a12).toBeCloseTo(4, 2);
  });

  it('un marco de 300 dp a zoom 9.4 es de unos 30 km de lado en la sierra', () => {
    // 40 075 km · cos(31°) / (512 · 2^9.4) ≈ 0.099 km por px → 300 px ≈ 30 km.
    const b = marcoALimites({ center: sierra, zoom: 9.4, widthPx: 300, heightPx: 300 });
    expect(Math.sqrt(areaKm2(b))).toBeGreaterThan(27);
    expect(Math.sqrt(areaKm2(b))).toBeLessThan(33);
  });
});

describe('areaKm2 y tamanoAproximadoMb (D15)', () => {
  it('calcula el área de un cuadro', () => {
    expect(areaKm2(cuadro(10))).toBeCloseTo(100, 0);
    expect(areaKm2(cuadro(30))).toBeCloseTo(900, 0);
  });

  it('coincide con lo medido en T2: 100 km² ≈ 41 MB y 900 km² ≈ 142 MB', () => {
    expect(tamanoAproximadoMb(cuadro(10))).toBeCloseTo(41, 0);
    expect(Math.abs(tamanoAproximadoMb(cuadro(30)) - 142)).toBeLessThan(1);
  });

  it('se muestra redondeado', () => {
    expect(formatoTamano(40.6)).toBe('Unos 41 MB');
  });
});

describe('contarMosaicos', () => {
  it('a zoom 0 todo el mundo es un mosaico', () => {
    expect(contarMosaicos({ north: 80, south: -80, east: 179, west: -179 }, 0, 0)).toBe(1);
  });

  it('una zona dentro de un mosaico cuenta uno por zoom', () => {
    const chica: ZoneBounds = { north: 31.001, south: 31.0, east: -115.499, west: -115.5 };
    expect(contarMosaicos(chica, 10, 13)).toBe(4);
  });

  it('crece con el zoom y con el área', () => {
    const z10 = contarMosaicos(cuadro(30), 10, 10);
    const z13 = contarMosaicos(cuadro(30), 13, 13);
    expect(z13).toBeGreaterThan(z10 * 16);
    expect(contarMosaicos(cuadro(30))).toBeGreaterThan(contarMosaicos(cuadro(10)));
  });
});

describe('revisarZona: tope de RN-8 (D13)', () => {
  it('deja descargar una zona de 30 × 30 km o menos, con su tamaño', () => {
    const r = revisarZona(cuadro(29), 0);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.sizeMb).toBeGreaterThan(130);
  });

  it('rechaza una zona de más de 900 km² y da su tamaño', () => {
    const r = revisarZona(cuadro(31), 0);
    expect(r).toMatchObject({ ok: false, reason: 'too-large' });
  });

  it('rechaza cualquier zona si ya hay 10', () => {
    expect(revisarZona(cuadro(5), MAX_ZONES)).toEqual({ ok: false, reason: 'too-many' });
    expect(revisarZona(cuadro(5), MAX_ZONES - 1).ok).toBe(true);
  });
});

describe('boundsParaMapbox', () => {
  it('da [[lng, lat] noreste, [lng, lat] suroeste]', () => {
    expect(boundsParaMapbox({ north: 2, south: 1, east: 4, west: 3 })).toEqual([
      [4, 2],
      [3, 1],
    ]);
  });
});
