import { describe, expect, it } from 'vitest';
import { pointFeature, routeLines, routeStarts, touchedRouteId } from './mapFeatures';

const A = {
  id: 'a',
  start: { latitude: 31.8667, longitude: -116.5964 },
  path: [
    [-116.5964, 31.8667],
    [-116.59, 31.87],
  ] as [number, number][],
};
const UN_PUNTO = { id: 'b', start: { latitude: 32, longitude: -116 }, path: [[-116, 32]] as [number, number][] };

describe('routeLines (spec 013, T9; spec 006, CA-2)', () => {
  it('una línea por ruta, con el recorrido en [lng, lat] y el id de la ruta', () => {
    expect(routeLines([A])).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 'a' },
          geometry: { type: 'LineString', coordinates: A.path },
        },
      ],
    });
  });

  it('deja fuera los recorridos de menos de dos puntos', () => {
    expect(routeLines([A, UN_PUNTO]).features.map((f) => f.properties.id)).toEqual(['a']);
  });
});

describe('routeStarts y pointFeature', () => {
  it('un punto por ruta en [lng, lat], también con un recorrido de un punto', () => {
    expect(routeStarts([A, UN_PUNTO]).features.map((f) => f.geometry.coordinates)).toEqual([
      [-116.5964, 31.8667],
      [-116, 32],
    ]);
  });

  it('pointFeature guarda el id', () => {
    expect(pointFeature('yo', { latitude: 1, longitude: 2 })).toEqual({
      type: 'Feature',
      properties: { id: 'yo' },
      geometry: { type: 'Point', coordinates: [2, 1] },
    });
  });
});

describe('touchedRouteId (spec 006, CA-8)', () => {
  it('devuelve el id del primer elemento que lo tiene', () => {
    expect(touchedRouteId([{ properties: {} }, { properties: { id: 'a' } }])).toBe('a');
  });

  it('sin elementos o sin id, null', () => {
    expect(touchedRouteId(undefined)).toBeNull();
    expect(touchedRouteId([])).toBeNull();
    expect(touchedRouteId([{ properties: null }, { properties: { id: 3 } }])).toBeNull();
  });
});
