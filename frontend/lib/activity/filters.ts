import type { Activity, ActivityType } from '../db/activities';
import { ACTIVITY_TYPE_LABELS } from '../format/activity';
import { localMonthKey } from './context';
import { groupByMonth, monthTitle } from './months';

// Filtros de Mis actividades (spec 015, CA-2 a CA-9, RN-3, RN-4, RN-8; plan, "Hooks / estado").
// Se aplican en memoria sobre las actividades ya leídas (plan, D2). Sin React Native, para
// probarlos con Vitest (constitución 6.1).

// Lo que el filtro necesita de una actividad. peakAltitudeMeters es la cumbre del perfil de la
// spec 014, guardada en SQLite (plan, D1); null si no tiene perfil o falta calcularla.
export type FilterableActivity = Pick<Activity, 'type' | 'startedAt' | 'distanceMeters'> & {
  peakAltitudeMeters: number | null;
};

// Rango en metros, con los dos extremos incluidos (CA-4, CA-5).
export type Range = { min: number; max: number };

// null en cada campo quiere decir "sin ese filtro".
export type ActivityFilters = {
  type: ActivityType | null;
  month: string | null; // clave de localMonthKey: "2026-10"
  distance: Range | null;
  peak: Range | null;
};

export const NO_FILTERS: ActivityFilters = { type: null, month: null, distance: null, peak: null };

// Pasos de los controles deslizantes (plan, D4).
export const DISTANCE_STEP_M = 500;
export const PEAK_STEP_M = 50;

export type FilterLimits = { distance: Range | null; peak: Range | null };

const inRange = (value: number | null, range: Range | null) =>
  range === null || (value !== null && value >= range.min && value <= range.max);

/** Las actividades que cumplen todos los filtros a la vez (CA-6). */
export function filterActivities<T extends FilterableActivity>(activities: T[], filters: ActivityFilters): T[] {
  return activities.filter(
    (a) =>
      (filters.type === null || a.type === filters.type) &&
      (filters.month === null || localMonthKey(a.startedAt) === filters.month) &&
      inRange(a.distanceMeters, filters.distance) &&
      inRange(a.peakAltitudeMeters, filters.peak)
  );
}

function limitsOf(values: (number | null)[], step: number): Range | null {
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) return null;
  return {
    min: Math.floor(Math.min(...known) / step) * step,
    max: Math.ceil(Math.max(...known) / step) * step,
  };
}

/**
 * Límites de los controles deslizantes: del valor más bajo al más alto de todas las actividades,
 * redondeados al paso hacia afuera, para que ninguna quede fuera (RN-8). null si ninguna tiene ese
 * dato.
 */
export function filterLimits(activities: FilterableActivity[]): FilterLimits {
  return {
    distance: limitsOf(activities.map((a) => a.distanceMeters), DISTANCE_STEP_M),
    peak: limitsOf(activities.map((a) => a.peakAltitudeMeters), PEAK_STEP_M),
  };
}

/**
 * Ajusta un rango a los límites. Si cubre los límites completos, el filtro queda inactivo (null)
 * (RN-8). También si cambian las actividades y el rango elegido queda fuera de los límites nuevos.
 */
export function normalizeRange(range: Range | null, limits: Range | null): Range | null {
  if (range === null || limits === null) return null;
  const min = Math.min(Math.max(range.min, limits.min), limits.max);
  const max = Math.max(Math.min(range.max, limits.max), limits.min);
  if (min <= limits.min && max >= limits.max) return null;
  return { min, max: Math.max(min, max) };
}

/** Los filtros con sus rangos ajustados a los límites actuales. */
export function normalizeFilters(filters: ActivityFilters, limits: FilterLimits): ActivityFilters {
  return {
    ...filters,
    distance: normalizeRange(filters.distance, limits.distance),
    peak: normalizeRange(filters.peak, limits.peak),
  };
}

export type MonthOption = { key: string; title: string };

/** Meses con actividades, del más reciente al más viejo, con su título (CA-3). */
export function availableMonths(activities: FilterableActivity[], now: Date): MonthOption[] {
  return groupByMonth(activities, now).map(({ key, title }) => ({ key, title }));
}

// Valores sin ceros de relleno (RN-4): 5000 → "5", 5500 → "5.5".
const km = (meters: number) => String(Math.round(meters / 100) / 10);

/** "5 km" o "5.5 km", para los límites del control deslizante. */
export function formatFilterDistance(meters: number): string {
  return `${km(meters)} km`;
}

/** "800 m". */
export function formatFilterAltitude(meters: number): string {
  return `${Math.round(meters)} m`;
}

/** "5 – 20 km", o "Cualquiera" sin filtro. */
export function distanceRangeText(range: Range | null): string {
  return range === null ? 'Cualquiera' : `${km(range.min)} – ${km(range.max)} km`;
}

/** "800 – 1400 m", o "Cualquiera" sin filtro. */
export function peakRangeText(range: Range | null): string {
  return range === null ? 'Cualquiera' : `${Math.round(range.min)} – ${Math.round(range.max)} m`;
}

export type FilterKind = keyof ActivityFilters;
export type ActiveFilterLabel = { kind: FilterKind; label: string };

/** Etiquetas de los chips de filtros activos, en el orden del panel (CA-7). */
export function activeFilterLabels(filters: ActivityFilters, now: Date): ActiveFilterLabel[] {
  const labels: ActiveFilterLabel[] = [];
  if (filters.type) labels.push({ kind: 'type', label: ACTIVITY_TYPE_LABELS[filters.type] });
  if (filters.month) labels.push({ kind: 'month', label: monthTitle(filters.month, now) });
  if (filters.distance) labels.push({ kind: 'distance', label: distanceRangeText(filters.distance) });
  if (filters.peak) labels.push({ kind: 'peak', label: peakRangeText(filters.peak) });
  return labels;
}

/** Número de filtros activos, para el botón "Filtros". */
export function activeFilterCount(filters: ActivityFilters): number {
  return (Object.keys(filters) as FilterKind[]).filter((k) => filters[k] !== null).length;
}
