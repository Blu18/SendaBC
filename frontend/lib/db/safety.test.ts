import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmergencyContact } from '../safety/contacts';
import { iniciarDetector } from '../safety/inactivity';
import { createTestDb } from './testing';

// Las consultas reales corren contra el esquema real (schema.ts) en una base en memoria.
let testDb: ReturnType<typeof createTestDb>;
vi.mock('./sqlite', () => ({ getDb: async () => testDb }));
vi.mock('expo-crypto', () => ({ randomUUID: () => randomUUID() }));

const { createActivity } = await import('./activities');
const db = await import('./safety');

const A = 'usuario-a';
const B = 'usuario-b';

async function actividadConSesion(userId = A, returnBy: string | null = null) {
  const localId = await createActivity(userId, 'HIKING', 'GPS', '2026-10-22T15:00:00.000Z');
  const clientId = randomUUID();
  await db.createSafetySession(localId, clientId, userId, returnBy);
  return { localId, clientId };
}

beforeEach(() => {
  testDb = createTestDb();
});

describe('SQLite v5 (constitución 5.3)', () => {
  it('crea las cuatro tablas de seguridad', async () => {
    const tablas = await testDb.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND (name LIKE '%safety%' OR name LIKE 'emergency%') ORDER BY name`
    );
    expect(tablas.map((t) => t.name)).toEqual([
      'emergency_contacts_cache',
      'safety_detector',
      'safety_outbox',
      'safety_sessions',
    ]);
    expect(await testDb.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 5 });
  });

  it('borrar la actividad borra su sesión y su detector', async () => {
    const { localId } = await actividadConSesion();
    await db.saveDetectorState(localId, iniciarDetector(1));

    await testDb.runAsync('DELETE FROM activities WHERE local_id = ?', [localId]);

    expect(await db.getSafetySession(localId)).toBeNull();
    expect(await db.getDetectorState(localId)).toBeNull();
  });
});

describe('sesión de seguridad (CA-19, CA-23)', () => {
  it('se crea pendiente de enviar, con su hora de regreso', async () => {
    const { localId, clientId } = await actividadConSesion(A, '2026-10-22T18:00:00.000Z');

    expect(await db.getSafetySession(localId)).toEqual({
      activityLocalId: localId,
      clientGeneratedId: clientId,
      userId: A,
      returnBy: '2026-10-22T18:00:00.000Z',
      serverAck: false,
      locationQueuedAt: null,
      alertClientId: null,
      alertServerId: null,
      alertTriggeredAt: null,
      alertCancelledAt: null,
    });
    expect((await db.getSafetySessionByClientId(clientId))?.activityLocalId).toBe(localId);
  });

  it('queda recibida cuando el servidor confirma la misma hora de regreso', async () => {
    const { localId, clientId } = await actividadConSesion(A, '2026-10-22T18:00:00.000Z');

    await db.markSessionAck(clientId, '2026-10-22T18:00:00.000Z');

    expect((await db.getSafetySession(localId))?.serverAck).toBe(true);
  });

  it('cambiarla la deja pendiente; una confirmación de la versión anterior no la marca recibida', async () => {
    const { localId, clientId } = await actividadConSesion(A, '2026-10-22T18:00:00.000Z');
    await db.markSessionAck(clientId, '2026-10-22T18:00:00.000Z');

    await db.setReturnBy(clientId, '2026-10-22T19:00:00.000Z');
    expect((await db.getSafetySession(localId))?.serverAck).toBe(false);

    await db.markSessionAck(clientId, '2026-10-22T18:00:00.000Z');
    expect((await db.getSafetySession(localId))?.serverAck).toBe(false);

    await db.markSessionAck(clientId, '2026-10-22T19:00:00.000Z');
    expect((await db.getSafetySession(localId))?.serverAck).toBe(true);
  });

  it('sin hora de regreso también se puede confirmar (null)', async () => {
    const { localId, clientId } = await actividadConSesion(A, null);
    await db.markSessionAck(clientId, null);
    expect((await db.getSafetySession(localId))?.serverAck).toBe(true);
  });
});

describe('alerta local (CA-15, CA-17, CA-25)', () => {
  it('se guarda sin enviar, se marca enviada con el id del servidor y se marca cancelada', async () => {
    const { localId, clientId } = await actividadConSesion();

    await db.setAlert(clientId, 'alerta-1', '2026-10-22T16:12:00.000Z');
    expect(await db.getSafetySession(localId)).toMatchObject({
      alertClientId: 'alerta-1',
      alertServerId: null,
      alertTriggeredAt: '2026-10-22T16:12:00.000Z',
      alertCancelledAt: null,
    });
    expect(await db.getAlertServerId('alerta-1')).toBeNull();

    await db.markAlertSent('alerta-1', 'srv-1');
    expect(await db.getAlertServerId('alerta-1')).toBe('srv-1');

    await db.markAlertCancelled(clientId, '2026-10-22T16:20:00.000Z');
    expect(await db.getSafetySession(localId)).toMatchObject({
      alertClientId: 'alerta-1',
      alertCancelledAt: '2026-10-22T16:20:00.000Z',
    });
    // La cancelación todavía se puede enviar con el id del servidor.
    expect(await db.getAlertServerId('alerta-1')).toBe('srv-1');
  });

  it('una alerta cancelada que se envía después igual guarda su id', async () => {
    const { clientId } = await actividadConSesion();
    await db.setAlert(clientId, 'alerta-1', '2026-10-22T16:12:00.000Z');
    await db.markAlertCancelled(clientId);

    await db.markAlertSent('alerta-1', 'srv-1');

    expect(await db.getAlertServerId('alerta-1')).toBe('srv-1');
  });

  it('una alerta nueva reemplaza a la cancelada (RN-8)', async () => {
    const { localId, clientId } = await actividadConSesion();
    await db.setAlert(clientId, 'alerta-1', '2026-10-22T16:12:00.000Z');
    await db.markAlertCancelled(clientId);

    await db.setAlert(clientId, 'alerta-2', '2026-10-22T17:00:00.000Z');

    expect(await db.getSafetySession(localId)).toMatchObject({
      alertClientId: 'alerta-2',
      alertServerId: null,
      alertCancelledAt: null,
    });
  });
});

describe('detector', () => {
  it('guarda y reemplaza su estado', async () => {
    const { localId } = await actividadConSesion();
    const estado = iniciarDetector(1000);

    await db.saveDetectorState(localId, estado);
    await db.saveDetectorState(localId, { ...estado, fase: 'preguntando', preguntaDesde: 2000 });

    expect(await db.getDetectorState(localId)).toEqual({
      ...estado,
      fase: 'preguntando',
      preguntaDesde: 2000,
    });
  });
});

describe('bandeja de salida (plan D6)', () => {
  const sesion = {
    kind: 'session' as const,
    clientId: 'c-1',
    payload: { type: 'HIKING' as const, startedAt: '2026-10-22T15:00:00.000Z', returnBy: null },
  };
  const ubicacion = {
    kind: 'location' as const,
    clientId: 'c-1',
    payload: { latitude: 32, longitude: -115, recordedAt: '2026-10-22T15:05:00.000Z' },
  };

  it('guarda las entradas con su payload y las lista por usuario en orden', async () => {
    const s = await db.enqueueOutbox(A, sesion, 100);
    const u = await db.enqueueOutbox(A, ubicacion, 200);
    await db.enqueueOutbox(B, ubicacion, 50);

    expect(await db.listOutbox(A)).toEqual([
      { id: s, ...sesion, createdAt: 100, attempts: 0 },
      { id: u, ...ubicacion, createdAt: 200, attempts: 0 },
    ]);
  });

  it('borra, cuenta intentos y cuenta lo pendiente de una sesión', async () => {
    const s = await db.enqueueOutbox(A, sesion, 100);
    const u = await db.enqueueOutbox(A, ubicacion, 200);

    await db.incrementOutboxAttempts(u);
    await db.incrementOutboxAttempts(u);
    expect((await db.listOutbox(A)).find((i) => i.id === u)?.attempts).toBe(2);

    expect(await db.countOutbox(A, 'c-1')).toBe(2);
    expect(await db.countOutbox(A, 'c-1', 'location')).toBe(1);
    expect(await db.countOutbox(A, 'c-1', 'alert')).toBe(0);

    await db.deleteOutbox([s, u]);
    await db.deleteOutbox([]);
    expect(await db.listOutbox(A)).toEqual([]);
  });
});

describe('copia de los contactos (CA-8)', () => {
  const mama: EmergencyContact = {
    id: 'c-1',
    name: 'Mamá',
    status: 'ACTIVE',
    telegramName: 'Rosa M.',
    inviteUrl: null,
    createdAt: '2026-10-22T10:00:00.000Z',
  };
  const beto: EmergencyContact = {
    id: 'c-2',
    name: 'Beto',
    status: 'PENDING',
    telegramName: null,
    inviteUrl: 'https://t.me/senda_bc_bot?start=abc',
    createdAt: '2026-10-22T11:00:00.000Z',
  };

  it('reemplaza la copia del usuario y la devuelve en orden de creación', async () => {
    await db.replaceContactsCache(A, [beto, mama]);
    await db.replaceContactsCache(B, [mama]);
    expect(await db.getContactsCache(A)).toEqual([mama, beto]);

    await db.replaceContactsCache(A, [mama]);
    expect(await db.getContactsCache(A)).toEqual([mama]);
    expect(await db.getContactsCache(B)).toEqual([mama]);
  });
});
