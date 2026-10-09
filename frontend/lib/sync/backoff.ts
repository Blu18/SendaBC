// Espera entre reintentos de sincronización (spec 005, CA-9): 30 s, 1 min, 2 min, 4 min,
// 8 min y de ahí en adelante 15 min, sin límite de intentos.
export const RETRY_BASE_MS = 30_000;
export const RETRY_MAX_MS = 15 * 60_000;

// attempt = cuántos intentos seguidos han fallado antes de este (0 para el primer reintento).
export function retryDelayMs(attempt: number) {
  const n = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
  // 2^n crece hasta Infinity sin romperse: min() lo deja en el máximo.
  return Math.min(RETRY_BASE_MS * 2 ** n, RETRY_MAX_MS);
}
