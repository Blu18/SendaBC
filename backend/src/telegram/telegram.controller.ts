import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UpdatesService, type TelegramUpdate } from './updates.service.js';
import { WebhookSecretGuard } from './webhook-secret.guard.js';

// Webhook del bot en producción (spec 008, plan D12). Sin JwtAuthGuard: lo autentica el secreto.
@UseGuards(WebhookSecretGuard)
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly updates: UpdatesService) {}

  // Siempre 200 con el secreto válido: con otro código Telegram reintenta el mismo update, y uno
  // que falla siempre lo bloquearía. El fallo queda en el log.
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() update: TelegramUpdate): Promise<void> {
    try {
      await this.updates.atender(update);
    } catch (error) {
      this.logger.error(
        `No se pudo atender el update ${update?.update_id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
