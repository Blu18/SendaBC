import { dificultadDe } from '../../src/route/difficulty.ts';
import rutas from './rutas-ejemplo.json' with { type: 'json' };

// Límites aproximados del estado de Baja California (grados WGS84). Al este llega al Golfo de
// California, hasta la Isla Ángel de la Guarda (~ -112.7).
const BC = { minLat: 28.0, maxLat: 32.72, minLng: -117.13, maxLng: -112.7 };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('Rutas de ejemplo (spec 006, CA-18)', () => {
  it('hay al menos 12 rutas en al menos 4 zonas', () => {
    expect(rutas.length).toBeGreaterThanOrEqual(12);
    expect(new Set(rutas.map((r) => r.region)).size).toBeGreaterThanOrEqual(4);
  });

  it('incluyen los tres tipos de actividad', () => {
    expect(new Set(rutas.map((r) => r.type))).toEqual(
      new Set(['HIKING', 'TRAIL_RUNNING', 'CYCLING']),
    );
  });

  it('tienen ids UUID fijos y únicos (CA-20)', () => {
    for (const ruta of rutas) expect(ruta.id).toMatch(UUID);
    expect(new Set(rutas.map((r) => r.id)).size).toBe(rutas.length);
  });

  it('tienen nombre y desnivel', () => {
    for (const ruta of rutas) {
      expect(ruta.name.trim()).not.toBe('');
      expect(ruta.elevationGainMeters).toBeGreaterThanOrEqual(0);
    }
  });

  it('cada recorrido tiene de 10 a 40 puntos [lng, lat] dentro de Baja California', () => {
    for (const ruta of rutas) {
      expect(ruta.path.length, ruta.name).toBeGreaterThanOrEqual(10);
      expect(ruta.path.length, ruta.name).toBeLessThanOrEqual(40);
      for (const [lng, lat] of ruta.path) {
        expect(lat, ruta.name).toBeGreaterThanOrEqual(BC.minLat);
        expect(lat, ruta.name).toBeLessThanOrEqual(BC.maxLat);
        expect(lng, ruta.name).toBeGreaterThanOrEqual(BC.minLng);
        expect(lng, ruta.name).toBeLessThanOrEqual(BC.maxLng);
      }
    }
  });

  it('vienen de una traza real, con atribución y distancia (plan D8)', () => {
    for (const ruta of rutas) {
      expect(ruta.source.platform, ruta.name).toBe('Wikiloc');
      expect(ruta.source.url, ruta.name).toMatch(
        /^https:\/\/www\.wikiloc\.com\//,
      );
      expect(ruta.description, ruta.name).toContain('Wikiloc');
      expect(ruta.distanceMeters, ruta.name).toBeGreaterThan(0);
    }
  });
});

describe('Rutas de ejemplo (spec 007)', () => {
  it('su dificultad es la que calcula la regla de RN-6', () => {
    for (const ruta of rutas) {
      expect(ruta.difficulty, ruta.name).toBe(
        dificultadDe(
          ruta.type as 'HIKING' | 'TRAIL_RUNNING' | 'CYCLING',
          ruta.distanceMeters,
          ruta.elevationGainMeters,
        ),
      );
    }
  });

  it('cada una tiene un perfil de 2 a 200 puntos, con distancias crecientes (RN-8, CA-11)', () => {
    for (const ruta of rutas) {
      const perfil = ruta.elevationProfile;
      expect(perfil.length, ruta.name).toBeGreaterThanOrEqual(2);
      expect(perfil.length, ruta.name).toBeLessThanOrEqual(200);
      for (let i = 1; i < perfil.length; i++) {
        expect(perfil[i][0], ruta.name).toBeGreaterThan(perfil[i - 1][0]);
      }
    }
  });

  it('el perfil cubre la ruta completa: empieza cerca de 0 y termina en su distancia', () => {
    for (const ruta of rutas) {
      const perfil = ruta.elevationProfile;
      expect(perfil[0][0], ruta.name).toBeLessThan(50);
      // La distancia del JSON está redondeada al metro y la del perfil a 0.1 m.
      expect(
        Math.abs(perfil.at(-1)![0] - ruta.distanceMeters),
        ruta.name,
      ).toBeLessThan(1);
    }
  });

  // El perfil usa las altitudes del GPX tal cual (RN-8). El GPS se equivoca cerca de la
  // costa: La Otra Baja 100 trae puntos hasta -53 m. El límite solo descarta datos absurdos.
  it('las altitudes del perfil son números razonables (de -100 a 3 100 m)', () => {
    for (const ruta of rutas) {
      for (const [, altitud] of ruta.elevationProfile) {
        expect(Number.isFinite(altitud), ruta.name).toBe(true);
        expect(altitud, ruta.name).toBeGreaterThanOrEqual(-100);
        expect(altitud, ruta.name).toBeLessThanOrEqual(3_100);
      }
    }
  });
});
