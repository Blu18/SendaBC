import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { TELEGRAM_CONFIG, type TelegramConfig } from './telegram.config.js';

export const ENCABEZADO_SECRETO = 'x-telegram-bot-api-secret-token';

// El webhook no lleva JWT porque lo llama Telegram, no la app: se autentica con el secreto que
// Telegram manda en cada llamada (spec 008, plan Art. 3.3 y D12). Sin secreto configurado no
// entra nadie.
@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(
    @Inject(TELEGRAM_CONFIG) private readonly config: TelegramConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const recibido = request.headers[ENCABEZADO_SECRETO];
    if (
      !this.config.webhookSecret ||
      typeof recibido !== 'string' ||
      !mismoSecreto(recibido, this.config.webhookSecret)
    ) {
      throw new UnauthorizedException('Secreto del webhook inválido');
    }
    return true;
  }
}

// Comparación en tiempo constante. Se comparan los hash para que la longitud del secreto
// tampoco se filtre (timingSafeEqual exige la misma longitud).
export function mismoSecreto(recibido: string, esperado: string): boolean {
  const hash = (valor: string) => createHash('sha256').update(valor).digest();
  return timingSafeEqual(hash(recibido), hash(esperado));
}
