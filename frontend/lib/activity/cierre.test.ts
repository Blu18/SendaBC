import { describe, expect, it, vi } from 'vitest';
import { guardarODescartar, type DepsCierre } from './cierre';

const FIN = '2026-11-22T10:05:00.000Z';

// Dependencias simuladas que anotan el orden de las llamadas.
function montar(validos = 0, cambios: Partial<DepsCierre> = {}) {
  const orden: string[] = [];
  const deps = {
    terminar: vi.fn(async () => void orden.push('terminar')),
    contarValidos: vi.fn(async () => {
      orden.push('contar');
      return validos;
    }),
    descartar: vi.fn(async () => {
      orden.push('descartar');
      return true;
    }),
    finalizar: vi.fn(async () => void orden.push('finalizar')),
    sincronizar: vi.fn(() => void orden.push('sincronizar')),
    registrar: vi.fn(),
    ...cambios,
  };
  return { deps, orden };
}

describe('guardarODescartar (spec 012)', () => {
  it('"Terminar sin guardar": termina la sesión y después descarta, sin métricas ni subida (CA-18, CA-19, CA-23)', async () => {
    const { deps, orden } = montar(5);

    expect(await guardarODescartar(7, FIN, 'descartar', deps)).toBe('descartada');

    expect(orden).toEqual(['terminar', 'descartar']);
    expect(deps.terminar).toHaveBeenCalledWith(7, FIN);
    expect(deps.descartar).toHaveBeenCalledWith(7);
  });

  it('"Detener" con 3 puntos válidos o más: guarda como hoy, sin contar (CA-20)', async () => {
    const { deps, orden } = montar(0);

    expect(await guardarODescartar(7, FIN, 'guardar', deps)).toBe('guardada');

    expect(orden).toEqual(['terminar', 'finalizar', 'sincronizar']);
  });

  it('al salir con menos de 3 puntos válidos: termina la sesión, cuenta y descarta (CA-21, D3)', async () => {
    const { deps, orden } = montar(2);

    expect(await guardarODescartar(7, FIN, 'contar', deps)).toBe('descartada');

    expect(orden).toEqual(['terminar', 'contar', 'descartar']);
  });

  it('al salir con 3 puntos válidos: calcula métricas y pide subirla (spec 003, CA-16)', async () => {
    const { deps, orden } = montar(3);

    expect(await guardarODescartar(7, FIN, 'contar', deps)).toBe('guardada');

    expect(orden).toEqual(['terminar', 'contar', 'finalizar', 'sincronizar']);
  });

  it('si la sesión no se pudo terminar, no descarta: los contactos no deben recibir un aviso falso (CA-23)', async () => {
    const { deps } = montar(0, {
      terminar: vi.fn(async () => {
        throw new Error('SQLite ocupado');
      }),
    });

    expect(await guardarODescartar(7, FIN, 'descartar', deps)).toBe('guardada');

    expect(deps.descartar).not.toHaveBeenCalled();
    expect(deps.finalizar).toHaveBeenCalledWith(7);
    expect(deps.registrar).toHaveBeenCalled();
  });

  it('si discardActivity no la borra (ya tenía server_id), la guarda como siempre (plan R3)', async () => {
    const { deps, orden } = montar(0, {
      descartar: vi.fn(async () => {
        orden.push('descartar');
        return false;
      }),
    });

    expect(await guardarODescartar(7, FIN, 'contar', deps)).toBe('guardada');

    expect(orden).toEqual(['terminar', 'contar', 'descartar', 'finalizar', 'sincronizar']);
  });

  it('un fallo al contar o al borrar no pierde la actividad: se guarda (RN-4)', async () => {
    const { deps } = montar(0, {
      contarValidos: vi.fn(async () => {
        throw new Error('SQLite ocupado');
      }),
    });

    expect(await guardarODescartar(7, FIN, 'contar', deps)).toBe('guardada');
    expect(deps.finalizar).toHaveBeenCalled();
  });

  it('un fallo de las métricas no impide pedir la subida (spec 004, CA-19)', async () => {
    const { deps } = montar(3, {
      finalizar: vi.fn(async () => {
        throw new Error('sin puntos');
      }),
    });

    expect(await guardarODescartar(7, FIN, 'guardar', deps)).toBe('guardada');
    expect(deps.sincronizar).toHaveBeenCalled();
  });
});
