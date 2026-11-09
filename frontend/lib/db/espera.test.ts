import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Worker } from 'node:worker_threads';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  conReintentos,
  ESPERA_BLOQUEO_MS,
  PAUSAS_REINTENTO_MS,
  PRAGMA_ESPERA,
  reintentarSiBloqueada,
  transaccionExclusiva,
} from './espera';
import { createTestDb } from './testing';

// Spec 011, CA-13; plan, R2: iniciar una actividad mientras la recuperación guarda otra.

describe('transaccionExclusiva', () => {
  it('aplica la espera en la conexión de la transacción antes de la tarea', async () => {
    const db = createTestDb();
    let espera: number | undefined;
    await transaccionExclusiva(db, async (tx) => {
      espera = (await tx.getFirstAsync<{ timeout: number }>('PRAGMA busy_timeout'))?.timeout;
    });
    expect(espera).toBe(ESPERA_BLOQUEO_MS);
  });

  it('propaga el error de la tarea', async () => {
    const db = createTestDb();
    await expect(
      transaccionExclusiva(db, async () => {
        throw new Error('falló');
      })
    ).rejects.toThrow('falló');
  });
});

// Como lo rechaza expo-sqlite: el error de la sentencia sale por finalizeAsync.
const bloqueada = () =>
  new Error(
    "Call to function 'NativeStatement.finalizeAsync' has been rejected.\n→ Caused by: Error code : database is locked"
  );

describe('reintentarSiBloqueada', () => {
  it('repite la operación mientras la base esté bloqueada, con las pausas en orden', async () => {
    const operacion = vi
      .fn()
      .mockRejectedValueOnce(bloqueada())
      .mockRejectedValueOnce(bloqueada())
      .mockResolvedValue('guardado');
    const pausas: number[] = [];

    const r = await reintentarSiBloqueada(operacion, PAUSAS_REINTENTO_MS, async (ms) => {
      pausas.push(ms);
    });

    expect(r).toBe('guardado');
    expect(operacion).toHaveBeenCalledTimes(3);
    expect(pausas).toEqual([50, 100]);
  });

  it('se rinde después de 5 intentos y deja pasar el error', async () => {
    const operacion = vi.fn().mockRejectedValue(bloqueada());
    await expect(
      reintentarSiBloqueada(operacion, PAUSAS_REINTENTO_MS, async () => {})
    ).rejects.toThrow(/database is locked/);
    expect(operacion).toHaveBeenCalledTimes(5);
  });

  it('no repite otros errores', async () => {
    const operacion = vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed'));
    await expect(
      reintentarSiBloqueada(operacion, PAUSAS_REINTENTO_MS, async () => {})
    ).rejects.toThrow(/UNIQUE/);
    expect(operacion).toHaveBeenCalledTimes(1);
  });
});

describe('conReintentos', () => {
  it('reintenta runAsync con los mismos argumentos y no toca lo demás', async () => {
    const runAsync = vi
      .fn()
      .mockRejectedValueOnce(bloqueada())
      .mockResolvedValue({ lastInsertRowId: 7, changes: 1 });
    const getAllAsync = vi.fn();
    const db = conReintentos({ runAsync, getAllAsync });

    await expect(db.runAsync('INSERT INTO t VALUES (?)', [1])).resolves.toEqual({
      lastInsertRowId: 7,
      changes: 1,
    });
    expect(runAsync.mock.calls).toEqual([
      ['INSERT INTO t VALUES (?)', [1]],
      ['INSERT INTO t VALUES (?)', [1]],
    ]);
    expect(db.getAllAsync).toBe(getAllAsync);
  });
});

describe('PRAGMA_ESPERA con otra conexión escribiendo', () => {
  let dir: string;
  let ruta: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sendabc-espera-'));
    ruta = join(dir, 'base.db');
    const db = new DatabaseSync(ruta);
    db.exec('PRAGMA journal_mode = WAL; CREATE TABLE t (x INTEGER)');
    db.close();
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  // Otro hilo hace lo que la recuperación: abre una transacción, escribe y tarda en confirmar.
  function bloquear(ms: number) {
    const hilo = new Worker(
      `const { DatabaseSync } = require('node:sqlite');
       const { parentPort, workerData } = require('node:worker_threads');
       const db = new DatabaseSync(workerData.ruta);
       db.exec('BEGIN; INSERT INTO t VALUES (1)');
       parentPort.postMessage('bloqueada');
       setTimeout(() => { db.exec('COMMIT'); db.close(); parentPort.postMessage('libre'); }, workerData.ms);`,
      { eval: true, workerData: { ruta, ms } }
    );
    const bloqueada = new Promise((ok) => hilo.once('message', ok));
    const terminado = new Promise((ok) => hilo.once('exit', ok));
    return { bloqueada, terminado };
  }

  it('sin la espera, escribir falla al momento con database is locked', async () => {
    const hilo = bloquear(300);
    await hilo.bloqueada;
    const db = new DatabaseSync(ruta);
    expect(() => db.exec('INSERT INTO t VALUES (2)')).toThrow(/database is locked/);
    db.close();
    await hilo.terminado;
  });

  it('con la espera, escribir espera a que la otra conexión confirme', async () => {
    const hilo = bloquear(300);
    await hilo.bloqueada;
    const db = new DatabaseSync(ruta);
    db.exec(PRAGMA_ESPERA);
    db.exec('INSERT INTO t VALUES (2)');
    expect(
      db
        .prepare('SELECT x FROM t ORDER BY x')
        .all()
        .map((r) => r.x)
    ).toEqual([1, 2]);
    db.close();
    await hilo.terminado;
  });
});
