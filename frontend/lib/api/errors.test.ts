import { describe, expect, it } from 'vitest';
import { parseApiError } from './errors';

describe('parseApiError (spec 001, T8)', () => {
  it('usa el mensaje del 409 de correo duplicado (CA-4)', () => {
    const payload = { statusCode: 409, message: 'Ya existe un usuario con ese email', error: 'Conflict' };
    expect(parseApiError(payload, 'Error al registrar')).toEqual({
      message: 'Ya existe un usuario con ese email',
      fieldErrors: {},
    });
  });

  it('toma el primer mensaje de cada campo del 400 de validación (CA-6)', () => {
    const payload = {
      statusCode: 400,
      message: 'Datos inválidos',
      errors: {
        email: ['El correo no es válido'],
        password: ['La contraseña debe ser texto', 'La contraseña debe tener al menos 8 caracteres'],
      },
    };
    expect(parseApiError(payload, 'Error al registrar')).toEqual({
      message: 'Datos inválidos',
      fieldErrors: { email: 'El correo no es válido', password: 'La contraseña debe ser texto' },
    });
  });

  it('acepta el formato por defecto de Nest con message como arreglo', () => {
    expect(parseApiError({ message: ['email must be an email'] }, 'x').message).toBe('email must be an email');
  });

  it('usa el fallback si el body no es un error reconocible', () => {
    expect(parseApiError(null, 'Error al registrar')).toEqual({ message: 'Error al registrar', fieldErrors: {} });
    expect(parseApiError('<html>', 'Error al registrar').message).toBe('Error al registrar');
    expect(parseApiError({ message: '' }, 'Error al registrar').message).toBe('Error al registrar');
  });
});
