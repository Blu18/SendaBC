import type { Activity, ActivityType } from '../db/activities';

// Línea de contexto del resumen (spec 014, CA-2, CA-3, RN-3, RN-4). Sin React Native, para
// probarla con Vitest (constitución 6.1).

export type ContextCandidate = Pick<
  Activity,
  'localId' | 'type' | 'startedAt' | 'distanceMeters' | 'elevationGainMeters'
>;

// Textos propios en lugar de Intl, para que Node y Hermes den lo mismo (plan, D7).
export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

// Cómo se nombra una salida de cada tipo. Todas son femeninas: "Tu primera…", "…más larga…".
const OUTING: Record<ActivityType, string> = {
  HIKING: 'caminata',
  TRAIL_RUNNING: 'carrera',
  CYCLING: 'salida en bici',
};

// Mes en la hora local del teléfono (RN-8): "2026-10".
export function localMonthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ¿`a` empezó antes que `b`? Con la misma hora decide el id local, que crece al grabar.
function before(a: ContextCandidate, b: ContextCandidate) {
  const ta = Date.parse(a.startedAt);
  const tb = Date.parse(b.startedAt);
  return ta !== tb ? ta < tb : a.localId < b.localId;
}

// ¿`activity` es la mejor de `others` en `value`? Con un empate gana la más antigua (RN-3), así
// que debe superar a las anteriores e igualar o superar a las posteriores. Las que no tienen el
// valor calculado no cuentan.
function isBest(
  activity: ContextCandidate,
  others: ContextCandidate[],
  value: (c: ContextCandidate) => number | null
) {
  const mine = value(activity);
  if (mine === null) return false;
  return others.every((o) => {
    const theirs = value(o);
    if (theirs === null) return true;
    return before(o, activity) ? mine > theirs : mine >= theirs;
  });
}

/**
 * La línea de contexto de una actividad, o null si no cumple ninguna regla (CA-3). Reglas, en
 * orden de prioridad (RN-3, RN-4):
 * 1. Es la primera actividad de ese tipo: "Tu primera caminata".
 * 2. Es la más larga de ese tipo en su mes: "Tu caminata más larga de octubre".
 * 3. Es la de más elevación ganada de ese tipo en su mes: "Tu caminata con más subida de octubre".
 * Las reglas 2 y 3 solo aplican si ese mes hay otra actividad del mismo tipo. `all` son las
 * actividades terminadas del usuario; puede incluir a `activity`.
 */
export function contextLine(activity: ContextCandidate, all: ContextCandidate[]): string | null {
  const sameType = all.filter((a) => a.type === activity.type && a.localId !== activity.localId);
  const outing = OUTING[activity.type];

  if (sameType.every((a) => before(activity, a))) return `Tu primera ${outing}`;

  const month = localMonthKey(activity.startedAt);
  const sameMonth = sameType.filter((a) => localMonthKey(a.startedAt) === month);
  if (sameMonth.length === 0) return null;
  const monthName = MONTH_NAMES[new Date(activity.startedAt).getMonth()];

  if (isBest(activity, sameMonth, (a) => a.distanceMeters)) return `Tu ${outing} más larga de ${monthName}`;
  if (isBest(activity, sameMonth, (a) => a.elevationGainMeters)) {
    return `Tu ${outing} con más subida de ${monthName}`;
  }
  return null;
}
