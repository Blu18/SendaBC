import type { Activity, ActivityType } from '../db/activities';
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

// Estado de sincronización que se muestra en el historial y en el resumen (spec 005, CA-14).
// "No se pudo subir" es una marca sobre PENDING_SYNC, no un estado propio (RN-3, D6).
export type SyncStatus = 'pending' | 'synced' | 'rejected';

export function syncStatusOf(activity: Pick<Activity, 'status' | 'syncError'>): SyncStatus {
  if (activity.status === 'SYNCED') return 'synced';
  if (activity.syncError !== null) return 'rejected';
  return 'pending';
}

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  pending: 'Pendiente de subir',
  synced: 'Sincronizada',
  rejected: 'No se pudo subir',
};

// Aviso al cerrar sesión con actividades sin subir (spec 005, CA-24). null = no hay que avisar.
export function pendingUploadsWarning(pendientes: number): string | null {
  if (pendientes <= 0) return null;
  return pendientes === 1
    ? 'Tienes 1 actividad sin subir. Se subirá cuando vuelvas a iniciar sesión.'
    : `Tienes ${pendientes} actividades sin subir. Se subirán cuando vuelvas a iniciar sesión.`;
}
