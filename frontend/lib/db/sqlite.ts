import * as SQLite from 'expo-sqlite';

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

    CREATE TABLE IF NOT EXISTS activities (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_generated_id TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'RECORDING',
      startedAt TEXT NOT NULL,
      endedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_points (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL REFERENCES activities(local_id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      altitude REAL,
      accuracy REAL,
      recordedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_points_activity_seq
      ON activity_points(activity_id, sequence);
  `);
  return db;
}