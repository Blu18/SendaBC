import { describe, expect, it } from 'vitest';
import {
  THUMBNAIL_MARGIN,
  THUMBNAIL_MAX_POINTS,
  THUMBNAIL_MAX_ZOOM,
  activityThumbnailPath,
  frameThumbnail,
  simplifyPoints,
  staticMapUrl,
} from './thumbnail';
import type { LngLat } from './track';

// Coordenadas del trazo en el texto "M x y L x y …".
const puntosDe = (svgPath: string) =>
  svgPath
    .split(/[ML]/)
    .filter(Boolean)
    .map((p) => p.trim().split(' ').map(Number));

// Un recorrido en diagonal de ~3 km cerca de Ensenada.
const DIAGONAL: LngLat[] = [
  [-116.62, 31.85],
  [-116.61, 31.86],
  [-116.6, 31.87],
];

describe('simplifyPoints', () => {
  it('deja igual un recorrido corto', () => {
    expect(simplifyPoints([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('reduce a 200 puntos repartidos, con el primero y el último', () => {
    const largo = Array.from({ length: 5400 }, (_, i) => i);
    const r = simplifyPoints(largo);
    expect(r).toHaveLength(THUMBNAIL_MAX_POINTS);
    expect(r[0]).toBe(0);
    expect(r.at(-1)).toBe(5399);
    expect(r).toEqual([...r].sort((a, b) => a - b));
  });
});

describe('frameThumbnail (spec 013, CA-3, CA-8)', () => {
  it('sin puntos no hay miniatura', () => {
    expect(frameThumbnail([], 88, 88)).toBeNull();
  });

  it('el recorrido queda dentro de la miniatura, con margen y centrado', () => {
    const t = frameThumbnail(DIAGONAL, 88, 88)!;
    const pts = puntosDe(t.svgPath);
    expect(pts).toHaveLength(3);
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(88 * THUMBNAIL_MARGIN - 1);
      expect(x).toBeLessThanOrEqual(88 * (1 - THUMBNAIL_MARGIN) + 1);
      expect(y).toBeGreaterThanOrEqual(88 * THUMBNAIL_MARGIN - 1);
      expect(y).toBeLessThanOrEqual(88 * (1 - THUMBNAIL_MARGIN) + 1);
    }
    // El punto del medio está en el centro de la imagen.
    expect(pts[1][0]).toBeCloseTo(44, 0);
    expect(pts[1][1]).toBeCloseTo(44, 0);
    // El centro es el del recorrido.
    expect(t.center[0]).toBeCloseTo(-116.61, 4);
    expect(t.center[1]).toBeCloseTo(31.86, 2);
  });

  it('el norte queda arriba: el punto más al norte tiene la y más chica', () => {
    const pts = puntosDe(frameThumbnail(DIAGONAL, 88, 88)!.svgPath);
    expect(pts[2][1]).toBeLessThan(pts[0][1]);
    expect(pts[2][0]).toBeGreaterThan(pts[0][0]);
  });

  it('un recorrido largo usa menos zoom que uno corto, y en una tarjeta ancha el lado largo manda', () => {
    const corto = frameThumbnail(DIAGONAL, 88, 88)!;
    const largo = frameThumbnail(
      [
        [-117, 31.5],
        [-116.2, 32.2],
      ],
      88,
      88
    )!;
    expect(largo.zoom).toBeLessThan(corto.zoom);
    const ancha = frameThumbnail(DIAGONAL, 232, 112)!;
    const pts = puntosDe(ancha.svgPath);
    for (const [x, y] of pts) {
      expect(x).toBeLessThanOrEqual(232);
      expect(y).toBeLessThanOrEqual(112 * (1 - THUMBNAIL_MARGIN) + 1);
    }
  });

  it('un solo punto o un recorrido recto no pasan del zoom máximo', () => {
    const uno = frameThumbnail([[-116.6, 31.86]], 88, 88)!;
    expect(uno.zoom).toBe(THUMBNAIL_MAX_ZOOM);
    expect(puntosDe(uno.svgPath)).toEqual([[44, 44]]);
    const recto = frameThumbnail(
      [
        [-116.6, 31.86],
        [-116.6, 31.8601],
      ],
      88,
      88
    )!;
    expect(recto.zoom).toBeLessThanOrEqual(THUMBNAIL_MAX_ZOOM);
  });

  it('el zoom va redondeado a centésimas, como en la URL', () => {
    const { zoom } = frameThumbnail(DIAGONAL, 88, 88)!;
    expect(Math.round(zoom * 100) / 100).toBe(zoom);
  });
});

describe('staticMapUrl (spec 013, plan D3)', () => {
  const base = { center: [-116.61, 31.86] as LngLat, zoom: 12.34, width: 88, height: 88, token: 'pk.prueba' };

  it('estilo del tema, centro, zoom y tamaño al doble de resolución, sin logo ni atribución', () => {
    expect(staticMapUrl({ ...base, scheme: 'light' })).toBe(
      'https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/-116.61000,31.86000,12.34/88x88@2x?access_token=pk.prueba&logo=false&attribution=false'
    );
    expect(staticMapUrl({ ...base, scheme: 'dark' })).toContain('/mapbox/dark-v11/static/');
  });

  it('no lleva el recorrido: ni path ni geojson en la URL', () => {
    const url = staticMapUrl({ ...base, scheme: 'light' });
    expect(url).not.toMatch(/path-|geojson|polyline/);
  });

  it('el mismo encuadre da la misma URL (caché)', () => {
    expect(staticMapUrl({ ...base, scheme: 'light' })).toBe(
      staticMapUrl({ ...base, center: [-116.610001, 31.860001], scheme: 'light' })
    );
  });
});

describe('activityThumbnailPath (spec 013, CA-3)', () => {
  const punto = (i: number, accuracy: number | null) => ({
    latitude: 31.86 + i * 0.0001,
    longitude: -116.6 + i * 0.0001,
    accuracy,
    recordedAt: new Date(Date.UTC(2026, 10, 19, 10, 0, i * 5)).toISOString(),
  });

  it('deja fuera los puntos imprecisos, como el mapa de la grabación', () => {
    const camino = activityThumbnailPath([punto(0, 5), punto(1, 500), punto(2, 5), punto(3, 5)]);
    expect(camino).toHaveLength(3);
    expect(camino[0]).toEqual([-116.6, 31.86]);
  });

  it('si ningún punto alcanza la precisión, usa todos', () => {
    expect(activityThumbnailPath([punto(0, 500), punto(1, 500)])).toHaveLength(2);
  });

  it('sin puntos, un camino vacío', () => {
    expect(activityThumbnailPath([])).toEqual([]);
  });
});
