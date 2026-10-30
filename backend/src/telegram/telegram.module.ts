import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { BotApiTelegramSender } from './bot-api.sender.js';
import { LogTelegramSender } from './log.sender.js';
import { PollingService } from './polling.service.js';
import {
  leerConfigTelegram,
  TELEGRAM_CONFIG,
  type TelegramConfig,
} from './telegram.config.js';
import { TelegramController } from './telegram.controller.js';
import { TELEGRAM_SENDER, type TelegramSender } from './telegram.sender.js';
import { UpdatesService } from './updates.service.js';

// Con TELEGRAM_MODE=log se usa el emisor que solo registra; con polling o webhook, la Bot API
// (spec 008, plan D2 y D12).
export function crearEmisor(config: TelegramConfig): TelegramSender {
  return config.mode === 'log'
    ? new LogTelegramSender()
    : new BotApiTelegramSender(config.botToken!);
}

@Module({
  controllers: [TelegramController],
  providers: [
    PrismaService,
    UpdatesService,
    PollingService,
    { provide: TELEGRAM_CONFIG, useFactory: () => leerConfigTelegram() },
    {
      provide: TELEGRAM_SENDER,
      useFactory: crearEmisor,
      inject: [TELEGRAM_CONFIG],
    },
  ],
  exports: [TELEGRAM_CONFIG, TELEGRAM_SENDER],
})
export class TelegramModule {}
