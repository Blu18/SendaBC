import { dificultadDe } from './difficulty.js';

// Mismos casos que frontend/lib/routes/difficulty.test.ts (spec 007, plan D1).
describe('dificultadDe (spec 007, RN-6, CA-4)', () => {
  describe('ejemplos de la spec', () => {
    it('12 km y 200 m a pie → Moderada, por la distancia', () => {
      expect(dificultadDe('HIKING', 12_000, 200)).toBe('MODERATE');
    });

    it('6 km y 900 m de trail running → Difícil, por la elevación', () => {
      expect(dificultadDe('TRAIL_RUNNING', 6_000, 900)).toBe('HARD');
    });

    it('35 km y 500 m en bici → Moderada', () => {
      expect(dificultadDe('CYCLING', 35_000, 500)).toBe('MODERATE');
    });
  });

  describe.each(['HIKING', 'TRAIL_RUNNING'] as const)(
    'bordes a pie (%s)',
    (type) => {
      it.each([
        [8_000, 'EASY'],
        [8_001, 'MODERATE'],
        [15_000, 'MODERATE'],
        [15_001, 'HARD'],
        [30_000, 'HARD'],
        [30_001, 'EXTREME'],
      ] as const)('por distancia: %d m → %s', (distancia, esperada) => {
        expect(dificultadDe(type, distancia, 0)).toBe(esperada);
      });

      it.each([
        [300, 'EASY'],
        [301, 'MODERATE'],
        [700, 'MODERATE'],
        [701, 'HARD'],
        [1_500, 'HARD'],
        [1_501, 'EXTREME'],
      ] as const)('por elevación: %d m → %s', (elevacion, esperada) => {
        expect(dificultadDe(type, 1_500, elevacion)).toBe(esperada);
      });
    },
  );

  describe('bordes en bici', () => {
    it.each([
      [15_000, 'EASY'],
      [15_001, 'MODERATE'],
      [35_000, 'MODERATE'],
      [35_001, 'HARD'],
      [75_000, 'HARD'],
      [75_001, 'EXTREME'],
    ] as const)('por distancia: %d m → %s', (distancia, esperada) => {
      expect(dificultadDe('CYCLING', distancia, 0)).toBe(esperada);
    });

    it.each([
      [400, 'EASY'],
      [401, 'MODERATE'],
      [900, 'MODERATE'],
      [901, 'HARD'],
      [1_800, 'HARD'],
      [1_801, 'EXTREME'],
    ] as const)('por elevación: %d m → %s', (elevacion, esperada) => {
      expect(dificultadDe('CYCLING', 1_500, elevacion)).toBe(esperada);
    });
  });

  describe('el nivel más alto entre distancia y elevación', () => {
    it('distancia Fácil y elevación Extrema → Extrema', () => {
      expect(dificultadDe('HIKING', 5_000, 1_600)).toBe('EXTREME');
    });

    it('distancia Extrema y elevación Fácil → Extrema', () => {
      expect(dificultadDe('CYCLING', 111_000, 100)).toBe('EXTREME');
    });

    it('distancia Difícil y elevación Moderada → Difícil', () => {
      expect(dificultadDe('TRAIL_RUNNING', 20_000, 500)).toBe('HARD');
    });

    it('los mismos valores dan niveles distintos a pie y en bici', () => {
      expect(dificultadDe('HIKING', 14_000, 350)).toBe('MODERATE');
      expect(dificultadDe('CYCLING', 14_000, 350)).toBe('EASY');
    });
  });
});
