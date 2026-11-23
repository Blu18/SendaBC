import type { Activity } from '../db/activities';
import { formatDistance } from '../format/metrics';
import { localMonthKey, MONTH_NAMES } from './context';

// Mis actividades agrupadas por mes (spec 014, CA-13 a CA-15, RN-8). Sin React Native, para
// probarlo con Vitest (constitución 6.1).

export type MonthSection<T extends Pick<Activity, 'startedAt' | 'distanceMeters'> = Activity> = {
  key: string; // "2026-10", mes local de inicio
  title: string; // "Octubre", o "Diciembre 2025" si no es el año en curso (CA-14)
  count: number;
  distanceMeters: number; // suma de las distancias guardadas (RN-8)
  data: T[];
};

/**
 * Agrupa las actividades por el mes local en que empezaron. Los meses van del más reciente al más
 * antiguo y, dentro de cada mes, de la más nueva a la más vieja (CA-13). Una actividad sin
 * distancia calculada cuenta en el número del mes, pero no suma distancia.
 */
export function groupByMonth<T extends Pick<Activity, 'startedAt' | 'distanceMeters'>>(
  activities: T[],
  now: Date
): MonthSection<T>[] {
  const groups = new Map<string, T[]>();
  for (const a of activities) {
    const key = localMonthKey(a.startedAt);
    const list = groups.get(key);
    if (list) list.push(a);
    else groups.set(key, [a]);
  }

  const currentYear = now.getFullYear();
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, list]) => {
      const data = [...list].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
      const [year, month] = key.split('-').map(Number);
      const name = MONTH_NAMES[month - 1];
      const capitalized = name[0].toUpperCase() + name.slice(1);
      return {
        key,
        title: year === currentYear ? capitalized : `${capitalized} ${year}`,
        count: data.length,
        distanceMeters: data.reduce((sum, a) => sum + (a.distanceMeters ?? 0), 0),
        data,
      };
    });
}

// "3 actividades, 24.60 km" (CA-14). La distancia usa el formato de la spec 004, como el total de
// 7 días de Inicio (spec 013).
export function monthTotalsText(section: Pick<MonthSection, 'count' | 'distanceMeters'>): string {
  const count = `${section.count} ${section.count === 1 ? 'actividad' : 'actividades'}`;
  const distance = section.distanceMeters > 0 ? formatDistance(section.distanceMeters) : '0 km';
  return `${count}, ${distance}`;
}
