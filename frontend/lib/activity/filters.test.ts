import { describe, expect, it } from 'vitest';
import type { ActivityType } from '../db/activities';
import {
  activeFilterCount,
  activeFilterLabels,
  availableMonths,
  distanceRangeText,
  filterActivities,
  filterLimits,
  formatFilterAltitude,
  formatFilterDistance,
  NO_FILTERS,
  normalizeFilters,
  normalizeRange,
  peakRangeText,
  type ActivityFilters,
} from './filters';
import { groupByMonth, monthTotalsText } from './months';

type Item = {
  id: number;
  type: ActivityType;
  startedAt: string;
  distanceMeters: number | null;
  peakAltitudeMeters: number | null;
};

// Actividad que empieza en hora local (mes 1-12).
const act = (
  id: number,
  type: ActivityType,
  [y, m, d, h = 8, min = 0]: number[],
  distanceMeters: number | null,
  peakAltitudeMeters: number | null
): Item => ({ id, type, startedAt: new Date(y, m - 1, d, h, min).toISOString(), distanceMeters, peakAltitudeMeters });

const now = new Date(2026, 10, 22, 12, 0); // 22 de noviembre de 2026, hora local

const items = [
  act(1, 'HIKING', [2026, 11, 12], 5740, 812),
  act(2, 'TRAIL_RUNNING', [2026, 11, 15], 12860, 1176),
  act(3, 'CYCLING', [2026, 11, 9], 31590, 420),
  act(4, 'HIKING', [2026, 10, 28], 8310, 1412),
  act(5, 'HIKING', [2026, 10, 31, 23, 30], 20000, 950), // último día del mes, 23:30
  act(6, 'CYCLING', [2025, 12, 14], 54550, null), // sin perfil
  act(7, 'HIKING', [2026, 11, 3], null, null), // sin métricas calculadas
];

const ids = (list: Item[]) => list.map((a) => a.id).sort((a, b) => a - b);
const with_ = (f: Partial<ActivityFilters>): ActivityFilters => ({ ...NO_FILTERS, ...f });

describe('filterActivities', () => {
  it('sin filtros devuelve todas (CA-1)', () => {
    expect(ids(filterActivities(items, NO_FILTERS))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('por tipo (CA-2)', () => {
    expect(ids(filterActivities(items, with_({ type: 'CYCLING' })))).toEqual([3, 6]);
  });

  it('por mes en hora local: las 23:30 del último día cuentan en ese mes (CA-3, RN-3)', () => {
    expect(ids(filterActivities(items, with_({ month: '2026-10' })))).toEqual([4, 5]);
    expect(ids(filterActivities(items, with_({ month: '2026-11' })))).toEqual([1, 2, 3, 7]);
  });

  it('por distancia con los extremos incluidos (CA-4)', () => {
    expect(ids(filterActivities(items, with_({ distance: { min: 5740, max: 20000 } })))).toEqual([1, 2, 4, 5]);
  });

  it('por altura más alta con los extremos incluidos (CA-5)', () => {
    expect(ids(filterActivities(items, with_({ peak: { min: 812, max: 1176 } })))).toEqual([1, 2, 5]);
  });

  it('sin distancia o sin cumbre, la actividad queda fuera solo con ese filtro activo (CA-4, CA-5)', () => {
    expect(ids(filterActivities(items, with_({ type: 'HIKING' })))).toContain(7);
    expect(ids(filterActivities(items, with_({ distance: { min: 0, max: 100000 } })))).not.toContain(7);
    expect(ids(filterActivities(items, with_({ peak: { min: 0, max: 5000 } })))).not.toContain(6);
  });

  it('varios filtros a la vez cumplen todos (CA-6)', () => {
    const f = with_({ type: 'HIKING', month: '2026-10', distance: { min: 5000, max: 10000 } });
    expect(ids(filterActivities(items, f))).toEqual([4]);
  });

  it('puede no quedar ninguna (CA-8)', () => {
    expect(filterActivities(items, with_({ type: 'TRAIL_RUNNING', month: '2025-12' }))).toEqual([]);
  });

  it('los totales del mes cuentan solo las filtradas (CA-9)', () => {
    const filtered = filterActivities(items, with_({ type: 'HIKING' }));
    const [nov, oct] = groupByMonth(filtered, now);
    expect(monthTotalsText(nov)).toBe('2 actividades, 5.74 km');
    expect(monthTotalsText(oct)).toBe('2 actividades, 28.31 km');
  });
});

describe('filterLimits y normalizeRange', () => {
  it('límites del valor más bajo al más alto, redondeados al paso hacia afuera (RN-8)', () => {
    expect(filterLimits(items)).toEqual({
      distance: { min: 5500, max: 55000 },
      peak: { min: 400, max: 1450 },
    });
  });

  it('sin datos no hay límites', () => {
    expect(filterLimits([act(1, 'HIKING', [2026, 11, 1], null, null)])).toEqual({ distance: null, peak: null });
  });

  it('un rango que cubre los límites queda inactivo (RN-8)', () => {
    const limits = { min: 5500, max: 55000 };
    expect(normalizeRange({ min: 5500, max: 55000 }, limits)).toBeNull();
    expect(normalizeRange({ min: 0, max: 99000 }, limits)).toBeNull();
    expect(normalizeRange({ min: 6000, max: 55000 }, limits)).toEqual({ min: 6000, max: 55000 });
  });

  it('un rango fuera de los límites nuevos se ajusta a ellos', () => {
    expect(normalizeRange({ min: 60000, max: 70000 }, { min: 5500, max: 55000 })).toEqual({ min: 55000, max: 55000 });
    expect(normalizeRange({ min: 1000, max: 8000 }, { min: 5500, max: 55000 })).toEqual({ min: 5500, max: 8000 });
  });

  it('sin límites o sin rango, el filtro queda inactivo', () => {
    expect(normalizeRange({ min: 1, max: 2 }, null)).toBeNull();
    expect(normalizeRange(null, { min: 1, max: 2 })).toBeNull();
  });

  it('normalizeFilters ajusta los dos rangos y deja el tipo y el mes', () => {
    const f = with_({ type: 'HIKING', month: '2026-10', distance: { min: 0, max: 99000 }, peak: { min: 800, max: 1450 } });
    expect(normalizeFilters(f, filterLimits(items))).toEqual({
      type: 'HIKING',
      month: '2026-10',
      distance: null,
      peak: { min: 800, max: 1450 },
    });
  });
});

describe('availableMonths', () => {
  it('meses con actividades, del más reciente al más viejo, con año si no es el actual (CA-3)', () => {
    expect(availableMonths(items, now)).toEqual([
      { key: '2026-11', title: 'Noviembre' },
      { key: '2026-10', title: 'Octubre' },
      { key: '2025-12', title: 'Diciembre 2025' },
    ]);
  });
});

describe('textos', () => {
  it('distancias y altitudes sin ceros de relleno (RN-4)', () => {
    expect(formatFilterDistance(5000)).toBe('5 km');
    expect(formatFilterDistance(5500)).toBe('5.5 km');
    expect(formatFilterAltitude(1400)).toBe('1400 m');
    expect(distanceRangeText({ min: 5000, max: 20000 })).toBe('5 – 20 km');
    expect(peakRangeText({ min: 800, max: 1400 })).toBe('800 – 1400 m');
  });

  it('"Cualquiera" sin filtro', () => {
    expect(distanceRangeText(null)).toBe('Cualquiera');
    expect(peakRangeText(null)).toBe('Cualquiera');
  });

  it('chips de filtros activos en el orden del panel, y su número (CA-7)', () => {
    const f = with_({ type: 'HIKING', month: '2025-12', distance: { min: 5000, max: 20000 }, peak: { min: 800, max: 1400 } });
    expect(activeFilterLabels(f, now)).toEqual([
      { kind: 'type', label: 'Senderismo' },
      { kind: 'month', label: 'Diciembre 2025' },
      { kind: 'distance', label: '5 – 20 km' },
      { kind: 'peak', label: '800 – 1400 m' },
    ]);
    expect(activeFilterCount(f)).toBe(4);
    expect(activeFilterLabels(NO_FILTERS, now)).toEqual([]);
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
  });
});
