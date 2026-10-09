// Pasos de migración del esquema local, en orden. Solo SQL, sin dependencias de React Native:
// sqlite.ts los aplica en el teléfono y las pruebas los aplican con node:sqlite.
// Para cambiar el esquema, agrega un paso al final; nunca edites uno existente
// (constitución 5.3).
export const MIGRATIONS: { version: number; sql: string }[] = [
  // v1: tablas originales. IF NOT EXISTS porque instalaciones previas ya las tienen con user_version = 0.
  {
    version: 1,
    sql: `
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
    `,
  },
  // v2: dueño de la actividad (spec 003, RN-4). Nulo en actividades grabadas antes de v2.
  {
    version: 2,
    sql: `
      ALTER TABLE activities ADD COLUMN user_id TEXT;
      CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
    `,
  },
  // v3: métricas de la actividad y lecturas del barómetro (spec 004, CA-14, CA-18).
  // distance_meters NULL en una actividad terminada = métricas pendientes de calcular.
  // elevation_source: 'BAROMETER' | 'GPS'. relative_altitude_m solo existe en iOS.
  {
    version: 3,
    sql: `
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
    `,
  },
  // v4: sincronización con el servidor (spec 005). server_id: id de la actividad en el
  // servidor, al subirla o recuperarla. sync_error: NULL = sin error; con texto = el servidor
  // la rechazó ("No se pudo subir", CA-11), sin cambiar su estado PENDING_SYNC (D6).
  {
    version: 4,
    sql: `
      ALTER TABLE activities ADD COLUMN server_id TEXT;
      ALTER TABLE activities ADD COLUMN sync_error TEXT;

      CREATE INDEX IF NOT EXISTS idx_activities_sync ON activities(user_id, status);
    `,
  },
];

// Versión del esquema local (PRAGMA user_version): la del último paso.
export const DB_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
