import { describe, expect, it } from 'vitest';
import { haversineMeters } from '../metrics/geo';
import {
  BAJA_CALIFORNIA_BOUNDS,
  BAJA_CALIFORNIA_CENTER,
  DEFAULT_RADIUS_KM,
  RADIUS_OPTIONS_KM,
} from './constants';
import {
  boundsAround,
  boundsForPath,
  distanceFromUser,
  hasMovedEnough,
} from './geo';

const ENSENADA = { latitude: 31.8667, longitude: -116.5964 };
const TECATE = { latitude: 32.5725, longitude: -116.6264 };

// Punto a `km` al norte (sobre un meridiano, 1° ≈ 111.195 km).
const alNorte = (p: typeof ENSENADA, km: number) => ({
  latitude: p.latitude + km / 111.195,
  longitude: p.longitude,
});

describe('distanceFromUser (CA-7, RN-2)', () => {
  it('es la distancia en línea recta hasta el inicio de la ruta', () => {
    const d = distanceFromUser({ start: TECATE }, ENSENADA);
    expect(d).toBe(haversineMeters(ENSENADA, TECATE));
    // Ensenada–Tecate, ~78.5 km en línea recta.
    expect(d! / 1000).toBeCloseTo(78.5, 0);
  });

  it('sin ubicación del usuario es null (CA-14)', () => {
    expect(distanceFromUser({ start: TECATE }, null)).toBeNull();
  });
});

describe('hasMovedEnough (CA-9)', () => {
  it('sin búsqueda previa siempre muestra "Buscar en esta zona" (CA-14)', () => {
    expect(hasMovedEnough(null, ENSENADA, 25)).toBe(true);
  });

  it('con 25 km, moverse 4 km (16 %) no basta y 6 km (24 %) sí', () => {
    expect(hasMovedEnough(ENSENADA, alNorte(ENSENADA, 4), 25)).toBe(false);
    expect(hasMovedEnough(ENSENADA, alNorte(ENSENADA, 6), 25)).toBe(true);
  });

  it('el umbral depende del radio: 2 km basta con 5 km pero no con 100 km', () => {
    expect(hasMovedEnough(ENSENADA, alNorte(ENSENADA, 2), 5)).toBe(true);
    expect(hasMovedEnough(ENSENADA, alNorte(ENSENADA, 2), 100)).toBe(false);
  });

  it('sin moverse no aparece', () => {
    expect(hasMovedEnough(ENSENADA, ENSENADA, 5)).toBe(false);
  });
});

describe('constantes (CA-11, CA-14)', () => {
  it('radios de 5 a 100 km y 25 km por defecto', () => {
    expect(RADIUS_OPTIONS_KM).toEqual([5, 10, 25, 50, 100]);
    expect(RADIUS_OPTIONS_KM).toContain(DEFAULT_RADIUS_KM);
    expect(DEFAULT_RADIUS_KM).toBe(25);
  });

  it('el encuadre de Baja California cubre Tijuana, Mexicali, el paralelo 28 y la costa del Golfo', () => {
    const { ne, sw } = BAJA_CALIFORNIA_BOUNDS;
    const dentro = (lat: number, lng: number) => lng >= sw[0] && lng <= ne[0] && lat >= sw[1] && lat <= ne[1];
    expect(dentro(32.5149, -117.0382)).toBe(true); // Tijuana
    expect(dentro(32.6245, -115.4523)).toBe(true); // Mexicali
    expect(dentro(28.0, -114.8)).toBe(true); // límite con Baja California Sur
    expect(dentro(31.0447, -114.8389)).toBe(true); // San Felipe
    expect(dentro(28.95, -113.56)).toBe(true); // Bahía de los Ángeles
    expect(dentro(28.54, -114.09)).toBe(true); // inicio de La Otra Baja 100
  });
});

describe('boundsForPath (spec 013, CA-32)', () => {
  const start = { latitude: 31.8, longitude: -116.6 };

  it('esquinas [lng, lat] con el recorrido en el centro y 25 % de margen por lado', () => {
    const { ne, sw } = boundsForPath(
      [
        [-116.6, 31.8],
        [-116.5, 31.9],
      ],
      start
    );
    expect(ne[0]).toBeCloseTo(-116.475);
    expect(ne[1]).toBeCloseTo(31.925);
    expect(sw[0]).toBeCloseTo(-116.625);
    expect(sw[1]).toBeCloseTo(31.775);
  });

  it('una ruta muy corta queda dentro de un encuadre mínimo de 0.005°', () => {
    const { ne, sw } = boundsForPath(
      [
        [-116.6, 31.8],
        [-116.6, 31.8001],
      ],
      start
    );
    expect(ne[0] - sw[0]).toBeCloseTo(0.005);
    expect(ne[1] - sw[1]).toBeCloseTo(0.005);
  });

  it('sin recorrido, alrededor del inicio', () => {
    const { ne, sw } = boundsForPath([], start);
    expect((ne[0] + sw[0]) / 2).toBeCloseTo(-116.6);
    expect((ne[1] + sw[1]) / 2).toBeCloseTo(31.8);
  });
});

describe('boundsAround (spec 013, CA-31)', () => {
  it('centra en el punto y su alto cubre el diámetro del radio', () => {
    const { ne, sw } = boundsAround(ENSENADA, 25);
    expect((ne[0] + sw[0]) / 2).toBeCloseTo(ENSENADA.longitude);
    expect((ne[1] + sw[1]) / 2).toBeCloseTo(ENSENADA.latitude);
    expect((ne[1] - sw[1]) * 111.2).toBeCloseTo(50, 5);
    expect(ne[0] - sw[0]).toBeGreaterThan(ne[1] - sw[1]);
  });
});

describe('BAJA_CALIFORNIA_CENTER (spec 013, T7)', () => {
  it('es el centro del encuadre de Baja California', () => {
    const { ne, sw } = BAJA_CALIFORNIA_BOUNDS;
    expect(BAJA_CALIFORNIA_CENTER[0]).toBeCloseTo((ne[0] + sw[0]) / 2);
    expect(BAJA_CALIFORNIA_CENTER[1]).toBeCloseTo((ne[1] + sw[1]) / 2);
  });
});
