import { describe, expect, it } from 'vitest';
import { localMapStyle, mapStyle } from './style';

describe('mapStyle (spec 010, CA-9, D7)', () => {
  it('modo claro: Outdoors, que ya trae sombreado', () => {
    expect(mapStyle('light')).toEqual({ styleURL: 'mapbox://styles/mapbox/outdoors-v12', hillshade: null });
  });

  it('modo oscuro: Dark, con sombreado propio para distinguir el relieve', () => {
    const { styleURL, hillshade } = mapStyle('dark');
    expect(styleURL).toBe('mapbox://styles/mapbox/dark-v11');
    expect(hillshade).not.toBeNull();
  });
});

describe('localMapStyle (spec 010, CA-15)', () => {
  it('no pide nada a la red: solo un fondo del color dado', () => {
    const style = JSON.parse(localMapStyle('#ECE9E0'));
    expect(style.sources).toEqual({});
    expect(style.layers).toEqual([
      { id: 'fondo', type: 'background', paint: { 'background-color': '#ECE9E0' } },
    ]);
  });
});
