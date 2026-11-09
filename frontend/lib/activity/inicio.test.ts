import { describe, expect, it, vi } from 'vitest';
import { cierrePendiente, iniciarOLimpiar } from './inicio';

// Spec 003, CA-16: un inicio fallido avisa y no deja nada a medias.
describe('iniciarOLimpiar', () => {
  it('si inicia, no limpia', async () => {
    const limpiar = vi.fn();
    const resultado = await iniciarOLimpiar(async () => {}, limpiar);
    expect(resultado).toEqual({ ok: true });
    expect(limpiar).not.toHaveBeenCalled();
  });

  it('si falla, limpia y devuelve el error', async () => {
    const error = new Error('database is locked');
    const limpiar = vi.fn();
    const resultado = await iniciarOLimpiar(async () => {
      throw error;
    }, limpiar);
    expect(resultado).toEqual({ ok: false, error });
    expect(limpiar).toHaveBeenCalledOnce();
  });

  it('espera a que termine la limpieza', async () => {
    const orden: string[] = [];
    await iniciarOLimpiar(
      async () => {
        throw new Error('x');
      },
      async () => {
        await Promise.resolve();
        orden.push('limpia');
      }
    );
    orden.push('después');
    expect(orden).toEqual(['limpia', 'después']);
  });

  it('un fallo de la limpieza no tapa el error original ni se escapa', async () => {
    const original = new Error('createActivity');
    const registrar = vi.fn();
    const resultado = await iniciarOLimpiar(
      async () => {
        throw original;
      },
      () => {
        throw new Error('limpieza');
      },
      registrar
    );
    expect(resultado).toEqual({ ok: false, error: original });
    expect(registrar).toHaveBeenCalledOnce();
  });
});

describe('cierrePendiente', () => {
  it('sin actividad creada no hay nada que cerrar', () => {
    expect(cierrePendiente(null, null, '2026-11-09T10:00:00.000Z')).toBeNull();
  });

  it('cierra con la hora del último punto (CA-10)', () => {
    expect(cierrePendiente(3, '2026-11-09T10:05:00.000Z', '2026-11-09T10:00:00.000Z')).toEqual({
      id: 3,
      endedAt: '2026-11-09T10:05:00.000Z',
    });
  });

  it('sin puntos, cierra con la hora de inicio (CA-10)', () => {
    expect(cierrePendiente(3, null, '2026-11-09T10:00:00.000Z')).toEqual({
      id: 3,
      endedAt: '2026-11-09T10:00:00.000Z',
    });
  });
});
