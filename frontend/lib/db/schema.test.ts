import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { DB_VERSION, MIGRATIONS, pasosPendientes } from './schema';

// Una base como la de un teléfono en `version`: los pasos hasta esa versión y su user_version.
function baseEnVersion(version: number) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const paso of MIGRATIONS.filter((p) => p.version <= version)) db.exec(paso.sql);
  db.exec(`PRAGMA user_version = ${version}`);
  return db;
}

// Lo mismo que hace sqlite.ts al abrir la base: los pasos que faltan, en una transacción.
// `hasta` sirve para probar un paso viejo sin que los posteriores cambien sus datos.
function migrar(db: DatabaseSync, hasta = DB_VERSION) {
  const { user_version } = db.prepare('PRAGMA user_version').get() as { user_version: number };
  db.exec('BEGIN');
  for (const paso of pasosPendientes(user_version).filter((p) => p.version <= hasta)) {
    db.exec(paso.sql);
  }
  db.exec(`PRAGMA user_version = ${hasta}`);
  db.exec('COMMIT');
}

const columnas = (db: DatabaseSync, tabla: string) =>
  (db.prepare(`PRAGMA table_info(${tabla})`).all() as { name: string }[]).map((c) => c.name);

describe('pasosPendientes (constitución 5.3)', () => {
  it('las versiones van de 1 en 1 y la última es DB_VERSION', () => {
    expect(MIGRATIONS.map((p) => p.version)).toEqual(MIGRATIONS.map((_, i) => i + 1));
    expect(DB_VERSION).toBe(8);
  });

  it('devuelve solo los pasos que faltan, en orden', () => {
    expect(pasosPendientes(0).map((p) => p.version)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(pasosPendientes(5).map((p) => p.version)).toEqual([6, 7, 8]);
    expect(pasosPendientes(8)).toEqual([]);
  });
});

describe('SQLite v6 (spec 011, CA-50, CA-53; constitución 5.3)', () => {
  it('migra una base v5 con datos sin perderlos', () => {
    const db = baseEnVersion(5);
    db.exec(`
      INSERT INTO activities (client_generated_id, type, status, startedAt, user_id)
        VALUES ('act-1', 'HIKING', 'PENDING_SYNC', '2026-11-01T15:00:00.000Z', 'usuario-a');
      INSERT INTO safety_sessions (activity_local_id, client_generated_id, user_id, return_by)
        VALUES (1, 'ses-1', 'usuario-a', '2026-11-01T20:00:00.000Z');
    `);

    migrar(db, 6);

    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 6 });
    expect({ ...(db.prepare('SELECT client_generated_id, status FROM activities').get() as object) }).toEqual({
      client_generated_id: 'act-1',
      status: 'PENDING_SYNC',
    });
    // Las sesiones de antes de v6 quedan sin umbrales: usan los valores por defecto (CA-52).
    expect({
      ...(db.prepare('SELECT client_generated_id, return_by, quiet_ms, response_ms FROM safety_sessions').get() as object),
    }).toEqual({
      client_generated_id: 'ses-1',
      return_by: '2026-11-01T20:00:00.000Z',
      quiet_ms: null,
      response_ms: null,
    });
  });

  it('crea app_settings y route_cache, y agrega los umbrales a safety_sessions', () => {
    const db = baseEnVersion(5);
    migrar(db);

    expect(columnas(db, 'app_settings')).toEqual(['user_id', 'key', 'value']);
    expect(columnas(db, 'route_cache')).toEqual(['user_id', 'kind', 'cache_key', 'payload', 'saved_at']);
    expect(columnas(db, 'safety_sessions')).toEqual(expect.arrayContaining(['quiet_ms', 'response_ms']));
  });

  it('app_settings tiene un valor por cuenta y clave', () => {
    const db = baseEnVersion(5);
    migrar(db);
    const guardar = db.prepare(
      `INSERT INTO app_settings (user_id, key, value) VALUES (?, ?, ?)
       ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value`
    );

    guardar.run('usuario-a', 'inactividad', '{"quietMin":20}');
    guardar.run('usuario-a', 'inactividad', '{"quietMin":30}');
    guardar.run('usuario-b', 'inactividad', '{"quietMin":10}');

    expect(
      db.prepare('SELECT user_id, value FROM app_settings ORDER BY user_id').all().map((r) => ({ ...(r as object) }))
    ).toEqual([
      { user_id: 'usuario-a', value: '{"quietMin":30}' },
      { user_id: 'usuario-b', value: '{"quietMin":10}' },
    ]);
  });

  it('route_cache separa por cuenta, tipo y clave (RN-14)', () => {
    const db = baseEnVersion(5);
    migrar(db);
    const guardar = db.prepare(
      `INSERT INTO route_cache (user_id, kind, cache_key, payload, saved_at) VALUES (?, ?, ?, ?, ?)`
    );

    guardar.run('usuario-a', 'nearby', 'last', '[]', '2026-11-07T00:00:00.000Z');
    guardar.run('usuario-a', 'detail', 'r-1', '{}', '2026-11-07T00:00:00.000Z');
    guardar.run('usuario-b', 'nearby', 'last', '[]', '2026-11-07T00:00:00.000Z');

    expect(() => guardar.run('usuario-a', 'nearby', 'last', '[1]', '2026-11-07T01:00:00.000Z')).toThrow(
      /UNIQUE/
    );
    expect(db.prepare('SELECT count(*) AS n FROM route_cache').get()).toEqual({ n: 3 });
  });

  it('una base nueva llega a la última versión con todos los pasos', () => {
    const db = baseEnVersion(0);
    migrar(db);

    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: DB_VERSION });
    expect(columnas(db, 'safety_sessions')).toEqual(expect.arrayContaining(['quiet_ms', 'response_ms']));
  });
});

describe('SQLite v7 (spec 015, CA-5, RN-5; plan, D1)', () => {
  it('migra una base v6 con actividades: quedan sin cumbre y por calcular', () => {
    const db = baseEnVersion(6);
    db.exec(`
      INSERT INTO activities (client_generated_id, type, status, startedAt, user_id, distance_meters)
        VALUES ('act-1', 'HIKING', 'SYNCED', '2026-11-01T15:00:00.000Z', 'usuario-a', 5740);
    `);

    migrar(db, 7);

    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 7 });
    expect(columnas(db, 'activities')).toEqual(expect.arrayContaining(['peak_altitude_meters', 'peak_calculated']));
    expect({
      ...(db
        .prepare('SELECT client_generated_id, distance_meters, peak_altitude_meters, peak_calculated FROM activities')
        .get() as object),
    }).toEqual({ client_generated_id: 'act-1', distance_meters: 5740, peak_altitude_meters: null, peak_calculated: 0 });
  });
});

describe('SQLite v8 (spec 012, CA-25, RN-5; plan, D4)', () => {
  // Inserta una actividad con puntos de las precisiones dadas, una lectura del barómetro y una
  // sesión de seguridad, y devuelve su local_id.
  function actividad(
    db: DatabaseSync,
    id: string,
    status: 'RECORDING' | 'PENDING_SYNC' | 'SYNCED',
    precisiones: (number | null)[]
  ) {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO activities (client_generated_id, type, status, startedAt, user_id, server_id)
         VALUES (?, 'HIKING', ?, '2026-11-01T15:00:00.000Z', 'usuario-a', ?)`
      )
      .run(id, status, status === 'SYNCED' ? `srv-${id}` : null);
    const localId = Number(lastInsertRowid);
    const punto = db.prepare(
      `INSERT INTO activity_points (activity_id, sequence, latitude, longitude, accuracy, recordedAt)
       VALUES (?, ?, 31.86, -116.59, ?, '2026-11-01T15:00:01.000Z')`
    );
    precisiones.forEach((accuracy, i) => punto.run(localId, i + 1, accuracy));
    db.prepare(
      `INSERT INTO barometer_readings (activity_id, recorded_at, pressure_hpa, relative_altitude_m)
       VALUES (?, '2026-11-01T15:00:01.000Z', 1013, 0)`
    ).run(localId);
    db.prepare(
      'INSERT INTO safety_sessions (activity_local_id, client_generated_id, user_id) VALUES (?, ?, ?)'
    ).run(localId, `ses-${id}`, 'usuario-a');
    return localId;
  }

  const ids = (db: DatabaseSync) =>
    (
      db.prepare('SELECT client_generated_id AS id FROM activities ORDER BY local_id').all() as {
        id: string;
      }[]
    ).map((r) => r.id);
  const cuenta = (db: DatabaseSync, tabla: string) =>
    (db.prepare(`SELECT count(*) AS n FROM ${tabla}`).get() as { n: number }).n;

  function baseV7ConActividades() {
    const db = baseEnVersion(7);
    actividad(db, 'pendiente-sin-puntos', 'PENDING_SYNC', []);
    actividad(db, 'subida-2-validos', 'SYNCED', [4, 8, 30]);
    actividad(db, 'pendiente-1-impreciso', 'PENDING_SYNC', [4, 25, 8]);
    actividad(db, 'pendiente-3-validos', 'PENDING_SYNC', [4, 20, null]);
    actividad(db, 'subida-3-de-5', 'SYNCED', [30, 4, 50, 5, 6]);
    actividad(db, 'grabando-sin-puntos', 'RECORDING', []);
    return db;
  }

  it('borra las terminadas con menos de 3 puntos válidos, subidas o no', () => {
    const db = baseV7ConActividades();

    migrar(db);

    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 8 });
    expect(ids(db)).toEqual(['pendiente-3-validos', 'subida-3-de-5', 'grabando-sin-puntos']);
  });

  it('borra en cascada sus puntos, lecturas del barómetro y sesiones, y no toca las demás', () => {
    const db = baseV7ConActividades();

    migrar(db);

    // Quedan los 3 + 5 puntos de las dos que se conservan; la que graba no tiene.
    expect(cuenta(db, 'activity_points')).toBe(8);
    expect(cuenta(db, 'barometer_readings')).toBe(3);
    expect(cuenta(db, 'safety_sessions')).toBe(3);
  });

  it('no toca la que se está grabando: la resuelve cerrarHuerfanas al abrir la app (CA-22)', () => {
    const db = baseV7ConActividades();

    migrar(db);

    expect({
      ...(db
        .prepare(
          `SELECT status FROM activities WHERE client_generated_id = 'grabando-sin-puntos'`
        )
        .get() as object),
    }).toEqual({ status: 'RECORDING' });
  });

  it('corre una sola vez: en v8 no vuelve a borrar (RN-5)', () => {
    const db = baseV7ConActividades();
    migrar(db);
    // Una actividad corta que aparezca después, p. ej. recuperada de un servidor sin migrar.
    actividad(db, 'despues', 'SYNCED', [4]);

    expect(pasosPendientes(8)).toEqual([]);
    migrar(db);

    expect(ids(db)).toContain('despues');
  });

  it('una base nueva llega a v8 sin errores', () => {
    const db = baseEnVersion(0);
    migrar(db);
    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 8 });
  });
});
