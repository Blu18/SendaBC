import { describe, expect, it } from 'vitest';
import { averagePace, averageSpeed } from '../metrics/summary';
import { formatDistance, formatElevation, formatPace, formatSpeed, splitUnit } from './metrics';

describe('formatDistance (RN-1)', () => {
  it('en metros por debajo de 1 km', () => {
    expect(formatDistance(640)).toBe('640 m');
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(12.6)).toBe('13 m');
  });

  it('en kilómetros con 2 decimales desde 1 km', () => {
    expect(formatDistance(3420)).toBe('3.42 km');
    expect(formatDistance(1000)).toBe('1.00 km');
    expect(formatDistance(15_004.9)).toBe('15.00 km');
  });

  it('lo que redondea a 1000 m ya se muestra en km', () => {
    expect(formatDistance(999.6)).toBe('1.00 km');
    expect(formatDistance(999.4)).toBe('999 m');
  });
});

describe('formatElevation (RN-1)', () => {
  it('en metros enteros', () => {
    expect(formatElevation(312)).toBe('312 m');
    expect(formatElevation(311.6)).toBe('312 m');
    expect(formatElevation(0)).toBe('0 m');
  });
});

describe('formatPace (CA-5, RN-1)', () => {
  it('en mm:ss /km', () => {
    expect(formatPace(750)).toBe('12:30 /km');
    expect(formatPace(305)).toBe('5:05 /km');
  });

  it('redondea al segundo sin dejar ":60"', () => {
    expect(formatPace(749.6)).toBe('12:30 /km');
    expect(formatPace(779.7)).toBe('13:00 /km');
  });

  it('ritmos muy lentos siguen en minutos', () => {
    expect(formatPace(4500)).toBe('75:00 /km');
  });

  it('con el ritmo calculado de 5 km en 62:30', () => {
    expect(formatPace(averagePace(5000, 3750))).toBe('12:30 /km');
  });
});

describe('formatSpeed (CA-5, RN-1)', () => {
  it('en km/h con 1 decimal', () => {
    expect(formatSpeed(18.4)).toBe('18.4 km/h');
    expect(formatSpeed(18.44)).toBe('18.4 km/h');
    expect(formatSpeed(20)).toBe('20.0 km/h');
  });

  it('con la velocidad calculada de 9.2 km en 30 min', () => {
    expect(formatSpeed(averageSpeed(9200, 1800))).toBe('18.4 km/h');
  });
});

describe('dato que no aplica (CA-6)', () => {
  it('null se muestra como "—"', () => {
    expect(formatDistance(null)).toBe('—');
    expect(formatElevation(null)).toBe('—');
    expect(formatPace(null)).toBe('—');
    expect(formatSpeed(null)).toBe('—');
  });

  it('distancia 0 da ritmo y velocidad "—"', () => {
    expect(formatPace(averagePace(0, 600))).toBe('—');
    expect(formatSpeed(averageSpeed(0, 600))).toBe('—');
  });
});

describe('splitUnit (spec 009, CA-12)', () => {
  it('separa la unidad del número', () => {
    expect(splitUnit('5.42 km')).toEqual({ value: '5.42', unit: 'km' });
    expect(splitUnit('312 m')).toEqual({ value: '312', unit: 'm' });
    expect(splitUnit('12:30 /km')).toEqual({ value: '12:30', unit: '/km' });
    expect(splitUnit('18.4 km/h')).toEqual({ value: '18.4', unit: 'km/h' });
  });

  it('sin unidad queda todo en value', () => {
    expect(splitUnit('01:23:45')).toEqual({ value: '01:23:45', unit: '' });
    expect(splitUnit('—')).toEqual({ value: '—', unit: '' });
  });
});
