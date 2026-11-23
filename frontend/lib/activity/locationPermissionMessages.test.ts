import { describe, expect, it } from 'vitest';
import { LOCATION_PERMISSION_MESSAGES as M, avisoSinUbicacion } from './locationPermissionMessages';

describe('avisoSinUbicacion (spec 003, CA-3)', () => {
  it('con el permiso bloqueado explica por qué, da los pasos y ofrece los ajustes', () => {
    const aviso = avisoSinUbicacion('blocked');
    expect(aviso.titulo).toBe(M.bloqueadoTitulo);
    expect(aviso.cuerpo).toContain(M.porQue);
    expect(aviso.cuerpo).toContain('Permisos > Ubicación');
    expect(aviso.ofreceAjustes).toBe(true);
  });

  it('con el permiso negado una vez explica por qué y pide volver a intentar, sin ajustes', () => {
    const aviso = avisoSinUbicacion('denied');
    expect(aviso.titulo).toBe(M.negadoTitulo);
    expect(aviso.cuerpo).toContain(M.porQue);
    expect(aviso.cuerpo).toContain('"Iniciar actividad" otra vez');
    expect(aviso.ofreceAjustes).toBe(false);
  });
});
