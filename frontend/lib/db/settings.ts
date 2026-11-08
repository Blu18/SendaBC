import { CLAVE_UMBRALES, guardarEleccion, leerEleccion, type EleccionUmbrales } from '../safety/thresholds';
import { getDb } from './sqlite';

// Ajustes de la app por cuenta (spec 011, SQLite v6). Se borran con la cuenta (lib/db/account.ts)
// y se conservan al cerrar sesión.

export async function getSetting(userId: string, key: string): Promise<string | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE user_id = ? AND key = ?`,
    [userId, key]
  );
  return fila?.value ?? null;
}

export async function setSetting(userId: string, key: string, value: string) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_settings (user_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value`,
    [userId, key, value]
  );
}

// Umbrales de inactividad elegidos (CA-50). Sin nada guardado o con un valor dañado, los de por
// defecto (CA-52).
export async function getEleccionUmbrales(userId: string): Promise<EleccionUmbrales> {
  return leerEleccion(await getSetting(userId, CLAVE_UMBRALES));
}

export async function saveEleccionUmbrales(userId: string, eleccion: EleccionUmbrales) {
  await setSetting(userId, CLAVE_UMBRALES, guardarEleccion(eleccion));
}
