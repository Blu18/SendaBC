import type { ActivityType } from '../db/activities';
import { ACTIVITY_TYPE_LABELS } from '../format/activity';
import { formatDistance } from '../format/metrics';
import type { RouteStatus } from './api';

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
  savedEmpty: 'Tu última búsqueda no tenía rutas de este tipo.', // spec 011, CA-53
  error: 'No se pudieron cargar las rutas. Inténtalo de nuevo.',
  noPermission:
    'Sin permiso de ubicación no podemos centrar el mapa en ti ni calcular la distancia hasta cada ruta. Mueve el mapa y toca "Buscar en esta zona".',
} as const;

// Avisos del detalle de una ruta (spec 007, CA-13, CA-14).
export const DETAIL_MESSAGES = {
  offline:
    'Ver el detalle de una ruta necesita conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
  error: 'No se pudo cargar la ruta. Inténtalo de nuevo.',
  unavailable: 'Esta ruta ya no está disponible.',
} as const;

// Estado de una ruta propia en "Mis rutas" (spec 007, CA-21).
export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  PUBLISHED: 'Publicada',
  ARCHIVED: 'Archivada',
};

// Fecha de publicación en "Mis rutas": "20 oct 2026" (CA-21).
export function formatPublishedAt(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { dateStyle: 'medium' });
}

// Marca de una favorita cuya ruta se archivó o se borró (CA-19).
export const UNAVAILABLE_LABEL = 'Ya no disponible';

// Avisos de "Mis rutas" y "Mis favoritas" (CA-18, CA-21).
export const MY_ROUTES_MESSAGES = {
  empty:
    'Aún no has publicado rutas. Abre una actividad sincronizada de al menos 1.5 km en "Mis actividades" y toca "Publicar como ruta".',
  offline: 'Ver tus rutas necesita conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
  error: 'No se pudieron cargar tus rutas. Inténtalo de nuevo.',
} as const;

export const FAVORITES_MESSAGES = {
  empty:
    'Aún no tienes rutas favoritas. En "Rutas" toca una ruta, luego "Ver detalle" y "Guardar en favoritas".',
  offline:
    'Ver tus favoritas necesita conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
  error: 'No se pudieron cargar tus favoritas. Inténtalo de nuevo.',
} as const;
