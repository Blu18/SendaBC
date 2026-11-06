// Duraciones de las animaciones en ms (spec 010). Ninguna pasa de MAX_MOTION_MS (RN-5).
export const MAX_MOTION_MS = 300;

export const motion = {
  press: 100,
  release: 150,
  content: 200,
  screen: 300,
} as const;

export type MotionTokens = typeof motion;
