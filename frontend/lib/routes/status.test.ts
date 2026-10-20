import { describe, expect, it } from 'vitest';
import type { NearbyRoute, RouteDetail } from './api';
import {
  nearbyStatus,
  erroresDeCampo,
  mensajeDeFallo,
  routeDetailOutcome,
  routeDetailStatus,
  routeListStatus,
} from './status';

const base = { requested: true, isFetching: false, isError: false };
const conRutas = { offline: false as const, routes: [{ id: 'r-1' } as NearbyRoute] };

describe('nearbyStatus', () => {
  it('antes de la primera búsqueda es idle (CA-14)', () => {
    expect(nearbyStatus({ ...base, requested: false, data: undefined })).toBe('idle');
  });

  it('mientras busca es loading, aunque haya datos anteriores (CA-16)', () => {
    expect(nearbyStatus({ ...base, isFetching: true, data: conRutas })).toBe('loading');
  });

  it('un fallo de la petición es error (CA-16)', () => {
    expect(nearbyStatus({ ...base, isError: true, data: undefined })).toBe('error');
  });

  it('sin conexión es offline (CA-15)', () => {
    expect(nearbyStatus({ ...base, data: { offline: true } })).toBe('offline');
  });

  it('sin rutas es empty y con rutas success (CA-13)', () => {
    expect(nearbyStatus({ ...base, data: { offline: false, routes: [] } })).toBe('empty');
    expect(nearbyStatus({ ...base, data: conRutas })).toBe('success');
  });
});

describe('Detalle, listas y acciones de rutas (spec 007)', () => {
  const ruta = { id: 'r-1', name: 'Ruta' } as RouteDetail;
  const http = (status: number, message = 'Motivo', fieldErrors: Record<string, string> = {}) => ({
    status,
    apiError: { message, fieldErrors },
  });

  describe('routeDetailOutcome (CA-13, CA-14)', () => {
    it('una respuesta exitosa es la ruta', () => {
      expect(routeDetailOutcome({ ok: true, data: ruta })).toEqual({ kind: 'found', route: ruta });
    });

    it('un 404 es una ruta que ya no está disponible, no un error', () => {
      expect(routeDetailOutcome({ ok: false, failure: http(404) })).toEqual({
        kind: 'unavailable',
      });
    });

    it('cualquier otro fallo se lanza para que la query quede en error', () => {
      const sinRed = { error: new TypeError('Network request failed') };
      expect(() => routeDetailOutcome({ ok: false, failure: sinRed })).toThrow();
      expect(() => routeDetailOutcome({ ok: false, failure: http(500) })).toThrow();
    });
  });

  describe('routeDetailStatus', () => {
    const base = { isFetching: false, isError: false };

    it('cargando mientras pide, aunque haya datos de antes', () => {
      expect(
        routeDetailStatus({ ...base, isFetching: true, data: { kind: 'found', route: ruta } })
      ).toBe('loading');
    });

    it('distingue éxito, sin conexión y no disponible (CA-13, CA-14)', () => {
      expect(routeDetailStatus({ ...base, data: { kind: 'found', route: ruta } })).toBe('success');
      expect(routeDetailStatus({ ...base, data: { kind: 'offline' } })).toBe('offline');
      expect(routeDetailStatus({ ...base, data: { kind: 'unavailable' } })).toBe('unavailable');
    });

    it('un error o la falta de datos sin cargar es error, con "Reintentar" (CA-13)', () => {
      expect(routeDetailStatus({ ...base, isError: true, data: undefined })).toBe('error');
      expect(routeDetailStatus({ ...base, data: undefined })).toBe('error');
    });
  });

  describe('routeListStatus (CA-18, CA-21)', () => {
    const base = { isFetching: false, isError: false };

    it('lista con elementos, vacía, sin conexión, error y cargando', () => {
      expect(routeListStatus({ ...base, data: { offline: false, items: [1] } })).toBe('success');
      expect(routeListStatus({ ...base, data: { offline: false, items: [] } })).toBe('empty');
      expect(routeListStatus({ ...base, data: { offline: true } })).toBe('offline');
      expect(routeListStatus({ ...base, isError: true, data: undefined })).toBe('error');
      expect(routeListStatus({ ...base, isFetching: true, data: undefined })).toBe('loading');
    });
  });

  describe('mensajeDeFallo y erroresDeCampo (CA-5, CA-7)', () => {
    it('sin conexión explica que hace falta red', () => {
      expect(mensajeDeFallo({ offline: true })).toBe(
        'Esto necesita conexión a internet. Revisa tu conexión e inténtalo de nuevo.'
      );
    });

    it('un 409, 403 o 404 muestra el motivo del servidor', () => {
      expect(mensajeDeFallo(http(409, 'Esta actividad ya tiene una ruta publicada'))).toBe(
        'Esta actividad ya tiene una ruta publicada'
      );
      expect(mensajeDeFallo(http(403, 'Solo quien publicó esta ruta puede cambiarla'))).toBe(
        'Solo quien publicó esta ruta puede cambiarla'
      );
      expect(mensajeDeFallo(http(404, 'Esta ruta ya no está disponible'))).toBe(
        'Esta ruta ya no está disponible'
      );
    });

    it('un 400 sin campos muestra su motivo: actividad de menos de 1.5 km', () => {
      expect(mensajeDeFallo(http(400, 'Una ruta debe medir al menos 1.5 km'))).toBe(
        'Una ruta debe medir al menos 1.5 km'
      );
    });

    it('un 400 de validación deja los errores junto a cada campo', () => {
      const fallo = http(400, 'Datos inválidos', { name: 'El nombre es obligatorio' });
      expect(erroresDeCampo(fallo)).toEqual({ name: 'El nombre es obligatorio' });
      expect(mensajeDeFallo(fallo)).toBe('No se pudo completar. Inténtalo de nuevo.');
    });

    it('sin red, tiempo agotado, 5xx o 401 usan el mensaje genérico', () => {
      const generico = 'No se pudo completar. Inténtalo de nuevo.';
      expect(mensajeDeFallo({ error: new TypeError('Network request failed') })).toBe(generico);
      expect(mensajeDeFallo(http(500, 'Internal server error'))).toBe(generico);
      expect(mensajeDeFallo(http(401, 'Unauthorized'))).toBe(generico);
    });

    it('solo un 400 tiene errores por campo', () => {
      expect(erroresDeCampo({ offline: true })).toEqual({});
      expect(erroresDeCampo(http(409))).toEqual({});
      expect(erroresDeCampo({ error: new Error('x') })).toEqual({});
    });
  });
});
