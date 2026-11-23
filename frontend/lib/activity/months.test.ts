import { describe, expect, it } from 'vitest';
import { groupByMonth, monthTotalsText } from './months';

type Item = { id: number; startedAt: string; distanceMeters: number | null };

// Actividad que empieza en hora local (mes 1-12).
const act = (id: number, [y, m, d, h = 8, min = 0]: number[], distanceMeters: number | null): Item => ({
  id,
  startedAt: new Date(y, m - 1, d, h, min).toISOString(),
  distanceMeters,
});

const now = new Date(2026, 10, 21, 12, 0); // 21 de noviembre de 2026, hora local

const items = [
  act(1, [2025, 12, 14], 9120),
  act(2, [2026, 10, 28], 8310),
  act(3, [2026, 11, 15], 12860),
  act(4, [2026, 10, 20], 31590),
  act(5, [2026, 11, 9], 6000),
  act(6, [2026, 11, 12], 5740),
  act(7, [2026, 10, 25], 10400),
];

describe('groupByMonth', () => {
  it('meses del más reciente al más antiguo y, en cada mes, de la más nueva a la más vieja (CA-13)', () => {
    const sections = groupByMonth(items, now);
    expect(sections.map((s) => s.key)).toEqual(['2026-11', '2026-10', '2025-12']);
    expect(sections[0].data.map((a) => a.id)).toEqual([3, 6, 5]);
    expect(sections[1].data.map((a) => a.id)).toEqual([2, 7, 4]);
  });

  it('título con el año solo si no es el año en curso (CA-14)', () => {
    expect(groupByMonth(items, now).map((s) => s.title)).toEqual(['Noviembre', 'Octubre', 'Diciembre 2025']);
  });

  it('número de actividades y suma de distancias por mes (CA-14, CA-15, RN-8)', () => {
    const [nov, oct, dic] = groupByMonth(items, now);
    expect([nov.count, oct.count, dic.count]).toEqual([3, 3, 1]);
    expect(nov.distanceMeters).toBe(12860 + 6000 + 5740);
    expect(oct.distanceMeters).toBe(8310 + 31590 + 10400);
    expect(dic.distanceMeters).toBe(9120);
  });

  it('una actividad sin distancia calculada cuenta, pero no suma', () => {
    const [sec] = groupByMonth([act(1, [2026, 11, 1], 2000), act(2, [2026, 11, 2], null)], now);
    expect(sec.count).toBe(2);
    expect(sec.distanceMeters).toBe(2000);
  });

  it('el mes es el de la hora local de inicio (RN-8, CA-15)', () => {
    // 31 de octubre a las 23:30 y 1 de noviembre a las 0:10, en hora local.
    const sections = groupByMonth([act(1, [2026, 10, 31, 23, 30], 5000), act(2, [2026, 11, 1, 0, 10], 7000)], now);
    expect(sections.map((s) => [s.key, s.data.map((a) => a.id)])).toEqual([
      ['2026-11', [2]],
      ['2026-10', [1]],
    ]);
  });

  it('sin actividades, sin meses', () => {
    expect(groupByMonth([], now)).toEqual([]);
  });
});

describe('monthTotalsText', () => {
  it('"3 actividades, 24.60 km" con el formato de la spec 004 (CA-14)', () => {
    expect(monthTotalsText({ count: 3, distanceMeters: 24600 })).toBe('3 actividades, 24.60 km');
  });

  it('singular, menos de 1 km y sin distancia', () => {
    expect(monthTotalsText({ count: 1, distanceMeters: 9120 })).toBe('1 actividad, 9.12 km');
    expect(monthTotalsText({ count: 2, distanceMeters: 640 })).toBe('2 actividades, 640 m');
    expect(monthTotalsText({ count: 1, distanceMeters: 0 })).toBe('1 actividad, 0 km');
  });
});
