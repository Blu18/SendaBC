import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb } from './testing';

// Las consultas reales corren contra el esquema real (schema.ts) en una base en memoria.
let testDb: ReturnType<typeof createTestDb>;
vi.mock('./sqlite', () => ({ getDb: async () => testDb }));
vi.mock('expo-crypto', () => ({ randomUUID: () => randomUUID() }));

const { createActivity, finishActivity, insertPoint } = await import('./activities');
const safety = await import('./safety');
const { deleteLocalAccount, getEstadoLocalDeCuenta } = await import('./account');

const A = 'usuario-a';
const B = 'usuario-b';

const contar = async (sql: string, params: string[] = []) =>
  (await testDb.getFirstAsync<{ n: number }>(sql, params))?.n ?? 0;

async function actividad(userId: string, status: 'RECORDING' | 'PENDING_SYNC' | 'SYNCED') {
  const localId = await createActivity(userId, 'HIKING', 'GPS', '2026-11-01T15:00:00.000Z');
  await insertPoint(localId, {
    sequence: 1,
    latitude: 31.86,
    longitude: -116.6,
    altitude: 100,
    accuracy: 5,
    recordedAt: '2026-11-01T15:00:01.000Z',
  });
  if (status !== 'RECORDING') {
    await finishActivity(localId, '2026-11-01T16:00:00.000Z');
    await testDb.runAsync(`UPDATE activities SET status = ? WHERE local_id = ?`, [status, localId]);
  }
  return localId;
}

async function datosDe(userId: string) {
  const grabando = await actividad(userId, 'RECORDING');
  const sesion = randomUUID();
  await safety.createSafetySession(grabando, sesion, userId, null);
  await actividad(userId, 'PENDING_SYNC');
  await actividad(userId, 'SYNCED');
  await safety.enqueueOutbox(userId, { kind: 'finish', clientId: sesion, payload: { endedAt: 'x' } });
  await safety.replaceContactsCache(userId, [
    { id: `c-${userId}`, name: 'Mamá', status: 'ACTIVE', telegramName: null, inviteUrl: null, createdAt: 'x' },
  ] as never);
  await testDb.runAsync(`INSERT INTO app_settings (user_id, key, value) VALUES (?, 'k', 'v')`, [userId]);
  await testDb.runAsync(
    `INSERT INTO route_cache (user_id, kind, cache_key, payload, saved_at) VALUES (?, 'nearby', 'last', '[]', 'x')`,
    [userId]
  );
  return { grabando, sesion };
}

beforeEach(() => {
  testDb = createTestDb();
});

describe('getEstadoLocalDeCuenta (spec 011, CA-46, CA-47)', () => {
  it('sin nada en curso: ni grabando ni alerta, y cuenta las actividades sin subir', async () => {
    await actividad(A, 'PENDING_SYNC');
    await actividad(A, 'PENDING_SYNC');
    await actividad(A, 'SYNCED');
    await actividad(B, 'PENDING_SYNC');

    expect(await getEstadoLocalDeCuenta(A)).toEqual({ grabando: false, alertaActiva: false, pendientes: 2 });
  });

  it('con una actividad en curso de esta cuenta está grabando; la de otra cuenta no cuenta', async () => {
    await actividad(B, 'RECORDING');
    expect((await getEstadoLocalDeCuenta(A)).grabando).toBe(false);

    await actividad(A, 'RECORDING');
    expect(await getEstadoLocalDeCuenta(A)).toMatchObject({ grabando: true, alertaActiva: false });
  });

  it('una alerta sin cancelar en la grabación es alerta activa; cancelada ya no', async () => {
    const localId = await actividad(A, 'RECORDING');
    const sesion = randomUUID();
    await safety.createSafetySession(localId, sesion, A, null);
    await safety.setAlert(sesion, 'alerta-1', '2026-11-01T15:30:00.000Z');

    expect(await getEstadoLocalDeCuenta(A)).toMatchObject({ grabando: true, alertaActiva: true });

    await safety.markAlertCancelled(sesion);
    expect((await getEstadoLocalDeCuenta(A)).alertaActiva).toBe(false);
  });
});

describe('deleteLocalAccount (spec 011, CA-46)', () => {
  it('borra todo lo de la cuenta en el teléfono', async () => {
    await datosDe(A);

    await deleteLocalAccount(A);

    expect(await contar(`SELECT COUNT(*) AS n FROM activities WHERE user_id = ?`, [A])).toBe(0);
    expect(await contar(`SELECT COUNT(*) AS n FROM activity_points`)).toBe(0);
    for (const tabla of ['safety_sessions', 'safety_outbox', 'emergency_contacts_cache', 'app_settings', 'route_cache']) {
      expect(await contar(`SELECT COUNT(*) AS n FROM ${tabla} WHERE user_id = ?`, [A]), tabla).toBe(0);
    }
  });

  it('no toca lo de otra cuenta del mismo teléfono', async () => {
    await datosDe(A);
    await datosDe(B);

    await deleteLocalAccount(A);

    expect(await contar(`SELECT COUNT(*) AS n FROM activities WHERE user_id = ?`, [B])).toBe(3);
    expect(await contar(`SELECT COUNT(*) AS n FROM activity_points`)).toBe(3);
    for (const tabla of ['safety_sessions', 'safety_outbox', 'emergency_contacts_cache', 'app_settings', 'route_cache']) {
      expect(await contar(`SELECT COUNT(*) AS n FROM ${tabla} WHERE user_id = ?`, [B]), tabla).toBe(1);
    }
  });

  it('si algo falla, no borra nada (transacción)', async () => {
    await datosDe(A);
    await testDb.execAsync('DROP TABLE route_cache');

    await expect(deleteLocalAccount(A)).rejects.toThrow();

    expect(await contar(`SELECT COUNT(*) AS n FROM activities WHERE user_id = ?`, [A])).toBe(3);
  });
});
