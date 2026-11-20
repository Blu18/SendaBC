// Con extensión .ts para que el script de recálculo (node prisma/scripts/...) pueda cargarlo.
import { haversine, type PuntoPerfil } from './elevation-profile.ts';

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

// Misma velocidad que usa la app para no sumar un salto a la distancia (spec 004, CA-25).
export const MAX_VELOCIDAD_MS = 50;

const esSalto = (a: PuntoRecorrido, b: PuntoRecorrido) => {
  const segundos = Math.max(
    1,
    (b.recordedAt.getTime() - a.recordedAt.getTime()) / 1000,
  );
  return haversine(a, b) / segundos > MAX_VELOCIDAD_MS;
};

/**
 * Quita los saltos de ubicación imposibles para que el mapa y el perfil de la ruta no los
 * dibujen (spec 011, CA-15, CA-16, plan D8). Descarta cada punto que implica más de
 * MAX_VELOCIDAD_MS respecto al último conservado. Si así quedara menos de la mitad (p. ej.
 * el primer punto era el falso), usa el tramo sin saltos más largo entre puntos seguidos.
 * Si tampoco quedan 2 puntos, conserva todos.
 */
export function sinSaltos<T extends PuntoRecorrido>(puntos: T[]): T[] {
  if (puntos.length < 2) return puntos;

  const conservados = [puntos[0]];
  for (const p of puntos.slice(1)) {
    if (!esSalto(conservados.at(-1)!, p)) conservados.push(p);
  }
  if (conservados.length >= 2 && conservados.length * 2 >= puntos.length) {
    return conservados;
  }

  let mejor: T[] = [];
  let tramo = [puntos[0]];
  for (const p of puntos.slice(1)) {
    if (esSalto(tramo.at(-1)!, p)) {
      if (tramo.length > mejor.length) mejor = tramo;
      tramo = [p];
    } else {
      tramo.push(p);
    }
  }
  if (tramo.length > mejor.length) mejor = tramo;
  return mejor.length >= 2 ? mejor : puntos;
}
