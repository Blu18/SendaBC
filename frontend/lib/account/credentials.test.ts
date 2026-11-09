import { describe, expect, it } from 'vitest';
import { validarCambioContrasena, validarCambioCorreo } from './credentials';

describe('validarCambioCorreo (spec 011, CA-43)', () => {
  it('acepta un correo válido con la contraseña', () => {
    expect(validarCambioCorreo({ email: ' ana@senda.bc ', password: 'x' })).toEqual({});
  });

  it('pide el correo y lo valida como el registro', () => {
    expect(validarCambioCorreo({ email: ' ', password: 'x' })).toEqual({
      email: 'El correo es obligatorio',
    });
    expect(validarCambioCorreo({ email: 'ana@senda', password: 'x' })).toEqual({
      email: 'Ingresa un correo válido',
    });
  });

  it('pide la contraseña', () => {
    expect(validarCambioCorreo({ email: 'ana@senda.bc', password: '' })).toEqual({
      password: 'Escribe tu contraseña',
    });
  });
});

describe('validarCambioContrasena (spec 011, CA-44)', () => {
  const valido = { actual: 'vieja-123', nueva: 'nueva-123', confirmar: 'nueva-123' };

  it('acepta la actual y una nueva de 8 caracteres confirmada', () => {
    expect(validarCambioContrasena(valido)).toEqual({});
  });

  it('pide la actual', () => {
    expect(validarCambioContrasena({ ...valido, actual: '' })).toEqual({
      actual: 'Escribe tu contraseña actual',
    });
  });

  it('la nueva debe tener al menos 8 caracteres', () => {
    expect(validarCambioContrasena({ ...valido, nueva: '1234567', confirmar: '1234567' })).toEqual({
      nueva: 'Debe tener al menos 8 caracteres',
    });
  });

  it('la confirmación debe coincidir', () => {
    expect(validarCambioContrasena({ ...valido, confirmar: 'otra-1234' })).toEqual({
      confirmar: 'Las contraseñas no coinciden',
    });
    expect(validarCambioContrasena({ ...valido, confirmar: '' })).toEqual({
      confirmar: 'Confirma tu contraseña',
    });
  });
});
