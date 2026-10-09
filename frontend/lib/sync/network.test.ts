import { describe, expect, it } from 'vitest';
import { createReconnectDetector, hayConexion } from './network';

describe('hayConexion (spec 005, D2)', () => {
  it('con conexión e internet alcanzable', () => {
    expect(hayConexion({ isConnected: true, isInternetReachable: true })).toBe(true);
  });

  it('con conexión y alcance desconocido se intenta', () => {
    expect(hayConexion({ isConnected: true })).toBe(true);
    expect(hayConexion({ isConnected: true, isInternetReachable: null })).toBe(true);
  });

  it('sin conexión, o conectado a una red sin internet', () => {
    expect(hayConexion({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(hayConexion({ isConnected: true, isInternetReachable: false })).toBe(false);
    expect(hayConexion({})).toBe(false);
  });
});

describe('createReconnectDetector (spec 005, CA-1)', () => {
  const con = { isConnected: true, isInternetReachable: true };
  const sin = { isConnected: false, isInternetReachable: false };

  it('avisa solo al pasar de sin red a con red', () => {
    const detectar = createReconnectDetector();

    expect([sin, sin, con, con, sin, con].map(detectar)).toEqual([
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
  });

  it('el primer estado no dispara, aunque haya red', () => {
    expect(createReconnectDetector()(con)).toBe(false);
  });
});
