import {
  debeReenviar,
  distanciaMetros,
  REENVIO_CADA_MS,
  type Punto,
} from './forwarding.js';

const BASE: Punto = { lat: 32.0471, lng: -115.4614 };
const T0 = new Date('2026-10-22T16:00:00Z');
const despues = (ms: number) => new Date(T0.getTime() + ms);
// ~1 m de latitud.
const metrosAlNorte = (m: number): Punto => ({
  lat: BASE.lat + m / 111_195,
  lng: BASE.lng,
});

describe('distanciaMetros', () => {
  it('mide en metros', () => {
    expect(distanciaMetros(BASE, BASE)).toBe(0);
    expect(distanciaMetros(BASE, metrosAlNorte(200))).toBeCloseTo(200, 0);
    // Ensenada – Tijuana, ~ 85 km en línea recta.
    expect(
      distanciaMetros(
        { lat: 31.8667, lng: -116.5964 },
        { lat: 32.5149, lng: -117.0382 },
      ) / 1000,
    ).toBeCloseTo(83, -1);
  });
});

describe('debeReenviar (spec 008, RN-11)', () => {
  const ultimo = { at: T0, punto: BASE };

  it('a los 15 min reenvía aunque no se haya movido', () => {
    expect(
      debeReenviar(ultimo, {
        at: despues(REENVIO_CADA_MS - 1000),
        punto: BASE,
      }),
    ).toBe(false);
    expect(
      debeReenviar(ultimo, { at: despues(REENVIO_CADA_MS), punto: BASE }),
    ).toBe(true);
  });

  it('a más de 200 m reenvía antes de los 15 min', () => {
    expect(
      debeReenviar(ultimo, { at: despues(60_000), punto: metrosAlNorte(195) }),
    ).toBe(false);
    expect(
      debeReenviar(ultimo, { at: despues(60_000), punto: metrosAlNorte(205) }),
    ).toBe(true);
  });

  it('una ubicación atrasada o igual de vieja no se reenvía', () => {
    expect(debeReenviar(ultimo, { at: T0, punto: metrosAlNorte(500) })).toBe(
      false,
    );
    expect(
      debeReenviar(ultimo, { at: despues(-60_000), punto: metrosAlNorte(500) }),
    ).toBe(false);
  });

  it('si la alerta salió sin ubicación, reenvía la primera que llegue', () => {
    expect(
      debeReenviar({ at: T0, punto: null }, { at: despues(1000), punto: BASE }),
    ).toBe(true);
    expect(
      debeReenviar({ at: null, punto: null }, { at: T0, punto: BASE }),
    ).toBe(true);
  });
});
