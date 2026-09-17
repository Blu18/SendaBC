import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  experimental: {
    extensions: true,
    externalTables: true,
  },
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    initShadowDb: readFileSync('prisma/init-shadow-db.sql', 'utf8'),
  },
  tables: {
    // Tabla propia de la extensión PostGIS — Prisma no la gestiona.
    external: ['public.spatial_ref_sys'],
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
