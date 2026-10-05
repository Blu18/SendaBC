import { defineConfig } from 'vitest/config';

// Solo lógica pura de lib/ (constitución 6.1, spec 004 D1): sin runtime de React Native.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
