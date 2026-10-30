import { describe, expect, it } from 'vitest';
import {
  accionesDe,
  CONTACT_STATUS_LABELS,
  contactosActivos,
  MAX_CONTACTOS,
  puedeAgregar,
  validarContacto,
  type EmergencyContact,
} from './contacts';

function contacto(overrides: Partial<EmergencyContact> = {}): EmergencyContact {
  return {
    id: 'c-1',
    name: 'Mamá',
    status: 'PENDING',
    telegramName: null,
    inviteUrl: 'https://t.me/senda_bc_bot?start=abc',
    createdAt: '2026-10-22T18:00:00.000Z',
    ...overrides,
  };
}

describe('validarContacto (CA-2, RN-1)', () => {
  // Mismos casos que backend/src/emergency-contact/dto/create-emergency-contact.dto.spec.ts.
  it('acepta un nombre válido, también con espacios en los extremos', () => {
    expect(validarContacto('Mamá')).toEqual({});
    expect(validarContacto(`  ${'n'.repeat(40)}  `)).toEqual({});
  });

  it('el nombre es obligatorio sin contar los espacios', () => {
    for (const nombre of ['', '   ']) {
      expect(validarContacto(nombre)).toEqual({ name: 'El nombre es obligatorio' });
    }
  });

  it('el nombre tiene como máximo 40 caracteres: 40/41', () => {
    expect(validarContacto('n'.repeat(41))).toEqual({
      name: 'El nombre debe tener como máximo 40 caracteres',
    });
  });
});

describe('CONTACT_STATUS_LABELS (CA-1, CA-5, CA-7)', () => {
  it('nombra los tres estados en español', () => {
    expect(CONTACT_STATUS_LABELS).toEqual({
      PENDING: 'Pendiente de aceptar',
      ACTIVE: 'Activo',
      UNREACHABLE: 'No recibe mensajes',
    });
  });
});

describe('contactosActivos (CA-8, CA-9)', () => {
  it('deja solo los activos, en el mismo orden', () => {
    const lista = [
      contacto({ id: 'a', status: 'ACTIVE' }),
      contacto({ id: 'b', status: 'PENDING' }),
      contacto({ id: 'c', status: 'UNREACHABLE' }),
      contacto({ id: 'd', status: 'ACTIVE' }),
    ];
    expect(contactosActivos(lista).map((c) => c.id)).toEqual(['a', 'd']);
  });

  it('sin contactos, o sin ninguno que haya aceptado, no hay activos (CA-9)', () => {
    expect(contactosActivos([])).toEqual([]);
    expect(contactosActivos([contacto(), contacto({ status: 'UNREACHABLE' })])).toEqual([]);
  });
});

describe('puedeAgregar (CA-1, RN-3)', () => {
  it('deja agregar hasta tener tres', () => {
    expect(MAX_CONTACTOS).toBe(3);
    expect(puedeAgregar([])).toBe(true);
    expect(puedeAgregar([1, 2])).toBe(true);
    expect(puedeAgregar([1, 2, 3])).toBe(false);
  });
});

describe('accionesDe (CA-1, CA-6, CA-7)', () => {
  it('un pendiente se puede compartir pero no probar', () => {
    expect(accionesDe(contacto())).toEqual({ compartir: true, probar: false });
  });

  it('un activo se puede probar y ya no tiene invitación', () => {
    expect(accionesDe(contacto({ status: 'ACTIVE', inviteUrl: null }))).toEqual({
      compartir: false,
      probar: true,
    });
  });

  it('uno que no recibe mensajes se puede volver a compartir (RN-13)', () => {
    expect(accionesDe(contacto({ status: 'UNREACHABLE' }))).toEqual({
      compartir: true,
      probar: false,
    });
  });
});
