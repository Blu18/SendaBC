import { afterEach, describe, expect, it, vi } from 'vitest';
import { setUnauthorizedHandler } from '../api/client';
import {
  cancelAlert,
  createAlert,
  createContact,
  deleteContact,
  finishSession,
  getSession,
  listContacts,
  postLocation,
  SAFETY_REQUEST_TIMEOUT_MS,
  sendTestMessage,
  statusDe,
  updateContact,
  upsertSession,
  type SafetyAlert,
  type SafetySession,
} from './api';
import type { EmergencyContact } from './contacts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function fetchQueResponde(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// Método, ruta y cuerpo de la primera llamada.
function llamada(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    method: init.method ?? 'GET',
    path: new URL(url, 'http://x').pathname,
    body: init.body ? JSON.parse(init.body as string) : undefined,
    headers: init.headers as Record<string, string>,
  };
}

const CLIENT_ID = '44444444-4444-4444-8444-444444444444';

const contacto: EmergencyContact = {
  id: 'c-1',
  name: 'Mamá',
  status: 'PENDING',
  telegramName: null,
  inviteUrl: 'https://t.me/senda_bc_bot?start=abc',
  createdAt: '2026-10-22T18:00:00.000Z',
};

const alerta: SafetyAlert = {
  id: 'a-1',
  reason: 'INACTIVITY',
  status: 'ACTIVE',
  triggeredAt: '2026-10-22T16:12:00.000Z',
  locationAt: '2026-10-22T16:10:00.000Z',
  deliveries: [{ contactName: 'Mamá', status: 'SENT', sentAt: '2026-10-22T16:12:01.000Z' }],
};

const sesion: SafetySession = {
  clientId: CLIENT_ID,
  type: 'HIKING',
  startedAt: '2026-10-22T15:00:00.000Z',
  returnBy: null,
  endedAt: null,
  lastLocationAt: null,
  activeAlert: null,
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe('contactos (spec 008)', () => {
  it('lista, crea, edita, quita y prueba con el token', async () => {
    let f = fetchQueResponde(json([contacto]));
    expect(await listContacts('tok')).toEqual({ ok: true, data: [contacto] });
    expect(llamada(f)).toMatchObject({ method: 'GET', path: expect.stringMatching(/\/emergency-contacts$/) });
    expect(llamada(f).headers.Authorization).toBe('Bearer tok');

    f = fetchQueResponde(json(contacto, 201));
    expect(await createContact('tok', 'Mamá')).toEqual({ ok: true, data: contacto });
    expect(llamada(f)).toMatchObject({ method: 'POST', body: { name: 'Mamá' } });

    f = fetchQueResponde(json({ ...contacto, name: 'Mamá Rosa' }));
    expect((await updateContact('tok', 'c-1', 'Mamá Rosa')).ok).toBe(true);
    expect(llamada(f)).toMatchObject({
      method: 'PATCH',
      path: expect.stringMatching(/\/emergency-contacts\/c-1$/),
      body: { name: 'Mamá Rosa' },
    });

    f = fetchQueResponde(new Response(null, { status: 204 }));
    expect(await deleteContact('tok', 'c-1')).toEqual({ ok: true, data: undefined });
    expect(llamada(f).method).toBe('DELETE');

    f = fetchQueResponde(json({ status: 'FAILED', error: 'El contacto bloqueó a SendaBC' }));
    expect(await sendTestMessage('tok', 'c-1')).toEqual({
      ok: true,
      data: { status: 'FAILED', error: 'El contacto bloqueó a SendaBC' },
    });
    expect(llamada(f)).toMatchObject({
      method: 'POST',
      path: expect.stringMatching(/\/emergency-contacts\/c-1\/test$/),
    });
  });

  it('un 400 trae el mensaje junto al campo (CA-2)', async () => {
    fetchQueResponde(
      json(
        {
          statusCode: 400,
          message: 'Datos inválidos',
          errors: { name: ['El nombre debe tener como máximo 40 caracteres'] },
        },
        400
      )
    );
    const r = await createContact('tok', 'n'.repeat(41));
    expect(r).toEqual({
      ok: false,
      failure: {
        status: 400,
        apiError: {
          message: 'Datos inválidos',
          fieldErrors: { name: 'El nombre debe tener como máximo 40 caracteres' },
        },
      },
    });
  });

  it('un 409 (tres contactos) y un 429 (prueba seguida) traen el mensaje del servidor', async () => {
    fetchQueResponde(json({ message: 'Puedes tener como máximo 3 contactos de emergencia' }, 409));
    const limite = await createContact('tok', 'Cuarto');
    expect(!limite.ok && 'status' in limite.failure && limite.failure.apiError.message).toBe(
      'Puedes tener como máximo 3 contactos de emergencia'
    );

    fetchQueResponde(json({ message: 'Ya enviaste un mensaje de prueba…' }, 429));
    const seguida = await sendTestMessage('tok', 'c-1');
    expect(!seguida.ok && statusDe(seguida.failure)).toBe(429);
  });
});

describe('sesión y alertas (spec 008)', () => {
  it('PUT de la sesión con su clientId (CA-23)', async () => {
    const f = fetchQueResponde(json(sesion));
    const payload = { type: 'HIKING' as const, startedAt: sesion.startedAt, returnBy: null };

    expect(await upsertSession('tok', CLIENT_ID, payload)).toEqual({ ok: true, data: sesion });
    expect(llamada(f)).toEqual({
      method: 'PUT',
      path: expect.stringMatching(new RegExp(`/safety/sessions/${CLIENT_ID}$`)),
      body: payload,
      headers: expect.any(Object),
    });
  });

  it('lee la sesión, manda una ubicación y la termina', async () => {
    let f = fetchQueResponde(json(sesion));
    expect((await getSession('tok', CLIENT_ID)).ok).toBe(true);
    expect(llamada(f).method).toBe('GET');

    f = fetchQueResponde(new Response(null, { status: 204 }));
    const ubicacion = { latitude: 32, longitude: -115, recordedAt: '2026-10-22T16:00:00.000Z' };
    expect(await postLocation('tok', CLIENT_ID, ubicacion)).toEqual({ ok: true, data: undefined });
    expect(llamada(f)).toMatchObject({
      method: 'POST',
      path: expect.stringMatching(/\/locations$/),
      body: ubicacion,
    });

    f = fetchQueResponde(json({ ...sesion, endedAt: '2026-10-22T17:00:00.000Z' }));
    expect((await finishSession('tok', CLIENT_ID, '2026-10-22T17:00:00.000Z')).ok).toBe(true);
    expect(llamada(f)).toMatchObject({
      method: 'POST',
      path: expect.stringMatching(/\/finish$/),
      body: { endedAt: '2026-10-22T17:00:00.000Z' },
    });
  });

  it('crear la alerta acepta 201 y 200 (la que ya estaba activa, CA-27)', async () => {
    const payload = {
      clientAlertId: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
      reason: 'SOS' as const,
      triggeredAt: alerta.triggeredAt,
      latitude: null,
      longitude: null,
      locationAt: null,
    };
    for (const status of [201, 200]) {
      const f = fetchQueResponde(json(alerta, status));
      expect(await createAlert('tok', CLIENT_ID, payload)).toEqual({ ok: true, data: alerta });
      expect(llamada(f)).toMatchObject({
        method: 'POST',
        path: expect.stringMatching(/\/alerts$/),
        body: payload,
      });
    }
  });

  it('cancela la alerta por su id del servidor (CA-25)', async () => {
    const f = fetchQueResponde(json({ ...alerta, status: 'CANCELLED' }));
    const r = await cancelAlert('tok', 'a-1');
    expect(r.ok && r.data.status).toBe('CANCELLED');
    expect(llamada(f)).toMatchObject({
      method: 'POST',
      path: expect.stringMatching(/\/safety\/alerts\/a-1\/cancel$/),
    });
  });
});

describe('fallos (constitución 2.4)', () => {
  it('sin red devuelve { error } sin lanzar; statusDe lo trata como "red"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network request failed')));
    const r = await postLocation('tok', CLIENT_ID, {
      latitude: 32,
      longitude: -115,
      recordedAt: '2026-10-22T16:00:00.000Z',
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && statusDe(r.failure)).toBe('red');
  });

  it('aborta a los 10 s si el servidor no responde', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) =>
            init.signal!.addEventListener('abort', () => reject(new Error('aborted')))
          )
      )
    );
    const pendiente = getSession('tok', CLIENT_ID);
    await vi.advanceTimersByTimeAsync(SAFETY_REQUEST_TIMEOUT_MS);
    const r = await pendiente;
    expect(!r.ok && statusDe(r.failure)).toBe('red');
  });

  it('un 401 avisa para cerrar la sesión (spec 002) y devuelve su estado', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchQueResponde(json({ message: 'Unauthorized' }, 401));

    const r = await listContacts('tok');

    expect(onUnauthorized).toHaveBeenCalled();
    expect(!r.ok && statusDe(r.failure)).toBe(401);
  });

  it('un cuerpo inesperado es un fallo, no un éxito', async () => {
    fetchQueResponde(json({ hola: 'mundo' }));
    const r = await createAlert('tok', CLIENT_ID, {
      clientAlertId: 'x',
      reason: 'SOS',
      triggeredAt: alerta.triggeredAt,
      latitude: null,
      longitude: null,
      locationAt: null,
    });
    expect(r.ok).toBe(false);
  });
});
