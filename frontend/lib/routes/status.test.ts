import { describe, expect, it } from 'vitest';
import type { NearbyRoute, RouteDetail } from './api';
import {
  avisoDeGuardado,
  detalleSinConexion,
  nearbyStatus,
  noLlegoAlServidor,
  sinConexion,
  erroresDeCampo,
  mensajeDeFallo,
  ROUTE_ACTION_MESSAGES,
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

  describe('routeDetailStatus', () => {
    const base = { isFetching: false, isError: false };

    it('cargando mientras pide la primera vez o al reintentar sin conexión', () => {
      expect(routeDetailStatus({ ...base, isFetching: true, data: undefined })).toBe('loading');
      expect(routeDetailStatus({ ...base, isFetching: true, data: { kind: 'offline' } })).toBe(
        'loading'
      );
    });

    it('con la ruta ya cargada, refrescar no vuelve a "cargando"', () => {
      expect(
        routeDetailStatus({ ...base, isFetching: true, data: { kind: 'found', route: ruta } })
      ).toBe('success');
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

    it('una lista ya cargada se sigue mostrando mientras se refresca', () => {
      expect(
        routeListStatus({ ...base, isFetching: true, data: { offline: false, items: [1] } })
      ).toBe('success');
      expect(routeListStatus({ ...base, isFetching: true, data: { offline: true } })).toBe(
        'loading'
      );
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

    it('un 503 dice que el servicio no está disponible, no que falta internet (spec 011, CA-14)', () => {
      const noDisponible = 'El servicio no está disponible. Inténtalo de nuevo en unos minutos.';
      // Con el cuerpo del backend y sin él (p. ej. un 503 del túnel).
      expect(mensajeDeFallo(http(503, noDisponible))).toBe(noDisponible);
      expect(mensajeDeFallo(http(503, 'No se pudo completar la acción'))).toBe(noDisponible);
      expect(mensajeDeFallo(http(503, noDisponible))).not.toBe(ROUTE_ACTION_MESSAGES.offline);
    });

    it('solo un 400 tiene errores por campo', () => {
      expect(erroresDeCampo({ offline: true })).toEqual({});
      expect(erroresDeCampo(http(409))).toEqual({});
      expect(erroresDeCampo({ error: new Error('x') })).toEqual({});
    });
  });
});

describe('Datos guardados sin conexión (spec 011)', () => {
  const ruta = { id: 'r-1', name: 'Ruta' } as RouteDetail;
  const savedAt = '2026-11-08T19:30:00.000Z';
  const rutas = [{ id: 'r-1' } as NearbyRoute];

  describe('noLlegoAlServidor (plan, D3)', () => {
    it('sin red o tiempo agotado no llegó; cualquier respuesta, incluido un 5xx, sí', () => {
      expect(noLlegoAlServidor({ error: new TypeError('Network request failed') })).toBe(true);
      expect(noLlegoAlServidor({ status: 500 })).toBe(false);
      expect(noLlegoAlServidor({ status: 404 })).toBe(false);
    });
  });

  describe('sinConexion y nearbyStatus (CA-53, CA-54)', () => {
    const base = { requested: true, isFetching: false, isError: false };

    it('con la última búsqueda guardada es saved', () => {
      const data = sinConexion({ data: rutas, savedAt });
      expect(data).toEqual({ offline: true, saved: { data: rutas, savedAt } });
      expect(nearbyStatus({ ...base, data })).toBe('saved');
    });

    it('una búsqueda guardada sin resultados también es saved', () => {
      expect(nearbyStatus({ ...base, data: sinConexion({ data: [], savedAt }) })).toBe('saved');
    });

    it('sin nada guardado es offline, el mensaje de que necesita internet (CA-54)', () => {
      const data = sinConexion<NearbyRoute[]>(null);
      expect(data).toEqual({ offline: true });
      expect(nearbyStatus({ ...base, data })).toBe('offline');
    });

    it('una búsqueda nueva sigue mostrando "cargando" (spec 006, CA-16)', () => {
      expect(nearbyStatus({ ...base, isFetching: true, data: sinConexion({ data: rutas, savedAt }) })).toBe(
        'loading'
      );
    });
  });

  describe('detalleSinConexion y routeDetailStatus (CA-55, CA-57)', () => {
    const base = { isFetching: false, isError: false };

    it('con el detalle guardado es saved, con la ruta y su fecha', () => {
      const data = detalleSinConexion({ data: ruta, savedAt });
      expect(data).toEqual({ kind: 'saved', route: ruta, savedAt });
      expect(routeDetailStatus({ ...base, data })).toBe('saved');
    });

    it('sin detalle guardado es offline y no se queda cargando (CA-57)', () => {
      const data = detalleSinConexion(null);
      expect(data).toEqual({ kind: 'offline' });
      expect(routeDetailStatus({ ...base, data })).toBe('offline');
    });

    it('la ruta guardada se sigue mostrando mientras se reintenta', () => {
      expect(
        routeDetailStatus({ ...base, isFetching: true, data: detalleSinConexion({ data: ruta, savedAt }) })
      ).toBe('saved');
    });
  });

  describe('routeListStatus con favoritas guardadas (CA-56)', () => {
    const base = { isFetching: false, isError: false };

    it('con la lista guardada es saved, aunque esté vacía', () => {
      expect(routeListStatus({ ...base, data: sinConexion({ data: [1], savedAt }) })).toBe('saved');
      expect(routeListStatus({ ...base, data: sinConexion({ data: [], savedAt }) })).toBe('saved');
    });

    it('sin lista guardada es offline', () => {
      expect(routeListStatus({ ...base, data: sinConexion<number[]>(null) })).toBe('offline');
    });

    it('la lista guardada se sigue mostrando mientras se refresca', () => {
      expect(
        routeListStatus({ ...base, isFetching: true, data: sinConexion({ data: [1], savedAt }) })
      ).toBe('saved');
    });
  });

  describe('avisoDeGuardado (CA-53, CA-55)', () => {
    it('dice que son datos guardados y de cuándo son', () => {
      const fecha = new Date(savedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
      expect(avisoDeGuardado(savedAt)).toBe(`Sin conexión no se pueden actualizar. Son del ${fecha}`);
      expect(avisoDeGuardado(savedAt)).toMatch(/2026/);
    });

    it('no deja un punto doble después de "p.m." (M12)', () => {
      expect(avisoDeGuardado(savedAt)).not.toMatch(/\.\./);
    });
  });
});
