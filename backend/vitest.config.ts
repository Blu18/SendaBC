import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // NestJS carga reflect-metadata al arrancar; en las pruebas unitarias hace falta para
    // los decoradores que leen tipos, como @Type de class-transformer.
    setupFiles: ['reflect-metadata'],
  },
});
