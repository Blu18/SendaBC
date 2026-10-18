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

  it('tienen nombre, dificultad válida y desnivel', () => {
    for (const ruta of rutas) {
      expect(ruta.name.trim()).not.toBe('');
      expect(['EASY', 'MODERATE', 'HARD', 'EXTREME']).toContain(
        ruta.difficulty,
      );
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
