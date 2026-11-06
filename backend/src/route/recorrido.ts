import type { PuntoPerfil } from './elevation-profile.js';

// Mismo margen que usa la app para descartar una ubicación vieja al iniciar (spec 003, RN-5).
export const MARGEN_PUNTO_VIEJO_MS = 30_000;

export type PuntoRecorrido = PuntoPerfil & {
  sequence: number;
  recordedAt: Date;
};

/**
 * Quita del principio los puntos de antes del inicio de la actividad (spec 007, CA-28, RN-10).
 * Las actividades grabadas antes de la spec 003 CA-13 pueden empezar con una ubicación guardada.
 * Si quedaran menos de 2 puntos, el reloj del teléfono estaba desfasado y se conservan todos.
 */
export function sinPuntosViejos<T extends PuntoRecorrido>(
  puntos: T[],
  startedAt: Date,
): T[] {
  const limite = startedAt.getTime() - MARGEN_PUNTO_VIEJO_MS;
  const primero = puntos.findIndex((p) => p.recordedAt.getTime() >= limite);
  if (primero === -1 || puntos.length - primero < 2) return puntos;
  return puntos.slice(primero);
}
