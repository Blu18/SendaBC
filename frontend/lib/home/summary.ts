import type { ActivityTotals } from '../db/activities';
import { formatDistance, formatElevation } from '../format/metrics';

// Resumen de los últimos 7 días en Inicio (spec 013, CA-6, RN-4).

const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

// "Últimos 7 días" son las 7 × 24 h anteriores a `ahora`, no la semana del calendario (RN-4).
// Devuelve el inicio del periodo en ISO 8601 UTC, como se guarda startedAt.
export function inicioDeUltimos7Dias(ahora: Date): string {
  return new Date(ahora.getTime() - SIETE_DIAS_MS).toISOString();
}

// Duración total en horas y minutos: "45 min", "1 h", "5 h 12 min". Para un total de varias
// actividades se lee mejor que "05:12:00", que parece una hora del día.
export function formatTotalDuration(totalSeconds: number): string {
  const minutos = Math.max(0, Math.round(totalSeconds / 60));
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

export type WeekSummaryText = {
  distance: string; // "23.40 km"; sin distancia, "0 km"
  activities: string; // "1 actividad", "4 actividades"
  duration: string; // "5 h 12 min"
  elevation: string; // "+860 m subidos"
  empty: boolean; // sin actividades en el periodo: Inicio invita a empezar (CA-6)
};

// Textos de la franja de totales. Distancia y elevación usan los formatos de la spec 004.
export function weekSummaryText(totals: ActivityTotals): WeekSummaryText {
  return {
    distance: totals.distanceMeters > 0 ? formatDistance(totals.distanceMeters) : '0 km',
    activities: `${totals.count} ${totals.count === 1 ? 'actividad' : 'actividades'}`,
    duration: formatTotalDuration(totals.durationSeconds),
    elevation: `+${formatElevation(totals.elevationGainMeters)} subidos`,
    empty: totals.count === 0,
  };
}
