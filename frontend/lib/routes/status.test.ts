import { describe, expect, it } from 'vitest';
import type { NearbyRoute } from './api';
import { nearbyStatus } from './status';

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
