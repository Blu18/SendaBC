import { describe, expect, it, vi } from 'vitest';
import type { NearbyRoute, RouteDetail } from './api';
import { consultarConRespaldo, consultarDetalle, guardadasDelTipo, guardadasFueraDeVista } from './offline';

const savedAt = '2026-11-08T19:30:00.000Z';
const sinRed = { error: new TypeError('Network request failed') };

// Dobles de la petición y de lo guardado, para ver qué se llama.
function dobles<T>(o: {
  respuesta?: { ok: true; data: T } | { ok: false; failure: { status: number } | { error: unknown } };
  guardado?: { data: T; savedAt: string } | null;
}) {
  return {
    pedir: vi.fn(async () => o.respuesta ?? { ok: false as const, failure: sinRed }),
    leer: vi.fn(async () => o.guardado ?? null),
    guardar: vi.fn(async (_data: T) => {}),
  };
}

describe('consultarConRespaldo (spec 011, CA-53 a CA-59; plan, D3)', () => {
  it('sin conexión no hace la petición y devuelve lo guardado (CA-53)', async () => {
    const d = dobles({ guardado: { data: [1], savedAt } });

    expect(await consultarConRespaldo({ conectado: false, ...d })).toEqual({
      offline: true,
      saved: { data: [1], savedAt },
    });
    expect(d.pedir).not.toHaveBeenCalled();
    expect(d.guardar).not.toHaveBeenCalled();
  });

  it('sin conexión y sin nada guardado devuelve offline sin datos (CA-54, CA-57)', async () => {
    const d = dobles<number[]>({});

    expect(await consultarConRespaldo({ conectado: false, ...d })).toEqual({ offline: true });
    expect(d.pedir).not.toHaveBeenCalled();
  });

  it('con respuesta exitosa la guarda y la devuelve, aunque hubiera algo guardado (CA-59)', async () => {
    const d = dobles({ respuesta: { ok: true, data: [2] }, guardado: { data: [1], savedAt } });

    expect(await consultarConRespaldo({ conectado: true, ...d })).toEqual({ offline: false, data: [2] });
    expect(d.guardar).toHaveBeenCalledWith([2]);
    expect(d.leer).not.toHaveBeenCalled();
  });

  it('si guardar falla, igual devuelve la respuesta', async () => {
    const d = dobles({ respuesta: { ok: true, data: [2] } });
    d.guardar.mockRejectedValueOnce(new Error('database is locked'));

    expect(await consultarConRespaldo({ conectado: true, ...d })).toEqual({ offline: false, data: [2] });
  });

  it('si la petición no llegó al servidor usa lo guardado (D3)', async () => {
    const d = dobles({ respuesta: { ok: false, failure: sinRed }, guardado: { data: [1], savedAt } });

    expect(await consultarConRespaldo({ conectado: true, ...d })).toEqual({
      offline: true,
      saved: { data: [1], savedAt },
    });
  });

  it('si no llegó y no hay nada guardado, lanza el fallo para reintentar', async () => {
    const d = dobles<number[]>({ respuesta: { ok: false, failure: sinRed } });

    await expect(consultarConRespaldo({ conectado: true, ...d })).rejects.toBe(sinRed);
  });

  it('un 5xx sigue siendo error aunque haya algo guardado (D3)', async () => {
    const fallo = { status: 503 };
    const d = dobles({ respuesta: { ok: false, failure: fallo }, guardado: { data: [1], savedAt } });

    await expect(consultarConRespaldo({ conectado: true, ...d })).rejects.toBe(fallo);
    expect(d.leer).not.toHaveBeenCalled();
  });

  it('si leer lo guardado falla, es como no tener nada', async () => {
    const d = dobles<number[]>({});
    d.leer.mockRejectedValueOnce(new Error('no such table'));

    expect(await consultarConRespaldo({ conectado: false, ...d })).toEqual({ offline: true });
  });
});

const ruta = (id: string, type: NearbyRoute['type'], latitude: number, longitude: number) =>
  ({ id, type, start: { latitude, longitude } }) as NearbyRoute;

describe('guardadasDelTipo', () => {
  const rutas = [ruta('a', 'HIKING', 32, -116), ruta('b', 'CYCLING', 32, -116)];

  it('con "Todas" devuelve todas', () => {
    expect(guardadasDelTipo(rutas, null)).toEqual(rutas);
  });

  it('con un tipo devuelve solo las de ese tipo, o ninguna', () => {
    expect(guardadasDelTipo(rutas, 'CYCLING').map((r) => r.id)).toEqual(['b']);
    expect(guardadasDelTipo(rutas, 'TRAIL_RUNNING')).toEqual([]);
  });
});

describe('guardadasFueraDeVista (CA-53)', () => {
  const tijuana = { latitude: 32.52, longitude: -117.03 };

  it('si alguna ruta empieza dentro del radio, no hay que mover el mapa', () => {
    const rutas = [ruta('cerca', 'HIKING', 32.53, -117.02), ruta('lejos', 'HIKING', 31.0, -115.5)];
    expect(guardadasFueraDeVista(rutas, tijuana, 25)).toBe(false);
  });

  it('si todas empiezan fuera del radio, sí', () => {
    // Sierra de San Pedro Mártir, a más de 200 km
    expect(guardadasFueraDeVista([ruta('lejos', 'HIKING', 31.0, -115.5)], tijuana, 25)).toBe(true);
  });

  it('sin rutas no hay a dónde moverlo', () => {
    expect(guardadasFueraDeVista([], tijuana, 25)).toBe(false);
  });
});

describe('consultarDetalle (CA-55, CA-57, CA-59)', () => {
  const detalle = { id: 'r-1', name: 'Ruta' } as RouteDetail;

  function detalleDobles(o: Parameters<typeof dobles<RouteDetail>>[0]) {
    return { ...dobles<RouteDetail>(o), borrar: vi.fn(async () => {}) };
  }

  it('con respuesta exitosa la guarda y es found', async () => {
    const d = detalleDobles({ respuesta: { ok: true, data: detalle } });

    expect(await consultarDetalle({ conectado: true, ...d })).toEqual({ kind: 'found', route: detalle });
    expect(d.guardar).toHaveBeenCalledWith(detalle);
  });

  it('sin conexión, con el detalle guardado, es saved con su fecha (CA-55)', async () => {
    const d = detalleDobles({ guardado: { data: detalle, savedAt } });

    expect(await consultarDetalle({ conectado: false, ...d })).toEqual({
      kind: 'saved',
      route: detalle,
      savedAt,
    });
    expect(d.pedir).not.toHaveBeenCalled();
  });

  it('sin conexión y sin detalle guardado es offline (CA-57)', async () => {
    const d = detalleDobles({});

    expect(await consultarDetalle({ conectado: false, ...d })).toEqual({ kind: 'offline' });
  });

  it('si la petición no llegó al servidor usa el guardado (D3)', async () => {
    const d = detalleDobles({ respuesta: { ok: false, failure: sinRed }, guardado: { data: detalle, savedAt } });

    expect((await consultarDetalle({ conectado: true, ...d })).kind).toBe('saved');
  });

  it('un 404 borra el guardado y es unavailable (CA-59)', async () => {
    const d = detalleDobles({ respuesta: { ok: false, failure: { status: 404 } }, guardado: { data: detalle, savedAt } });

    expect(await consultarDetalle({ conectado: true, ...d })).toEqual({ kind: 'unavailable' });
    expect(d.borrar).toHaveBeenCalled();
  });

  it('si borrar falla, igual es unavailable', async () => {
    const d = detalleDobles({ respuesta: { ok: false, failure: { status: 404 } } });
    d.borrar.mockRejectedValueOnce(new Error('database is locked'));

    expect(await consultarDetalle({ conectado: true, ...d })).toEqual({ kind: 'unavailable' });
  });

  it('un 5xx, o no llegar sin nada guardado, lanza el fallo para reintentar sin borrar', async () => {
    const d5 = detalleDobles({ respuesta: { ok: false, failure: { status: 500 } }, guardado: { data: detalle, savedAt } });
    await expect(consultarDetalle({ conectado: true, ...d5 })).rejects.toEqual({ status: 500 });
    expect(d5.borrar).not.toHaveBeenCalled();

    const dRed = detalleDobles({ respuesta: { ok: false, failure: sinRed } });
    await expect(consultarDetalle({ conectado: true, ...dRed })).rejects.toBe(sinRed);
  });
});
