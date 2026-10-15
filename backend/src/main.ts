import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule, ObserveInstrument } from './app.module.js';
import { configurarHttp } from './configurar-http.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });

  configurarHttp(app);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:8081',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
