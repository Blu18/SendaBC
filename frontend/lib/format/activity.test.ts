import { describe, expect, it } from 'vitest';
import { pendingUploadsWarning, SYNC_STATUS_LABELS, syncStatusOf } from './activity';

describe('syncStatusOf (spec 005, CA-14)', () => {
  it('SYNCED → Sincronizada', () => {
    expect(syncStatusOf({ status: 'SYNCED', syncError: null })).toBe('synced');
  });

  it('PENDING_SYNC sin error → Pendiente de subir', () => {
    expect(syncStatusOf({ status: 'PENDING_SYNC', syncError: null })).toBe('pending');
  });

  it('PENDING_SYNC con motivo de rechazo → No se pudo subir', () => {
    expect(syncStatusOf({ status: 'PENDING_SYNC', syncError: 'motivo' })).toBe('rejected');
  });

  it('las etiquetas son las de la spec', () => {
    expect(SYNC_STATUS_LABELS).toEqual({
      pending: 'Pendiente de subir',
      synced: 'Sincronizada',
      rejected: 'No se pudo subir',
    });
  });
});

describe('pendingUploadsWarning (spec 005, CA-24)', () => {
  it('sin pendientes no hay aviso', () => {
    expect(pendingUploadsWarning(0)).toBeNull();
  });

  it('con N pendientes muestra el número', () => {
    expect(pendingUploadsWarning(2)).toBe(
      'Tienes 2 actividades sin subir. Se subirán cuando vuelvas a iniciar sesión.'
    );
  });

  it('con 1 pendiente usa singular', () => {
    expect(pendingUploadsWarning(1)).toBe(
      'Tienes 1 actividad sin subir. Se subirá cuando vuelvas a iniciar sesión.'
    );
  });
});
