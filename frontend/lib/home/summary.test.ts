import { describe, expect, it } from 'vitest';
import { formatTotalDuration, inicioDeUltimos7Dias, weekSummaryText } from './summary';

describe('inicioDeUltimos7Dias (spec 013, RN-4)', () => {
  it('son 7 × 24 h antes, en ISO 8601 UTC', () => {
    expect(inicioDeUltimos7Dias(new Date('2026-11-20T18:30:00.000Z'))).toBe('2026-11-13T18:30:00.000Z');
  });

  it('no depende del día de la semana ni de la medianoche local', () => {
    expect(inicioDeUltimos7Dias(new Date('2026-11-02T00:05:00.000Z'))).toBe('2026-10-26T00:05:00.000Z');
  });
});

describe('formatTotalDuration', () => {
  it('minutos, horas exactas y horas con minutos', () => {
    expect(formatTotalDuration(0)).toBe('0 min');
    expect(formatTotalDuration(45 * 60)).toBe('45 min');
    expect(formatTotalDuration(3600)).toBe('1 h');
    expect(formatTotalDuration(5 * 3600 + 12 * 60)).toBe('5 h 12 min');
    expect(formatTotalDuration(30 * 3600 + 5 * 60)).toBe('30 h 5 min');
  });

  it('redondea al minuto y no da negativos', () => {
    expect(formatTotalDuration(89)).toBe('1 min');
    expect(formatTotalDuration(59 * 60 + 40)).toBe('1 h');
    expect(formatTotalDuration(-10)).toBe('0 min');
  });
});

describe('weekSummaryText (spec 013, CA-6)', () => {
  it('textos de la franja con los formatos de la spec 004', () => {
    expect(
      weekSummaryText({ count: 4, distanceMeters: 23400, durationSeconds: 18720, elevationGainMeters: 860.4 })
    ).toEqual({
      distance: '23.40 km',
      activities: '4 actividades',
      duration: '5 h 12 min',
      elevation: '+860 m subidos',
      empty: false,
    });
  });

  it('una sola actividad va en singular', () => {
    expect(weekSummaryText({ count: 1, distanceMeters: 640, durationSeconds: 900, elevationGainMeters: 12 })).toMatchObject({
      distance: '640 m',
      activities: '1 actividad',
      duration: '15 min',
    });
  });

  it('sin actividades, todo en cero y marcado como vacío', () => {
    expect(weekSummaryText({ count: 0, distanceMeters: 0, durationSeconds: 0, elevationGainMeters: 0 })).toEqual({
      distance: '0 km',
      activities: '0 actividades',
      duration: '0 min',
      elevation: '+0 m subidos',
      empty: true,
    });
  });
});
