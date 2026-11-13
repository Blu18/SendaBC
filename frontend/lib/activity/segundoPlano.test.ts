import { describe, expect, it, vi } from 'vitest';
import { decidirSegundoPlano } from './segundoPlano';

// Spec 008, CA-10; spec 011, F2: en la prueba de campo los dos teléfonos tenían el permiso negado
// y "no volver a preguntar", y la app grabó con la pantalla encendida sin que se notara.

const deps = (granted: boolean, canAskAgain: boolean, extra = {}) => ({
  permiso: vi.fn(async () => ({ granted, canAskAgain })),
  pedir: vi.fn(async () => ({ granted: true })),
  explicar: vi.fn(async () => true),
  avisarSinPermiso: vi.fn(async () => true),
  ...extra,
});

describe('decidirSegundoPlano (spec 008, CA-10)', () => {
  it('con el permiso concedido graba en segundo plano sin preguntar', async () => {
    const d = deps(true, true);
    expect(await decidirSegundoPlano(d)).toBe('background');
    expect(d.explicar).not.toHaveBeenCalled();
    expect(d.avisarSinPermiso).not.toHaveBeenCalled();
  });

  it('sin contactos (sin explicar) no pide nada y graba con la pantalla encendida', async () => {
    const d = deps(false, false, { explicar: undefined });
    expect(await decidirSegundoPlano(d)).toBe('foreground');
    expect(d.pedir).not.toHaveBeenCalled();
    expect(d.avisarSinPermiso).not.toHaveBeenCalled();
  });

  it('si se puede pedir, lo explica y lo pide', async () => {
    const d = deps(false, true);
    expect(await decidirSegundoPlano(d)).toBe('background');
    expect(d.pedir).toHaveBeenCalled();

    const negado = deps(false, true, { pedir: vi.fn(async () => ({ granted: false })) });
    expect(await decidirSegundoPlano(negado)).toBe('foreground');

    const ahoraNo = deps(false, true, { explicar: vi.fn(async () => false) });
    expect(await decidirSegundoPlano(ahoraNo)).toBe('foreground');
    expect(ahoraNo.pedir).not.toHaveBeenCalled();
  });

  it('si el sistema ya no deja pedirlo, avisa antes de iniciar (F2)', async () => {
    const grabarAsi = deps(false, false);
    expect(await decidirSegundoPlano(grabarAsi)).toBe('foreground');
    expect(grabarAsi.avisarSinPermiso).toHaveBeenCalled();
    expect(grabarAsi.explicar).not.toHaveBeenCalled();
    expect(grabarAsi.pedir).not.toHaveBeenCalled();

    const ajustes = deps(false, false, { avisarSinPermiso: vi.fn(async () => false) });
    expect(await decidirSegundoPlano(ajustes)).toBe('cancelar');
  });
});
