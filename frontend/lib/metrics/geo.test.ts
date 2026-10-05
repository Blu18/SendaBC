import { describe, expect, it } from 'vitest';
import { EARTH_RADIUS_M, haversineMeters } from './geo';

// Longitud de un arco de `degrees` grados sobre un círculo máximo.
const arc = (degrees: number) => (degrees * Math.PI * EARTH_RADIUS_M) / 180;

describe('haversineMeters', () => {
  it('es 0 entre un punto y sí mismo', () => {
    const p = { latitude: 32.5149, longitude: -117.0382 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('un grado de latitud sobre un meridiano mide ~111.195 km (radio 6 371 008.8 m)', () => {
    const d = haversineMeters({ latitude: 31, longitude: -116 }, { latitude: 32, longitude: -116 });
    expect(d).toBeCloseTo(arc(1), 3);
    expect(d).toBeCloseTo(111_195.08, 1);
  });

  it('un cuarto del ecuador mide un cuarto de la circunferencia', () => {
    const d = haversineMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 90 });
    expect(d).toBeCloseTo(arc(90), 3);
  });

  it('entre polos mide media circunferencia', () => {
    const d = haversineMeters({ latitude: 90, longitude: 0 }, { latitude: -90, longitude: 0 });
    expect(d).toBeCloseTo(arc(180), 3);
  });

  it('un paso corto en longitud a la latitud de Ensenada coincide con arco × cos(lat) (≤ 1 %, CA-7)', () => {
    const lat = 31.87;
    const d = haversineMeters({ latitude: lat, longitude: -116.6 }, { latitude: lat, longitude: -116.599 });
    const expected = arc(0.001) * Math.cos((lat * Math.PI) / 180); // ≈ 94.4 m
    expect(Math.abs(d - expected) / expected).toBeLessThan(0.01);
  });

  it('es simétrica', () => {
    const a = { latitude: 32.5149, longitude: -117.0382 }; // Tijuana
    const b = { latitude: 31.8667, longitude: -116.5964 }; // Ensenada
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});
