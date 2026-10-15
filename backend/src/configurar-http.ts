import type { NestExpressApplication } from '@nestjs/platform-express';

// Una actividad de 3 h (≈ 5 400 puntos) pesa ~700 kB en JSON y un lote lleva hasta 5
// actividades; el límite por defecto de Express (100 kB) no alcanza (spec 005, CA-7).
export const LIMITE_JSON = '5mb';

// Configuración HTTP que comparten main.ts y las pruebas e2e. Se llama antes de app.init():
// Nest no registra su parser JSON por defecto si ya hay uno.
export function configurarHttp(app: NestExpressApplication) {
  app.useBodyParser('json', { limit: LIMITE_JSON });
}
