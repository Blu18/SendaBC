// Mínimo de puntos válidos para guardar una actividad (spec 012, RN-1, RN-2, plan D1).
// Copia de backend/src/activity/distancia.ts (`MIN_PUNTOS_VALIDOS`, `contarPuntosValidos`):
// la app y el servidor tienen que decidir lo mismo. Si cambias uno, cambia el otro;
// validPoints.test.ts repite los casos de distancia.spec.ts.
import { isAccurate, type DistancePoint } from './distance';

// Con menos de esto, la actividad se descarta al cerrarse (CA-17, CA-21, CA-22).
export const MIN_VALID_POINTS = 3;

// Puntos que cuentan para la distancia por su precisión: 20 m o mejor, o sin precisión.
// No mira saltos ni puntos viejos, que dependen del orden de los puntos (plan D1).
export function countValidPoints(points: Pick<DistancePoint, 'accuracy'>[]) {
  let n = 0;
  for (const p of points) if (isAccurate(p)) n++;
  return n;
}

// ¿Una actividad con `validPoints` puntos válidos se guarda al cerrarse? (RN-2)
export function debeGuardarse(validPoints: number) {
  return validPoints >= MIN_VALID_POINTS;
}
