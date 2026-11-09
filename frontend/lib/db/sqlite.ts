import * as SQLite from 'expo-sqlite';
import { DB_VERSION, pasosPendientes } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) dbPromise = init();
  return dbPromise;
}

async function init() {
  const db = await SQLite.openDatabaseAsync('sendabc.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  await migrate(db);
  return db;
}

// Aplica en una transacción los pasos de schema.ts que falten (PRAGMA user_version).
async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= DB_VERSION) return;

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const paso of pasosPendientes(version)) await tx.execAsync(paso.sql);
    await tx.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
  });
}
