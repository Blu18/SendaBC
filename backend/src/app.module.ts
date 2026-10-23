import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { ActivityModule } from './activity/activity.module.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { EmergencyContactModule } from './emergency-contact/emergency-contact.module.js';
import { RouteModule } from './route/route.module.js';
import { SafetyModule } from './safety/safety.module.js';
import { TelegramModule } from './telegram/telegram.module.js';
import { UserModule } from './user/user.module.js';
import { ValidationPipe } from './validation/validation.pipe.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    AuthModule,
    UserModule,
    ActivityModule,
    RouteModule,
    // Tarea de la hora de regreso cada minuto (spec 008, plan D3).
    ScheduleModule.forRoot(),
    TelegramModule,
    EmergencyContactModule,
    SafetyModule,
  ],
  controllers: [AppController],
  // Pipe global registrado aquí (no en main.ts) para que también aplique en las pruebas e2e.
  providers: [AppService, { provide: APP_PIPE, useClass: ValidationPipe }],
})
export class AppModule {}
