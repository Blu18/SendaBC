import { describe, expect, it } from 'vitest';
import type { ActivityPointInput } from '../db/activities';
import { at } from '../metrics/testing';
import { createLiveMap } from './liveMap';

const punto = (sequence: number, east: number, north: number, accuracy = 5): ActivityPointInput => ({
  ...at(east, north, accuracy, sequence * 10),
  altitude: null,
  sequence,
});

describe('createLiveMap (spec 010, CA-2 a CA-4, CA-7)', () => {
  it('sin puntos no hay nada que mostrar', () => {
    expect(createLiveMap().snapshot).toEqual({
      track: { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: [] } },
      position: null,
      heading: null,
    });
  });

  it('reconstruye trazo, posición y rumbo con los puntos guardados', () => {
    const ultimo = punto(3, 0, 40);
    const { snapshot } = createLiveMap([punto(1, 0, 0), punto(2, 0, 20), ultimo]);
    expect(snapshot.track.geometry.coordinates[0]).toHaveLength(3);
    expect(snapshot.position).toEqual([ultimo.longitude, ultimo.latitude]);
    expect(snapshot.heading).toBeCloseTo(0, 0);
  });

  it('agrega los puntos que van llegando', () => {
    const live = createLiveMap([punto(1, 0, 0)]);
    expect(live.add(punto(2, 20, 0))).toBe(true);
    expect(live.snapshot.track.geometry.coordinates[0]).toHaveLength(2);
    expect(live.snapshot.heading).toBeCloseTo(90, 0);
  });

  it('no cuenta dos veces un punto ya guardado', () => {
    const live = createLiveMap([punto(1, 0, 0), punto(2, 0, 20)]);
    expect(live.add(punto(2, 0, 20))).toBe(false);
    expect(live.add(punto(1, 0, 0))).toBe(false);
    expect(live.snapshot.track.geometry.coordinates[0]).toHaveLength(2);
  });

  it('acepta un hueco en la secuencia (spec 003, CA-6)', () => {
    const live = createLiveMap([punto(1, 0, 0)]);
    expect(live.add(punto(4, 0, 20))).toBe(true);
  });

  it('un punto impreciso avanza la secuencia sin dibujarse', () => {
    const live = createLiveMap([punto(1, 0, 0), punto(2, 0, 20)]);
    expect(live.add(punto(3, 500, 500, 30))).toBe(true);
    expect(live.snapshot.track.geometry.coordinates[0]).toHaveLength(2);
  });
});
