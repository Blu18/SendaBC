import type { Activity } from '../db/activities';
import { ACTIVITY_TYPE_LABELS, formatStartedAt } from '../format/activity';
import { formatDuration } from '../format/duration';
import { formatDistance } from '../format/metrics';
import type { NearbyRoute, PopularRoute } from '../routes/api';
import { DIFFICULTY_LABELS } from '../routes/format';

// Textos de las tarjetas de Inicio (spec 013). Cada una trae también lo que dice el lector de
// pantalla (CA-28): las miniaturas se describen con el tipo y la distancia.

const unir = (partes: (string | null | undefined)[]) => partes.filter(Boolean).join(' · ');

// Actividad reciente: tipo, fecha, distancia y duración con el formato del historial (CA-3).
export function activityCardText(a: Pick<Activity, 'type' | 'startedAt' | 'distanceMeters' | 'durationSeconds'>) {
  const type = ACTIVITY_TYPE_LABELS[a.type];
  const date = formatStartedAt(a.startedAt);
  const distance = formatDistance(a.distanceMeters);
  const duration = a.durationSeconds === null ? '—' : formatDuration(a.durationSeconds);
  return {
    type,
    date,
    metrics: unir([distance, duration]),
    thumbnailLabel: `Recorrido de ${type.toLowerCase()}, ${distance}`,
    label: `${type}, ${date}, ${distance}, ${duration}`,
  };
}

// Ruta cercana: nombre, tipo, dificultad, distancia y qué tan lejos está su inicio (CA-9).
export function nearbyRouteText(r: Pick<NearbyRoute, 'name' | 'type' | 'difficulty' | 'distanceMeters' | 'distanceFromCenterMeters' | 'isMine'>) {
  const type = ACTIVITY_TYPE_LABELS[r.type];
  const kind = unir([type, r.difficulty ? DIFFICULTY_LABELS[r.difficulty] : null]);
  const distance = formatDistance(r.distanceMeters);
  const away = `a ${formatDistance(r.distanceFromCenterMeters)} de ti`;
  return {
    name: r.name,
    kind,
    metrics: unir([distance, away]),
    mine: r.isMine,
    thumbnailLabel: `Recorrido de ${type.toLowerCase()}, ${distance}`,
    label: unir([r.name, r.isMine ? 'Tuya' : null, kind, distance, away]),
  };
}

// Ruta popular: posición, nombre, zona, tipo, distancia, dificultad y favoritas (CA-13). Nunca
// quién la guardó (RN-8).
export function popularRouteText(
  r: Pick<PopularRoute, 'name' | 'type' | 'region' | 'difficulty' | 'distanceMeters' | 'favoritesCount' | 'isMine'>,
  posicion: number
) {
  const detail = unir([
    r.region,
    ACTIVITY_TYPE_LABELS[r.type],
    r.difficulty ? DIFFICULTY_LABELS[r.difficulty] : null,
    formatDistance(r.distanceMeters),
  ]);
  const favoritesLabel = `${r.favoritesCount} ${r.favoritesCount === 1 ? 'persona la tiene' : 'personas la tienen'} en favoritas`;
  return {
    rank: String(posicion),
    name: r.name,
    detail,
    mine: r.isMine,
    favorites: String(r.favoritesCount),
    favoritesLabel,
    label: unir([`${posicion}. ${r.name}`, r.isMine ? 'Tuya' : null, detail, favoritesLabel]),
  };
}
