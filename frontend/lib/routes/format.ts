import type { ActivityType } from '../db/activities';
import { ACTIVITY_TYPE_LABELS } from '../format/activity';
import { formatDistance } from '../format/metrics';

export type RouteDifficulty = 'EASY' | 'MODERATE' | 'HARD' | 'EXTREME';

// Dificultad en la tarjeta de la ruta (CA-7).
export const DIFFICULTY_LABELS: Record<RouteDifficulty, string> = {
  EASY: 'Fácil',
  MODERATE: 'Moderada',
  HARD: 'Difícil',
  EXTREME: 'Extrema',
};

// Chips del filtro por tipo; null = todas (CA-12).
export const TYPE_FILTER_OPTIONS: { value: ActivityType | null; label: string }[] = [
  { value: null, label: 'Todas' },
  { value: 'HIKING', label: ACTIVITY_TYPE_LABELS.HIKING },
  { value: 'TRAIL_RUNNING', label: ACTIVITY_TYPE_LABELS.TRAIL_RUNNING },
  { value: 'CYCLING', label: ACTIVITY_TYPE_LABELS.CYCLING },
];

// "A 3.42 km de ti" con el formato del resumen de actividad (RN-4). null si no hay ubicación.
export function formatDistanceFromUser(meters: number | null) {
  return meters === null ? null : `A ${formatDistance(meters)} de ti`;
}

// Avisos de la pantalla (CA-13 a CA-16).
export const NEARBY_MESSAGES = {
  empty: 'No hay rutas publicadas cerca de aquí. Mueve el mapa o aumenta la distancia de búsqueda.',
  offline: 'Explorar rutas necesita conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
  error: 'No se pudieron cargar las rutas. Inténtalo de nuevo.',
  noPermission:
    'Sin permiso de ubicación no podemos centrar el mapa en ti ni calcular la distancia hasta cada ruta. Mueve el mapa y toca "Buscar en esta zona".',
} as const;
