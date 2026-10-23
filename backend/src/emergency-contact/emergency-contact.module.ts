import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../prisma.service.js';
import { TelegramModule } from '../telegram/telegram.module.js';
import { EmergencyContactController } from './emergency-contact.controller.js';
import { EmergencyContactService } from './emergency-contact.service.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TelegramModule,
  ],
  controllers: [EmergencyContactController],
  providers: [EmergencyContactService, PrismaService],
  exports: [EmergencyContactService],
})
export class EmergencyContactModule {}
