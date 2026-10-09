import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { DB_VERSION, MIGRATIONS } from './schema';

type Params = SQLInputValue[];

export type TestDb = {
  raw: DatabaseSync;
  runAsync(sql: string, params?: Params): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params?: Params): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: Params): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
  prepareAsync(sql: string): Promise<{
    executeAsync(params: Params): Promise<void>;
    finalizeAsync(): Promise<void>;
  }>;
  withExclusiveTransactionAsync(task: (tx: TestDb) => Promise<void>): Promise<void>;
};

// Solo para pruebas: una base SQLite en memoria (node:sqlite) con el esquema real y la parte
// de la interfaz de expo-sqlite que usa lib/db. Permite probar las consultas sin el teléfono.
export function createTestDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const paso of MIGRATIONS) db.exec(paso.sql);
  db.exec(`PRAGMA user_version = ${DB_VERSION}`);

  // node:sqlite devuelve objetos sin prototipo; se copian para compararlos con toEqual.
  const plano = <T>(row: unknown) => (row ? ({ ...(row as object) } as T) : null);

  const api: TestDb = {
    raw: db,
    async runAsync(sql: string, params: Params = []) {
      const r = db.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async getAllAsync<T>(sql: string, params: Params = []) {
      return db
        .prepare(sql)
        .all(...params)
        .map((row) => plano<T>(row) as T);
    },
    async getFirstAsync<T>(sql: string, params: Params = []) {
      return plano<T>(db.prepare(sql).get(...params));
    },
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async prepareAsync(sql: string) {
      const statement = db.prepare(sql);
      return {
        async executeAsync(params: Params) {
          statement.run(...params);
        },
        async finalizeAsync() {},
      };
    },
    async withExclusiveTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task(api);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return api;
}
