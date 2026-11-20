import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Las e2e levantan AppModule completo: necesitan DATABASE_URL y JWT_SECRET del .env.
    setupFiles: ['dotenv/config'],
    // Los archivos comparten la base de Supabase y en paralelo fallaban de forma intermitente;
    // en serie pasan (spec 011, CA-22, plan D10).
    fileParallelism: false,
  },
});
