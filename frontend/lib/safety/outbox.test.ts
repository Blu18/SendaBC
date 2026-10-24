import { describe, expect, it } from 'vitest';
import {
  decidirFallo,
  planDeEnvio,
  tocaEncolarUbicacion,
  type OutboxEntry,
  type OutboxItem,
} from './outbox';

const A = 'aaaaaaaa-0000-4000-8000-000000000001';
const B = 'bbbbbbbb-0000-4000-8000-000000000002';

let siguienteId = 1;
function item(entry: OutboxEntry, createdAt: number): OutboxItem {
  return { ...entry, id: siguienteId++, createdAt, attempts: 0 };
}

const sesion = (clientId: string, t: number, returnBy: string | null = null) =>
  item(
    { kind: 'session', clientId, payload: { type: 'HIKING', startedAt: '2026-10-22T15:00:00.000Z', returnBy } },
    t
  );
const ubicacion = (clientId: string, t: number) =>
  item(
    {
      kind: 'location',
      clientId,
      payload: { latitude: 32, longitude: -115, recordedAt: new Date(t).toISOString() },
    },
    t
  );
const alerta = (clientId: string, clientAlertId: string, t: number) =>
  item(
    {
      kind: 'alert',
      clientId,
      payload: {
        clientAlertId,
        reason: 'INACTIVITY',
        triggeredAt: new Date(t).toISOString(),
        latitude: null,
        longitude: null,
        locationAt: null,
      },
    },
    t
  );
const cancelacion = (clientId: string, clientAlertId: string, t: number) =>
  item({ kind: 'cancel', clientId, payload: { clientAlertId } }, t);
const fin = (clientId: string, t: number) =>
  item({ kind: 'finish', clientId, payload: { endedAt: new Date(t).toISOString() } }, t);

const ids = (lista: OutboxItem[]) => lista.map((i) => i.id);

describe('planDeEnvio (plan D6)', () => {
  it('envía en orden cronológico: sesión, alerta, ubicación, terminar', () => {
    const s = sesion(A, 1);
    const u = ubicacion(A, 2);
    const a = alerta(A, 'x', 3);
    const f = fin(A, 4);

    const plan = planDeEnvio([f, a, u, s]);

    expect(ids(plan.enviar)).toEqual([s.id, u.id, a.id, f.id]);
    expect(plan.descartar).toEqual([]);
  });

  it('de las ubicaciones de una sesión solo envía la más reciente (CA-20)', () => {
    const s = sesion(A, 1);
    const u1 = ubicacion(A, 2);
    const u2 = ubicacion(A, 3);
    const u3 = ubicacion(A, 4);
    const otra = ubicacion(B, 5);

    const plan = planDeEnvio([s, u1, u2, u3, otra]);

    expect(ids(plan.enviar)).toEqual([s.id, u3.id, otra.id]);
    expect(plan.descartar.sort()).toEqual([u1.id, u2.id].sort());
  });

  it('de una sesión cambiada (hora de regreso) envía la última versión en el lugar de la primera (CA-19, CA-23)', () => {
    const s1 = sesion(A, 1, null);
    const u = ubicacion(A, 2);
    const s2 = sesion(A, 3, '2026-10-22T18:00:00.000Z');
    const s3 = sesion(A, 4, '2026-10-22T19:00:00.000Z');

    const plan = planDeEnvio([s1, u, s2, s3]);

    expect(ids(plan.enviar)).toEqual([s3.id, u.id]);
    expect(plan.enviar[0].kind === 'session' && plan.enviar[0].payload.returnBy).toBe(
      '2026-10-22T19:00:00.000Z'
    );
    expect(plan.descartar.sort()).toEqual([s1.id, s2.id].sort());
  });

  it('una alerta y su cancelación sin enviar se descartan juntas', () => {
    const s = sesion(A, 1);
    const a = alerta(A, 'x', 2);
    const c = cancelacion(A, 'x', 3);

    const plan = planDeEnvio([s, a, c]);

    expect(ids(plan.enviar)).toEqual([s.id]);
    expect(plan.descartar.sort()).toEqual([a.id, c.id].sort());
  });

  it('la cancelación de una alerta ya enviada sí se envía', () => {
    const c = cancelacion(A, 'ya-enviada', 3);
    expect(ids(planDeEnvio([c]).enviar)).toEqual([c.id]);
  });

  it('una alerta cancelada y luego otra nueva mantienen su orden (RN-8)', () => {
    const s = sesion(A, 1);
    const c1 = cancelacion(A, 'primera', 2); // la primera ya se envió
    const a2 = alerta(A, 'segunda', 3);

    expect(ids(planDeEnvio([a2, c1, s]).enviar)).toEqual([s.id, c1.id, a2.id]);
  });

  it('con la misma hora, desempata por el orden en que se encolaron', () => {
    const s = sesion(A, 5);
    const a = alerta(A, 'x', 5);
    expect(ids(planDeEnvio([a, s]).enviar)).toEqual([s.id, a.id]);
  });

  it('una bandeja vacía no envía nada', () => {
    expect(planDeEnvio([])).toEqual({ enviar: [], descartar: [] });
  });
});

describe('decidirFallo (constitución 2.4)', () => {
  it('sin red, tiempo agotado, demasiadas peticiones o error del servidor: reintentar', () => {
    for (const status of ['red', 408, 429, 500, 502, 503] as const) {
      expect(decidirFallo(status)).toBe('reintentar');
    }
  });

  it('401 detiene todo hasta volver a entrar', () => {
    expect(decidirFallo(401)).toBe('sesion');
  });

  it('lo que el servidor no aceptará nunca se descarta', () => {
    // 400 datos inválidos, 404 de otra cuenta, 409 sesión terminada o alerta ya no activa.
    for (const status of [400, 403, 404, 409]) {
      expect(decidirFallo(status)).toBe('descartar');
    }
  });
});

describe('tocaEncolarUbicacion (plan D7)', () => {
  const T = Date.UTC(2026, 9, 22, 16);

  it('la primera siempre; después cada 5 min', () => {
    expect(tocaEncolarUbicacion(null, T, false)).toBe(true);
    expect(tocaEncolarUbicacion(T, T + 4 * 60_000, false)).toBe(false);
    expect(tocaEncolarUbicacion(T, T + 5 * 60_000, false)).toBe(true);
  });

  it('con una alerta activa, cada minuto (CA-16)', () => {
    expect(tocaEncolarUbicacion(T, T + 59_000, true)).toBe(false);
    expect(tocaEncolarUbicacion(T, T + 60_000, true)).toBe(true);
  });
});
