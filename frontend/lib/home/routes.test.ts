import { describe, expect, it } from 'vitest';
import { HOME_NEARBY_LIMIT, HOME_NEARBY_RADIUS_KM, esSinConexion, homeRoutesStatus } from './routes';

describe('constantes de Inicio (spec 013, CA-9, P9)', () => {
  it('rutas cercanas: 25 km y hasta 5', () => {
    expect(HOME_NEARBY_RADIUS_KM).toBe(25);
    expect(HOME_NEARBY_LIMIT).toBe(5);
  });
});

describe('homeRoutesStatus (spec 013, CA-9 a CA-15, CA-22)', () => {
  it('cargando sin datos ni error', () => {
    expect(homeRoutesStatus({ data: undefined, isError: false })).toBe('loading');
  });

  it('con rutas, listo; sin rutas, vacío (CA-10, CA-15)', () => {
    expect(homeRoutesStatus({ data: { kind: 'ok', items: [1] }, isError: false })).toBe('ready');
    expect(homeRoutesStatus({ data: { kind: 'ok', items: [] }, isError: false })).toBe('empty');
  });

  it('sin conexión y sin permiso son estados propios, no errores (CA-11, CA-22)', () => {
    expect(homeRoutesStatus({ data: { kind: 'offline' }, isError: false })).toBe('offline');
    expect(homeRoutesStatus({ data: { kind: 'noPermission' }, isError: false })).toBe('noPermission');
  });

  it('un error del servidor sin datos es error', () => {
    expect(homeRoutesStatus({ data: undefined, isError: true })).toBe('error');
  });

  it('si una consulta repetida falla, se conserva lo que ya se veía', () => {
    expect(homeRoutesStatus({ data: { kind: 'ok', items: [1] }, isError: true })).toBe('ready');
  });
});

describe('esSinConexion', () => {
  it('sin respuesta del servidor es sin conexión; con estado HTTP, no', () => {
    expect(esSinConexion({ error: new TypeError('Network request failed') })).toBe(true);
    expect(esSinConexion({ status: 500 })).toBe(false);
  });
});
