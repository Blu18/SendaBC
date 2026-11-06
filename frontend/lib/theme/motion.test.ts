import { describe, expect, it } from 'vitest';
import { darkTheme, lightTheme } from './index';
import { MAX_MOTION_MS, motion } from './motion';

describe('motion (spec 010, RN-5)', () => {
  it('ninguna duración pasa de 300 ms', () => {
    expect(MAX_MOTION_MS).toBe(300);
    for (const [nombre, duracion] of Object.entries(motion)) {
      expect(duracion, nombre).toBeGreaterThan(0);
      expect(duracion, nombre).toBeLessThanOrEqual(MAX_MOTION_MS);
    }
  });

  it('se expone en los dos temas', () => {
    expect(lightTheme.motion).toBe(motion);
    expect(darkTheme.motion).toBe(motion);
  });
});
