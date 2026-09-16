import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import postgis from '@prisma/orm-extension-postgis/control';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

const config: ReturnType<typeof definePrismaConfig> = definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/schema.prisma",
    db: {
      connection: process.env['DIRECT_URL']!,
    },
    extensions: [postgis],
  }),
});

export default config;