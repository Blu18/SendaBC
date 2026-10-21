import { describe, expect, it } from 'vitest';
import { haversineMeters } from '../metrics/geo';
import { BAJA_CALIFORNIA_REGION, DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM } from './constants';
import { distanceFromUser, hasMovedEnough, pathToCoordinates, regionAround, regionForPath } from './geo';

const ENSENADA = { latitude: 31.8667, longitude: -116.5964 };
const TECATE = { latitude: 32.5725, longitude: -116.6264 };

// Punto a `km` al norte (sobre un meridiano, 1° ≈ 111.195 km).
const alNorte = (p: typeof ENSENADA, km: number) => ({
  latitude: p.latitude + km / 111.195,
  longitude: p.longitude,
});

describe('pathToCoordinates (CA-2)', () => {
  it('convierte [longitud, latitud] a { latitude, longitude } en el mismo orden', () => {
    expect(
      pathToCoordinates([
        [-116.5964, 31.8667],
        [-116.59, 31.87],
      ])
    ).toEqual([
      { latitude: 31.8667, longitude: -116.5964 },
      { latitude: 31.87, longitude: -116.59 },
    ]);
  });

  it('un recorrido vacío da una lista vacía', () => {
    expect(pathToCoordinates([])).toEqual([]);
  });
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

describe('regionAround (CA-1, CA-10)', () => {
  it('centra en el punto y su alto cubre el diámetro del radio', () => {
    const r = regionAround(ENSENADA, 25);
    expect(r.latitude).toBe(ENSENADA.latitude);
    expect(r.longitude).toBe(ENSENADA.longitude);
    expect(r.latitudeDelta * 111.2).toBeCloseTo(50, 5);
    // En longitud los grados son más cortos: el delta crece con 1 / cos(latitud).
    expect(r.longitudeDelta).toBeGreaterThan(r.latitudeDelta);
  });
});

describe('constantes (CA-11, CA-14)', () => {
  it('radios de 5 a 100 km y 25 km por defecto', () => {
    expect(RADIUS_OPTIONS_KM).toEqual([5, 10, 25, 50, 100]);
    expect(RADIUS_OPTIONS_KM).toContain(DEFAULT_RADIUS_KM);
    expect(DEFAULT_RADIUS_KM).toBe(25);
  });

  it('la región de Baja California cubre Tijuana, Mexicali, el paralelo 28 y la costa del Golfo', () => {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = BAJA_CALIFORNIA_REGION;
    const dentro = (lat: number, lng: number) =>
      Math.abs(lat - latitude) <= latitudeDelta / 2 && Math.abs(lng - longitude) <= longitudeDelta / 2;
    expect(dentro(32.5149, -117.0382)).toBe(true); // Tijuana
    expect(dentro(32.6245, -115.4523)).toBe(true); // Mexicali
    expect(dentro(28.0, -114.8)).toBe(true); // límite con Baja California Sur
    expect(dentro(31.0447, -114.8389)).toBe(true); // San Felipe
    expect(dentro(28.95, -113.56)).toBe(true); // Bahía de los Ángeles
    expect(dentro(28.54, -114.09)).toBe(true); // inicio de La Otra Baja 100
  });
});

describe('regionForPath (spec 007, CA-10)', () => {
  const start = { latitude: 31.8, longitude: -116.6 };

  it('centra el recorrido y deja un margen de 25 % por lado', () => {
    const region = regionForPath(
      [
        [-116.6, 31.8],
        [-116.5, 31.9],
        [-116.55, 31.85],
      ],
      start
    );
    expect(region.latitude).toBeCloseTo(31.85);
    expect(region.longitude).toBeCloseTo(-116.55);
    expect(region.latitudeDelta).toBeCloseTo(0.15);
    expect(region.longitudeDelta).toBeCloseTo(0.15);
  });

  it('una ruta recta o muy corta tiene una región mínima', () => {
    const region = regionForPath(
      [
        [-116.6, 31.8],
        [-116.6, 31.8001],
      ],
      start
    );
    expect(region.latitudeDelta).toBe(0.005);
    expect(region.longitudeDelta).toBe(0.005);
  });

  it('sin recorrido, la región mínima alrededor del inicio', () => {
    expect(regionForPath([], start)).toEqual({
      latitude: 31.8,
      longitude: -116.6,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
  });
});
