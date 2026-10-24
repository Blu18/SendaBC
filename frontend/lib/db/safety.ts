import type { EmergencyContact } from '../safety/contacts';
import type { EstadoDetector } from '../safety/inactivity';
import type { OutboxEntry, OutboxItem } from '../safety/outbox';
import { getDb } from './sqlite';

// Datos locales de seguridad (spec 008, SQLite v5). La sesión de seguridad cuelga de la
// actividad local y se borra con ella.

export type LocalSafetySession = {
  activityLocalId: number;
  clientGeneratedId: string;
  userId: string;
  returnBy: string | null;
  // El servidor tiene la hora de regreso actual (CA-23).
  serverAck: boolean;
  locationQueuedAt: number | null;
  alertClientId: string | null;
  // null mientras la alerta no se envía (CA-15).
  alertServerId: string | null;
  alertTriggeredAt: string | null;
  // La alerta está activa si hay alertClientId y no se canceló (CA-17, CA-25).
  alertCancelledAt: string | null;
};

const SESSION_COLUMNS = `
  activity_local_id AS activityLocalId,
  client_generated_id AS clientGeneratedId,
  user_id AS userId,
  return_by AS returnBy,
  server_ack AS serverAck,
  location_queued_at AS locationQueuedAt,
  alert_client_id AS alertClientId,
  alert_server_id AS alertServerId,
  alert_triggered_at AS alertTriggeredAt,
  alert_cancelled_at AS alertCancelledAt`;

type SessionRow = Omit<LocalSafetySession, 'serverAck'> & { serverAck: number };

const aSesion = (row: SessionRow | null): LocalSafetySession | null =>
  row ? { ...row, serverAck: row.serverAck === 1 } : null;

// Al iniciar una actividad, con el mismo clientGeneratedId (plan D1).
export async function createSafetySession(
  activityLocalId: number,
  clientGeneratedId: string,
  userId: string,
  returnBy: string | null
) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO safety_sessions (activity_local_id, client_generated_id, user_id, return_by)
     VALUES (?, ?, ?, ?)`,
    [activityLocalId, clientGeneratedId, userId, returnBy]
  );
}

export async function getSafetySession(activityLocalId: number) {
  const db = await getDb();
  return aSesion(
    await db.getFirstAsync<SessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM safety_sessions WHERE activity_local_id = ?`,
      [activityLocalId]
    )
  );
}

export async function getSafetySessionByClientId(clientGeneratedId: string) {
  const db = await getDb();
  return aSesion(
    await db.getFirstAsync<SessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM safety_sessions WHERE client_generated_id = ?`,
      [clientGeneratedId]
    )
  );
}

// Cambiar la hora de regreso: queda pendiente de enviar hasta que el servidor la reciba (CA-23).
export async function setReturnBy(clientGeneratedId: string, returnBy: string | null) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE safety_sessions SET return_by = ?, server_ack = 0 WHERE client_generated_id = ?`,
    [returnBy, clientGeneratedId]
  );
}

// El servidor recibió la sesión con `returnBy`. Si mientras tanto el usuario la cambió, sigue
// pendiente: la versión nueva todavía está en la bandeja.
export async function markSessionAck(clientGeneratedId: string, returnBy: string | null) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE safety_sessions SET server_ack = 1
     WHERE client_generated_id = ? AND return_by IS ?`,
    [clientGeneratedId, returnBy]
  );
}

export async function setLocationQueuedAt(clientGeneratedId: string, at: number) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE safety_sessions SET location_queued_at = ? WHERE client_generated_id = ?`,
    [at, clientGeneratedId]
  );
}

// Una alerta nueva, todavía sin enviar (CA-14, CA-24).
export async function setAlert(clientGeneratedId: string, clientAlertId: string, triggeredAt: string) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE safety_sessions
     SET alert_client_id = ?, alert_server_id = NULL, alert_triggered_at = ?,
         alert_cancelled_at = NULL
     WHERE client_generated_id = ?`,
    [clientAlertId, triggeredAt, clientGeneratedId]
  );
}

// El servidor creó la alerta (o devolvió la que ya estaba activa, CA-27).
export async function markAlertSent(clientAlertId: string, serverId: string) {
  const db = await getDb();
  await db.runAsync(`UPDATE safety_sessions SET alert_server_id = ? WHERE alert_client_id = ?`, [
    serverId,
    clientAlertId,
  ]);
}

// Id del servidor de una alerta, para cancelarla. null si no se ha enviado.
export async function getAlertServerId(clientAlertId: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string | null }>(
    `SELECT alert_server_id AS id FROM safety_sessions WHERE alert_client_id = ?`,
    [clientAlertId]
  );
  return row?.id ?? null;
}

// El usuario canceló la alerta (CA-25): deja de mostrarse como activa. Los ids se quedan para
// que safetySync pueda mandar la cancelación aunque la alerta se haya enviado después.
export async function markAlertCancelled(clientGeneratedId: string, at = new Date().toISOString()) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE safety_sessions SET alert_cancelled_at = ? WHERE client_generated_id = ?`,
    [at, clientGeneratedId]
  );
}

// --- Detector de inactividad ---

export async function saveDetectorState(activityLocalId: number, estado: EstadoDetector) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO safety_detector (activity_local_id, state) VALUES (?, ?)
     ON CONFLICT (activity_local_id) DO UPDATE SET state = excluded.state`,
    [activityLocalId, JSON.stringify(estado)]
  );
}

export async function getDetectorState(activityLocalId: number): Promise<EstadoDetector | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ state: string }>(
    `SELECT state FROM safety_detector WHERE activity_local_id = ?`,
    [activityLocalId]
  );
  return row ? (JSON.parse(row.state) as EstadoDetector) : null;
}

// --- Bandeja de salida (plan D6) ---

export async function enqueueOutbox(userId: string, entry: OutboxEntry, createdAt = Date.now()) {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO safety_outbox (user_id, kind, client_id, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, entry.kind, entry.clientId, JSON.stringify(entry.payload), createdAt]
  );
  return result.lastInsertRowId;
}

type OutboxRow = {
  id: number;
  kind: OutboxEntry['kind'];
  clientId: string;
  payload: string;
  createdAt: number;
  attempts: number;
};

// Lo pendiente del usuario, en el orden en que se encoló.
export async function listOutbox(userId: string): Promise<OutboxItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT id, kind, client_id AS clientId, payload, created_at AS createdAt, attempts
     FROM safety_outbox WHERE user_id = ? ORDER BY created_at, id`,
    [userId]
  );
  return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) }) as OutboxItem);
}

export async function deleteOutbox(ids: number[]) {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM safety_outbox WHERE id IN (${ids.map(() => '?').join(', ')})`,
    ids
  );
}

export async function incrementOutboxAttempts(id: number) {
  const db = await getDb();
  await db.runAsync(`UPDATE safety_outbox SET attempts = attempts + 1 WHERE id = ?`, [id]);
}

// Cuántas cosas de una sesión siguen sin enviar (p. ej. la alerta, CA-15).
export async function countOutbox(userId: string, clientId: string, kind?: OutboxEntry['kind']) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM safety_outbox
     WHERE user_id = ? AND client_id = ? AND (? IS NULL OR kind = ?)`,
    [userId, clientId, kind ?? null, kind ?? null]
  );
  return row?.n ?? 0;
}

// --- Copia de los contactos (CA-8) ---

// Reemplaza la copia con la lista que devolvió el servidor.
export async function replaceContactsCache(userId: string, contactos: EmergencyContact[]) {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(`DELETE FROM emergency_contacts_cache WHERE user_id = ?`, [userId]);
    for (const c of contactos) {
      await tx.runAsync(
        `INSERT INTO emergency_contacts_cache
         (user_id, id, name, status, telegram_name, invite_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, c.id, c.name, c.status, c.telegramName, c.inviteUrl, c.createdAt]
      );
    }
  });
}

export async function getContactsCache(userId: string): Promise<EmergencyContact[]> {
  const db = await getDb();
  return db.getAllAsync<EmergencyContact>(
    `SELECT id, name, status, telegram_name AS telegramName, invite_url AS inviteUrl,
            created_at AS createdAt
     FROM emergency_contacts_cache WHERE user_id = ? ORDER BY created_at`,
    [userId]
  );
}
