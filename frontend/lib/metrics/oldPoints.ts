// Copia de backend/src/route/recorrido.ts, `sinPuntosViejos` (spec 007, CA-28, RN-10), para
// recalcular en el teléfono la distancia de las actividades con puntos viejos con el mismo
// criterio que el servidor (spec 011, CA-17, RN-11, plan D7). Si cambias uno, cambia el otro:
// oldPoints.test.ts repite los casos de recorrido.spec.ts.

// Mismo margen que se usa al iniciar para descartar una ubicación vieja (spec 003, RN-5).
export const OLD_POINT_MARGIN_MS = 30_000;

/**
 * Quita del principio los puntos de antes del inicio de la actividad. Si quedaran menos de 2
 * puntos, el reloj del teléfono estaba desfasado y se conservan todos.
 */
export function withoutOldPoints<T extends { recordedAt: string }>(points: T[], startedAt: string): T[] {
  const limit = Date.parse(startedAt) - OLD_POINT_MARGIN_MS;
  const first = points.findIndex((p) => Date.parse(p.recordedAt) >= limit);
  if (first === -1 || points.length - first < 2) return points;
  return points.slice(first);
}

// ¿La actividad empieza con algún punto viejo? Solo esas se recalculan (RN-11).
export function hasOldPoints(points: { recordedAt: string }[], startedAt: string) {
  return withoutOldPoints(points, startedAt).length < points.length;
}
