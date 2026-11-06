import { describe, expect, it } from 'vitest';
import { computeDistance } from '../metrics/distance';
import { at, path } from '../metrics/testing';
import { computeTrack, createTrack } from './track';

const lines = (track: ReturnType<typeof createTrack>) => track.feature.geometry.coordinates;

describe('createTrack — trazo (spec 010, CA-4)', () => {
  it('sin puntos no hay trazo ni posición', () => {
    const track = createTrack();
    expect(lines(track)).toEqual([]);
    expect(track.position).toBeNull();
  });

  it('un solo punto da posición, pero todavía no una línea', () => {
    const p = at(0, 0);
    const track = computeTrack([p]);
    expect(lines(track)).toEqual([]);
    expect(track.position).toEqual([p.longitude, p.latitude]);
  });

  it('une los puntos en orden, con longitud antes que latitud (constitución 5.2)', () => {
    const a = at(0, 0, 5, 0);
    const b = at(10, 0, 5, 10);
    expect(lines(computeTrack([a, b]))).toEqual([
      [
        [a.longitude, a.latitude],
        [b.longitude, b.latitude],
      ],
    ]);
  });

  it('el trazo crece con cada punto y la posición es el último', () => {
    const points = path([[0, 0], [100, 0]], 10);
    const track = createTrack();
    points.forEach((p, i) => {
      track.add(p);
      if (i > 0) expect(lines(track)[0]).toHaveLength(i + 1);
      expect(track.position).toEqual([p.longitude, p.latitude]);
    });
  });

  it('el trazo entregado no cambia al agregar puntos después', () => {
    const track = createTrack();
    track.add(at(0, 0, 5, 0));
    track.add(at(10, 0, 5, 10));
    const antes = track.feature;
    track.add(at(20, 0, 5, 20));
    expect(antes.geometry.coordinates[0]).toHaveLength(2);
  });
});

describe('createTrack — mismas reglas que la distancia (spec 010, RN-3)', () => {
  it('descarta los puntos imprecisos y no mueve la posición', () => {
    const a = at(0, 0, 5, 0);
    const b = at(10, 0, 5, 10);
    const malo = at(500, 500, 21, 20);
    const track = computeTrack([a, b, malo]);
    expect(lines(track)[0]).toHaveLength(2);
    expect(track.position).toEqual([b.longitude, b.latitude]);
  });

  it('acepta un punto sin precisión, como la distancia', () => {
    expect(lines(computeTrack([at(0, 0, 5, 0), at(10, 0, null, 10)]))[0]).toHaveLength(2);
  });

  it('acepta justo la precisión máxima', () => {
    expect(lines(computeTrack([at(0, 0, 20, 0), at(10, 0, 20, 10)]))[0]).toHaveLength(2);
  });

  it('un salto de ubicación empieza un segmento nuevo y no une los dos lados', () => {
    const track = computeTrack([
      at(0, 0, 5, 0),
      at(10, 0, 5, 10),
      at(50_000, 0, 5, 20), // 50 km en 10 s
      at(50_010, 0, 5, 30),
    ]);
    expect(lines(track)).toHaveLength(2);
    expect(lines(track)[0]).toHaveLength(2);
    expect(lines(track)[1]).toHaveLength(2);
  });

  it('un punto aislado por dos saltos no se dibuja', () => {
    const track = computeTrack([
      at(0, 0, 5, 0),
      at(10, 0, 5, 10),
      at(50_000, 0, 5, 20),
      at(20, 0, 5, 30),
      at(30, 0, 5, 40),
    ]);
    expect(lines(track)).toHaveLength(2);
  });

  it('una bici rápida no cuenta como salto', () => {
    expect(lines(computeTrack(path([[0, 0], [0, 1000]], 100, 5, 25)))).toHaveLength(1);
  });

  it('con un salto, la distancia tampoco suma ese tramo', () => {
    const points = [...path([[0, 0], [500, 0]], 10), ...path([[50_000, 0], [50_500, 0]], 10)];
    expect(computeDistance(points)).toBeLessThan(2000);
  });
});
