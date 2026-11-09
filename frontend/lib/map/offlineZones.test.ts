import { describe, expect, it } from 'vitest';
import {
  MAX_ZONES,
  agruparZonas,
  estadoDelSelector,
  resumenDeZona,
  areaKm2,
  boundsParaMapbox,
  contarMosaicos,
  formatoOcupado,
  formatoTamano,
  marcoALimites,
  nombreDePaquete,
  revisarZona,
  tamanoAproximadoMb,
  type PackInfo,
  type ZoneBounds,
  type ZoneStyle,
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

describe('agruparZonas (CA-32, CA-33)', () => {
  const bounds = cuadro(10);
  const paquete = (zoneId: string, style: ZoneStyle, o: Partial<PackInfo> = {}): PackInfo => ({
    name: nombreDePaquete(zoneId, style),
    metadata: { zoneId, style, createdAt: `2026-11-0${zoneId.slice(-1)}T10:00:00.000Z`, bounds },
    complete: true,
    percentage: 100,
    sizeBytes: 41_000_000,
    ...o,
  });

  it('dos paquetes completos son una zona lista, con el tamaño del mayor', () => {
    const [z] = agruparZonas([paquete('z1', 'light'), paquete('z1', 'dark', { sizeBytes: 40_000_000 })]);
    expect(z).toMatchObject({ id: 'z1', status: 'ready', percentage: 100, sizeBytes: 41_000_000, missingStyles: [] });
    expect(z.areaKm2).toBeCloseTo(100, 0);
  });

  it('ordena de la más nueva a la más vieja e ignora paquetes ajenos', () => {
    const ajeno: PackInfo = { name: 'otro', metadata: {}, complete: true, percentage: 100, sizeBytes: 1 };
    const zonas = agruparZonas([
      paquete('z1', 'light'),
      paquete('z1', 'dark'),
      ajeno,
      paquete('z2', 'light'),
      paquete('z2', 'dark'),
    ]);
    expect(zonas.map((z) => z.id)).toEqual(['z2', 'z1']);
  });

  it('con un paquete avanzando en esta sesión está descargando, con el avance promedio', () => {
    const packs = [
      paquete('z1', 'light', { complete: false, percentage: 10 }),
      paquete('z1', 'dark', { complete: false, percentage: 0 }),
    ];
    const [z] = agruparZonas(packs, { 'z1:light': { state: 'active', percentage: 60 } });
    expect(z).toMatchObject({ status: 'downloading', percentage: 30 });
  });

  it('el aviso de completo de esta sesión cuenta aunque la lista sea vieja', () => {
    const packs = [paquete('z1', 'light', { complete: false, percentage: 90 }), paquete('z1', 'dark')];
    const [z] = agruparZonas(packs, { 'z1:light': { state: 'complete', percentage: 100 } });
    expect(z.status).toBe('ready');
  });

  it('sin terminar y sin descarga en esta sesión (app cerrada) es incompleta, no lista', () => {
    const [z] = agruparZonas([paquete('z1', 'light', { complete: false, percentage: 40 }), paquete('z1', 'dark')]);
    expect(z).toMatchObject({ status: 'incomplete', percentage: 70 });
  });

  it('un error en un paquete la deja incompleta aunque el otro siga', () => {
    const packs = [paquete('z1', 'light', { complete: false }), paquete('z1', 'dark', { complete: false })];
    const [z] = agruparZonas(packs, {
      'z1:light': { state: 'error', percentage: 20 },
      'z1:dark': { state: 'active', percentage: 5 },
    });
    expect(z.status).toBe('incomplete');
  });

  it('si falta el paquete oscuro (se cerró la app entre uno y otro) es incompleta y lo dice', () => {
    const [z] = agruparZonas([paquete('z1', 'light')]);
    expect(z).toMatchObject({ status: 'incomplete', percentage: 50, missingStyles: ['dark'] });
  });
});

describe('formatoOcupado', () => {
  it('redondea a MB', () => {
    expect(formatoOcupado(141_600_000)).toBe('142 MB');
    expect(formatoOcupado(300_000)).toBe('Menos de 1 MB');
  });
});

describe('estadoDelSelector (CA-31, CA-34)', () => {
  it('sin red no deja descargar, aunque todo lo demás esté bien (CA-34)', () => {
    expect(estadoDelSelector({ conectado: false, zonas: 0, bounds: cuadro(10) })).toEqual({ kind: 'offline' });
  });

  it('espera a saber cuántas zonas hay y a medir el marco', () => {
    expect(estadoDelSelector({ conectado: true, zonas: null, bounds: cuadro(10) }).kind).toBe('loading');
    expect(estadoDelSelector({ conectado: true, zonas: 0, bounds: null }).kind).toBe('loading');
  });

  it('una zona válida trae su tamaño para mostrarlo antes de confirmar (CA-31)', () => {
    const r = estadoDelSelector({ conectado: true, zonas: 3, bounds: cuadro(10) });
    expect(r).toMatchObject({ kind: 'ok' });
    if (r.kind === 'ok') expect(r.sizeMb).toBeCloseTo(41, 0);
  });

  it('rechaza por tamaño o por tener ya 10 zonas (RN-8)', () => {
    expect(estadoDelSelector({ conectado: true, zonas: 0, bounds: cuadro(40) }).kind).toBe('too-large');
    expect(estadoDelSelector({ conectado: true, zonas: MAX_ZONES, bounds: cuadro(10) }).kind).toBe('too-many');
  });
});

describe('resumenDeZona', () => {
  it('da tamaño y área redondeados', () => {
    expect(resumenDeZona(99.6, 40.6)).toBe('Unos 41 MB · 100 km²');
  });
});
