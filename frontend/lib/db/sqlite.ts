import * as SQLite from 'expo-sqlite';

// Versión del esquema local (PRAGMA user_version). Súbela al agregar un paso en migrate().
const DB_VERSION = 4;

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

async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DB_VERSION) return;

  await db.withExclusiveTransactionAsync(async (tx) => {
    // v1: tablas originales. IF NOT EXISTS porque instalaciones previas ya las tienen con user_version = 0.
    if (version < 1) {
      await tx.execAsync(`
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
      version = 1;
    }

    // v2: dueño de la actividad (spec 003, RN-4). Nulo en actividades grabadas antes de v2.
    if (version < 2) {
      await tx.execAsync(`
        ALTER TABLE activities ADD COLUMN user_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
      `);
      version = 2;
    }

    // v3: métricas de la actividad y lecturas del barómetro (spec 004, CA-14, CA-18).
    // distance_meters NULL en una actividad terminada = métricas pendientes de calcular.
    // elevation_source: 'BAROMETER' | 'GPS'. relative_altitude_m solo existe en iOS.
    if (version < 3) {
      await tx.execAsync(`
        ALTER TABLE activities ADD COLUMN elevation_source TEXT;
        ALTER TABLE activities ADD COLUMN distance_meters REAL;
        ALTER TABLE activities ADD COLUMN duration_seconds INTEGER;
        ALTER TABLE activities ADD COLUMN elevation_gain_meters REAL;
        ALTER TABLE activities ADD COLUMN elevation_loss_meters REAL;

        CREATE TABLE IF NOT EXISTS barometer_readings (
          local_id INTEGER PRIMARY KEY AUTOINCREMENT,
          activity_id INTEGER NOT NULL REFERENCES activities(local_id) ON DELETE CASCADE,
          recorded_at TEXT NOT NULL,
          pressure_hpa REAL NOT NULL,
          relative_altitude_m REAL
        );

        CREATE INDEX IF NOT EXISTS idx_baro_activity_time
          ON barometer_readings(activity_id, recorded_at);
      `);
      version = 3;
    }

    // v4: sincronización con el servidor (spec 005). server_id: id de la actividad en el
    // servidor, al subirla o recuperarla. sync_error: NULL = sin error; con texto = el servidor
    // la rechazó ("No se pudo subir", CA-11), sin cambiar su estado PENDING_SYNC (D6).
    if (version < 4) {
      await tx.execAsync(`
        ALTER TABLE activities ADD COLUMN server_id TEXT;
        ALTER TABLE activities ADD COLUMN sync_error TEXT;

        CREATE INDEX IF NOT EXISTS idx_activities_sync ON activities(user_id, status);
      `);
      version = 4;
    }

    await tx.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
  });
}
