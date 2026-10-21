import type { ActivityType } from '../db/activities';
import type { RouteDifficulty } from './format';

// Spec 007, RN-6: la dificultad la calcula la app, no la elige quien publica. Es la misma regla
// que backend/src/route/difficulty.ts (plan D1): el formulario la muestra antes de publicar y el
// servidor la vuelve a calcular al guardar. Las dos copias se prueban con los mismos casos.

const NIVELES: RouteDifficulty[] = ['EASY', 'MODERATE', 'HARD', 'EXTREME'];

// Máximos inclusivos de Fácil, Moderada y Difícil; lo que los supera es Extrema.
const UMBRALES: Record<'A_PIE' | 'CICLISMO', { distanciaM: number[]; elevacionM: number[] }> = {
  A_PIE: { distanciaM: [8_000, 15_000, 30_000], elevacionM: [300, 700, 1_500] },
  CICLISMO: { distanciaM: [15_000, 35_000, 75_000], elevacionM: [400, 900, 1_800] },
};

function nivel(valor: number, maximos: number[]): number {
  const i = maximos.findIndex((max) => valor <= max);
  return i === -1 ? maximos.length : i;
}

/** El nivel más alto que alcanza la ruta por distancia o por elevación (RN-6). */
export function dificultadDe(
  type: ActivityType,
  distanceMeters: number,
  elevationGainMeters: number
): RouteDifficulty {
  const umbrales = UMBRALES[type === 'CYCLING' ? 'CICLISMO' : 'A_PIE'];
  return NIVELES[
    Math.max(
      nivel(distanceMeters, umbrales.distanciaM),
      nivel(elevationGainMeters, umbrales.elevacionM)
    )
  ];
}
