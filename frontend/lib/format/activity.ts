import type { ActivityType } from '../db/activities';
import type { ElevationSource } from '../metrics/summary';

// Nombres en pantalla de los tipos de actividad, en el orden del selector (spec 003, CA-1).
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  HIKING: 'Senderismo',
  TRAIL_RUNNING: 'Trail running',
  CYCLING: 'Ciclismo',
};

// Etiqueta de la fuente de la elevación en el resumen (spec 004, CA-12, CA-13).
export const ELEVATION_SOURCE_LABELS: Record<ElevationSource, string> = {
  BAROMETER: 'Elevación medida con barómetro',
  GPS: 'Elevación estimada con GPS',
};

// Ciclismo muestra velocidad; senderismo y trail running, ritmo (spec 004, CA-5).
export const showsSpeed = (type: ActivityType) => type === 'CYCLING';

// Fecha y hora de inicio en la hora local del teléfono: "5 oct 2026, 3:05 p.m.".
export function formatStartedAt(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}
