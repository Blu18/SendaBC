import { describe, expect, it } from 'vitest';
import { avisoPendientes, avisoRutasPublicadas, bloqueoDeBorrado, QUE_SE_BORRA } from './deletion';

describe('bloqueoDeBorrado (spec 011, CA-47)', () => {
  it('sin actividad en curso ni alerta se puede borrar', () => {
    expect(bloqueoDeBorrado({ grabando: false, alertaActiva: false })).toBeNull();
  });

  it('con una actividad en curso explica que hay que terminarla', () => {
    expect(bloqueoDeBorrado({ grabando: true, alertaActiva: false })).toMatch(/Estás grabando/);
  });

  it('con una alerta activa la alerta va primero', () => {
    expect(bloqueoDeBorrado({ grabando: true, alertaActiva: true })).toMatch(/alerta activa/);
  });
});

describe('avisos (spec 011, CA-46, CA-48)', () => {
  it('dice qué se borra y que no se puede deshacer', () => {
    expect(QUE_SE_BORRA).toMatch(/servidor y de este teléfono/);
    expect(QUE_SE_BORRA).toMatch(/No se puede deshacer/);
  });

  it('cuenta las actividades sin subir', () => {
    expect(avisoPendientes(0)).toBeNull();
    expect(avisoPendientes(1)).toBe('Tienes 1 actividad sin subir. Se perderá.');
    expect(avisoPendientes(3)).toBe('Tienes 3 actividades sin subir. Se perderán.');
  });

  it('avisa que las rutas publicadas siguen sin autor', () => {
    expect(avisoRutasPublicadas(0)).toBeNull();
    expect(avisoRutasPublicadas(1)).toMatch(/Tu ruta publicada seguirá .*"Cuenta eliminada"/);
    expect(avisoRutasPublicadas(2)).toMatch(/Tus 2 rutas publicadas seguirán/);
  });
});
