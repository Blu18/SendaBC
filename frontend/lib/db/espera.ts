// Cuánto espera una conexión a que otra suelte la base antes de fallar con
// `database is locked` (spec 011, CA-13; plan, R2). Sin esto SQLite falla al momento.
export const ESPERA_BLOQUEO_MS = 5000;
export const PRAGMA_ESPERA = `PRAGMA busy_timeout = ${ESPERA_BLOQUEO_MS}`;

// Pausas antes de cada reintento: 5 intentos en total, poco más de 1 s en el peor caso.
export const PAUSAS_REINTENTO_MS = [50, 100, 200, 400];

const estaBloqueada = (error: unknown) =>
  error instanceof Error && /database is locked/i.test(error.message);

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

// Hay un caso en que SQLite falla sin esperar, aunque tenga busy_timeout: la conexión tiene
// una vista vieja de la base porque la otra confirmó en medio. Repetir la sentencia toma una
// vista nueva (spec 011, CA-13; plan, R2). Otros errores no se reintentan.
export async function reintentarSiBloqueada<T>(
  operacion: () => Promise<T>,
  pausas = PAUSAS_REINTENTO_MS,
  pausa = esperar
): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await operacion();
    } catch (error) {
      if (!estaBloqueada(error) || intento >= pausas.length) throw error;
      await pausa(pausas[intento]);
    }
  }
}

// Reintenta las escrituras de la conexión principal. Fuera de las transacciones todas van por
// runAsync, una sentencia por llamada: si falla no deja nada, así que repetirla no duplica.
export function conReintentos<D extends { runAsync: (...args: never[]) => Promise<unknown> }>(
  db: D
): D {
  const original = db.runAsync.bind(db) as D['runAsync'];
  db.runAsync = ((...args: Parameters<D['runAsync']>) =>
    reintentarSiBloqueada(() => original(...args))) as D['runAsync'];
  return db;
}

type Ejecuta = { execAsync(sql: string): Promise<void> };
type ConTransaccion<T> = {
  withExclusiveTransactionAsync(task: (tx: T) => Promise<void>): Promise<void>;
};

// expo-sqlite abre otra conexión para cada transacción exclusiva, sin los PRAGMA de la
// principal. Mientras una escribe, la otra tiene que esperar en vez de fallar: p. ej. al
// iniciar una actividad mientras la recuperación guarda los puntos de otra (spec 005).
export function transaccionExclusiva<T extends Ejecuta>(
  db: ConTransaccion<T>,
  task: (tx: T) => Promise<void>
) {
  return db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(PRAGMA_ESPERA);
    await task(tx);
  });
}
