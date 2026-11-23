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
  // v5: seguridad (spec 008, plan "SQLite v5").
  // - safety_sessions: la sesión de seguridad de una actividad. server_ack = 1 cuando el servidor
  //   recibió la hora de regreso actual (CA-23). La última alerta se guarda aquí (una activa por
  //   sesión, RN-8): alert_server_id es NULL mientras no se envía (CA-15) y alert_cancelled_at
  //   marca que el usuario la canceló; los ids se conservan para poder enviar la cancelación.
  // - safety_detector: estado del detector de inactividad, en JSON (lib/safety/inactivity.ts).
  // - safety_outbox: bandeja de salida (lib/safety/outbox.ts); payload en JSON, created_at en ms.
  // - emergency_contacts_cache: copia de los contactos para saber sin red si hay activos (CA-8).
  {
    version: 5,
    sql: `
      CREATE TABLE IF NOT EXISTS safety_sessions (
        activity_local_id INTEGER PRIMARY KEY REFERENCES activities(local_id) ON DELETE CASCADE,
        client_generated_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        return_by TEXT,
        server_ack INTEGER NOT NULL DEFAULT 0,
        location_queued_at INTEGER,
        alert_client_id TEXT,
        alert_server_id TEXT,
        alert_triggered_at TEXT,
        alert_cancelled_at TEXT
      );

      CREATE TABLE IF NOT EXISTS safety_detector (
        activity_local_id INTEGER PRIMARY KEY REFERENCES activities(local_id) ON DELETE CASCADE,
        state TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS safety_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        client_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_safety_outbox_user ON safety_outbox(user_id, created_at);

      CREATE TABLE IF NOT EXISTS emergency_contacts_cache (
        user_id TEXT NOT NULL,
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        telegram_name TEXT,
        invite_url TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, id)
      );
    `,
  },
  // v6: estabilidad (spec 011, plan "SQLite, versión 6").
  // - app_settings: ajustes de la app por cuenta, como los umbrales de inactividad (CA-50).
  // - route_cache: lo último consultado de rutas, para verlo sin conexión (CA-53). kind es
  //   'nearby', 'detail' o 'favorites'; cache_key es el id de la ruta en 'detail' y 'last' en los
  //   otros dos. payload en JSON y saved_at en ISO 8601.
  // - safety_sessions.quiet_ms y response_ms: los umbrales elegidos, copiados al iniciar la
  //   sesión (CA-51). NULL en sesiones de antes de v6: usan los valores por defecto (CA-52).
  {
    version: 6,
    sql: `
      CREATE TABLE IF NOT EXISTS app_settings (
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (user_id, key)
      );

      CREATE TABLE IF NOT EXISTS route_cache (
        user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        cache_key TEXT NOT NULL,
        payload TEXT NOT NULL,
        saved_at TEXT NOT NULL,
        PRIMARY KEY (user_id, kind, cache_key)
      );

      ALTER TABLE safety_sessions ADD COLUMN quiet_ms INTEGER;
      ALTER TABLE safety_sessions ADD COLUMN response_ms INTEGER;
    `,
  },
  // v7: altura más alta de cada actividad, para filtrar Mis actividades (spec 015, CA-5, RN-5;
  // plan, D1 y "Cambios a SQLite").
  // - peak_altitude_meters: la cumbre del perfil de la spec 014. NULL si no tiene perfil o si
  //   todavía no se calcula.
  // - peak_calculated: 1 si ya se calculó (aunque dé NULL); 0 si falta. Las actividades de antes de
  //   v7 quedan en 0 y computeMissingPeaks las calcula al abrir la app.
  {
    version: 7,
    sql: `
      ALTER TABLE activities ADD COLUMN peak_altitude_meters REAL;
      ALTER TABLE activities ADD COLUMN peak_calculated INTEGER NOT NULL DEFAULT 0;
    `,
  },
  // v8: borra una sola vez las actividades terminadas con menos de 3 puntos válidos (spec 012,
  // CA-25, RN-5; plan D4). Solo borra datos, el esquema no cambia.
  // - Punto válido = precisión de 20 m o mejor, o sin precisión (RN-1). El 20 va escrito aquí y no
  //   como MAX_ACCURACY_M, porque un paso ya publicado no debe cambiar (constitución 5.3).
  // - Incluye las SYNCED: el servidor también las borra (migración borrar_actividades_cortas).
  // - No toca las que están en RECORDING: al abrir la app, cerrarHuerfanas las cierra y descarta
  //   las cortas después de terminar su sesión de seguridad (CA-22, plan D3).
  // - Sus puntos, lecturas del barómetro y sesiones de seguridad se borran en cascada.
  {
    version: 8,
    sql: `
      DELETE FROM activities
      WHERE status != 'RECORDING'
        AND (
          SELECT COUNT(*) FROM activity_points p
          WHERE p.activity_id = activities.local_id
            AND (p.accuracy IS NULL OR p.accuracy <= 20)
        ) < 3;
    `,
  },
];

// Versión del esquema local (PRAGMA user_version): la del último paso.
export const DB_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

// Pasos que faltan para llevar una base en `version` a DB_VERSION, en orden. sqlite.ts los aplica
// en una transacción; las pruebas, igual, para comprobar la migración desde una versión vieja.
export function pasosPendientes(version: number) {
  return MIGRATIONS.filter((paso) => paso.version > version);
}
