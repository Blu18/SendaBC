import { describe, expect, it } from 'vitest';
import { AUTH_ERROR_GENERICO, AUTH_ERROR_SIN_CONEXION, sinRespuesta } from './messages';

describe('sinRespuesta (spec 002, CA-9; spec 001)', () => {
  it('sin conexión dice que hace falta internet', () => {
    expect(sinRespuesta('login', false)).toBe(
      'Iniciar sesión necesita conexión a internet. Revisa tu conexión e inténtalo de nuevo.'
    );
    expect(sinRespuesta('registro', false)).toBe(AUTH_ERROR_SIN_CONEXION.registro);
  });

  it('con conexión, el servidor no respondió: mensaje genérico', () => {
    expect(sinRespuesta('login', true)).toBe('Error al iniciar sesión. Inténtalo más tarde.');
    expect(sinRespuesta('registro', true)).toBe(AUTH_ERROR_GENERICO.registro);
  });
});
