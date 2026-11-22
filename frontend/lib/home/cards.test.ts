import { describe, expect, it } from 'vitest';
import { formatStartedAt } from '../format/activity';
import { activityCardText, nearbyRouteText, popularRouteText } from './cards';

describe('activityCardText (spec 013, CA-3, CA-28)', () => {
  const a = {
    type: 'HIKING' as const,
    startedAt: '2026-11-19T14:10:00.000Z',
    distanceMeters: 8200,
    durationSeconds: 6300,
  };

  it('tipo, fecha, distancia y duración con el formato del historial', () => {
    const t = activityCardText(a);
    expect(t.type).toBe('Senderismo');
    expect(t.date).toBe(formatStartedAt(a.startedAt));
    expect(t.metrics).toBe('8.20 km · 01:45:00');
    expect(t.label).toBe(`Senderismo, ${t.date}, 8.20 km, 01:45:00`);
  });

  it('la miniatura se describe con el tipo y la distancia', () => {
    expect(activityCardText(a).thumbnailLabel).toBe('Recorrido de senderismo, 8.20 km');
  });

  it('sin métricas muestra "—"', () => {
    expect(activityCardText({ ...a, distanceMeters: null, durationSeconds: null }).metrics).toBe('— · —');
  });
});

describe('nearbyRouteText (spec 013, CA-9)', () => {
  const r = {
    name: 'Cañón de Doña Petra',
    type: 'HIKING' as const,
    difficulty: 'MODERATE' as const,
    distanceMeters: 6400,
    distanceFromCenterMeters: 3100,
    isMine: false,
  };

  it('tipo y dificultad, distancia y qué tan lejos está el inicio', () => {
    const t = nearbyRouteText(r);
    expect(t.kind).toBe('Senderismo · Moderada');
    expect(t.metrics).toBe('6.40 km · a 3.10 km de ti');
    expect(t.label).toBe('Cañón de Doña Petra · Senderismo · Moderada · 6.40 km · a 3.10 km de ti');
  });

  it('sin dificultad no deja separadores de más; la propia dice "Tuya"', () => {
    const t = nearbyRouteText({ ...r, difficulty: null, isMine: true });
    expect(t.kind).toBe('Senderismo');
    expect(t.mine).toBe(true);
    expect(t.label).toContain('Tuya');
  });
});

describe('popularRouteText (spec 013, CA-13, RN-8)', () => {
  const r = {
    name: 'La Bufadora',
    type: 'HIKING' as const,
    region: 'Ensenada',
    difficulty: 'MODERATE' as const,
    distanceMeters: 7300,
    favoritesCount: 128,
    isMine: false,
  };

  it('posición, zona, tipo, dificultad, distancia y favoritas', () => {
    const t = popularRouteText(r, 1);
    expect(t.rank).toBe('1');
    expect(t.detail).toBe('Ensenada · Senderismo · Moderada · 7.30 km');
    expect(t.favorites).toBe('128');
    expect(t.favoritesLabel).toBe('128 personas la tienen en favoritas');
    expect(t.label).toBe('1. La Bufadora · Ensenada · Senderismo · Moderada · 7.30 km · 128 personas la tienen en favoritas');
  });

  it('sin zona ni dificultad; una sola favorita en singular', () => {
    const t = popularRouteText({ ...r, region: null, difficulty: null, favoritesCount: 1 }, 3);
    expect(t.detail).toBe('Senderismo · 7.30 km');
    expect(t.favoritesLabel).toBe('1 persona la tiene en favoritas');
  });
});
