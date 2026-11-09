import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_MESSAGES,
  ACCOUNT_TIMEOUT_MS,
  conConexion,
  deleteAccount,
  erroresDeCuenta,
  esContrasenaIncorrecta,
  mensajeDeCuenta,
  updateEmail,
  updatePassword,
  updateProfile,
  type AccountFailure,
  type Profile,
} from './api';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function fetchQueResponde(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const perfil: Profile = {
  id: 'u1',
  email: 'ana@senda.bc',
  displayName: 'Ana Luz',
  avatarId: 'cactus',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-07T00:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('peticiones de cuenta (spec 011)', () => {
  it('updateProfile: PATCH /user/me con los cambios y el token (CA-41, CA-42)', async () => {
    const fetchMock = fetchQueResponde(json(perfil));

    expect(await updateProfile('tok', { displayName: 'Ana Luz', avatarId: 'cactus' })).toEqual({
      ok: true,
      data: perfil,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/user\/me$/);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ displayName: 'Ana Luz', avatarId: 'cactus' });
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('updateProfile: avatarId null se envía para quitar el avatar (RN-15)', async () => {
    const fetchMock = fetchQueResponde(json({ ...perfil, avatarId: null }));

    await updateProfile('tok', { avatarId: null });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ avatarId: null });
  });

  it('updateEmail: PATCH /user/me/email con correo y contraseña (CA-43)', async () => {
    const fetchMock = fetchQueResponde(json(perfil));

    const result = await updateEmail('tok', { email: 'ana@senda.bc', password: 'clave-123' });

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/user\/me\/email$/);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ email: 'ana@senda.bc', password: 'clave-123' });
  });

  it('updatePassword: 204 sin cuerpo (CA-44)', async () => {
    const fetchMock = fetchQueResponde(new Response(null, { status: 204 }));

    expect(
      await updatePassword('tok', { currentPassword: 'vieja-123', newPassword: 'nueva-123' })
    ).toEqual({ ok: true, data: undefined });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/user\/me\/password$/);
    expect(JSON.parse(init.body)).toEqual({
      currentPassword: 'vieja-123',
      newPassword: 'nueva-123',
    });
  });

  it('deleteAccount: DELETE /user/me con la contraseña en el cuerpo (CA-46)', async () => {
    const fetchMock = fetchQueResponde(new Response(null, { status: 204 }));

    expect(await deleteAccount('tok', 'clave-123')).toEqual({ ok: true, data: undefined });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/user\/me$/);
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body)).toEqual({ password: 'clave-123' });
  });

  it('una respuesta no exitosa trae su estado y el mensaje del servidor', async () => {
    fetchQueResponde(json({ message: 'Ya existe un usuario con ese email', statusCode: 409 }, 409));

    expect(await updateEmail('tok', { email: 'b@senda.bc', password: 'x' })).toEqual({
      ok: false,
      failure: {
        status: 409,
        apiError: { message: 'Ya existe un usuario con ese email', fieldErrors: {} },
      },
    });
  });

  it('sin red devuelve { error } y no lanza', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network request failed')));

    const result = await updateProfile('tok', { displayName: 'Ana Luz' });

    expect(!result.ok && 'error' in result.failure).toBe(true);
  });

  it('aborta la petición al pasar ACCOUNT_TIMEOUT_MS', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) =>
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')))
          )
      )
    );

    const pendiente = updateProfile('tok', { displayName: 'Ana Luz' });
    await vi.advanceTimersByTimeAsync(ACCOUNT_TIMEOUT_MS);

    const result = await pendiente;
    expect(!result.ok && 'error' in result.failure).toBe(true);
  });

  it('un perfil inválido es { error }', async () => {
    fetchQueResponde(json({ nada: true }));

    const result = await updateProfile('tok', {});

    expect(!result.ok && 'error' in result.failure).toBe(true);
  });
});

describe('conConexion (spec 011, CA-45)', () => {
  it('sin conexión no hace la petición y devuelve { offline: true }', async () => {
    const peticion = vi.fn();

    expect(await conConexion({ isConnected: false }, peticion)).toEqual({
      ok: false,
      failure: { offline: true },
    });
    expect(
      await conConexion({ isConnected: true, isInternetReachable: false }, peticion)
    ).toEqual({ ok: false, failure: { offline: true } });
    expect(peticion).not.toHaveBeenCalled();
  });

  it('con conexión hace la petición', async () => {
    const peticion = vi.fn().mockResolvedValue({ ok: true, data: perfil });

    expect(await conConexion({ isConnected: true }, peticion)).toEqual({ ok: true, data: perfil });
    expect(peticion).toHaveBeenCalledTimes(1);
  });
});

describe('mensajes de cuenta', () => {
  const con = (
    status: number,
    message: string,
    fieldErrors: Record<string, string> = {}
  ): AccountFailure => ({ status, apiError: { message, fieldErrors } });

  it('sin conexión explica que necesita internet (CA-45)', () => {
    expect(mensajeDeCuenta({ offline: true })).toBe(ACCOUNT_MESSAGES.offline);
  });

  it('un 4xx muestra el motivo del servidor (403, 409)', () => {
    expect(mensajeDeCuenta(con(403, 'La contraseña no es correcta'))).toBe(
      'La contraseña no es correcta'
    );
    expect(mensajeDeCuenta(con(409, 'Ya existe un usuario con ese email'))).toBe(
      'Ya existe un usuario con ese email'
    );
  });

  it('un 5xx, un 401, un fallo de red o un 400 por campo usan el genérico', () => {
    expect(mensajeDeCuenta(con(500, 'x'))).toBe(ACCOUNT_MESSAGES.error);
    expect(mensajeDeCuenta(con(401, 'Unauthorized'))).toBe(ACCOUNT_MESSAGES.error);
    expect(mensajeDeCuenta({ error: new Error('x') })).toBe(ACCOUNT_MESSAGES.error);
    expect(mensajeDeCuenta(con(400, 'Datos inválidos', { displayName: 'Corto' }))).toBe(
      ACCOUNT_MESSAGES.error
    );
  });

  it('erroresDeCuenta solo devuelve los del 400', () => {
    expect(erroresDeCuenta(con(400, 'Datos inválidos', { displayName: 'Corto' }))).toEqual({
      displayName: 'Corto',
    });
    expect(erroresDeCuenta(con(409, 'x'))).toEqual({});
    expect(erroresDeCuenta({ offline: true })).toEqual({});
  });

  it('esContrasenaIncorrecta reconoce el 403 (plan, D11)', () => {
    expect(esContrasenaIncorrecta(con(403, 'La contraseña no es correcta'))).toBe(true);
    expect(esContrasenaIncorrecta(con(409, 'x'))).toBe(false);
    expect(esContrasenaIncorrecta({ offline: true })).toBe(false);
  });
});
