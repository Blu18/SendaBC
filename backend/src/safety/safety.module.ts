import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { EmergencyContactModule } from '../emergency-contact/emergency-contact.module.js';
import { PrismaService } from '../prisma.service.js';
import { TelegramModule } from '../telegram/telegram.module.js';
import { AlertsService } from './alerts.service.js';
import { ReturnTimeJob } from './return-time.job.js';
import { SafetyController } from './safety.controller.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TelegramModule,
    EmergencyContactModule,
  ],
  controllers: [SafetyController],
  providers: [PrismaService, SessionsService, AlertsService, ReturnTimeJob],
})
export class SafetyModule {}
