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
function migrar(db: DatabaseSync) {
  const { user_version } = db.prepare('PRAGMA user_version').get() as { user_version: number };
  db.exec('BEGIN');
  for (const paso of pasosPendientes(user_version)) db.exec(paso.sql);
  db.exec(`PRAGMA user_version = ${DB_VERSION}`);
  db.exec('COMMIT');
}

const columnas = (db: DatabaseSync, tabla: string) =>
  (db.prepare(`PRAGMA table_info(${tabla})`).all() as { name: string }[]).map((c) => c.name);

describe('pasosPendientes (constitución 5.3)', () => {
  it('las versiones van de 1 en 1 y la última es DB_VERSION', () => {
    expect(MIGRATIONS.map((p) => p.version)).toEqual(MIGRATIONS.map((_, i) => i + 1));
    expect(DB_VERSION).toBe(6);
  });

  it('devuelve solo los pasos que faltan, en orden', () => {
    expect(pasosPendientes(0).map((p) => p.version)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(pasosPendientes(5).map((p) => p.version)).toEqual([6]);
    expect(pasosPendientes(6)).toEqual([]);
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

    migrar(db);

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

  it('una base nueva llega a v6 con todos los pasos', () => {
    const db = baseEnVersion(0);
    migrar(db);

    expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 6 });
    expect(columnas(db, 'safety_sessions')).toEqual(expect.arrayContaining(['quiet_ms', 'response_ms']));
  });
});
