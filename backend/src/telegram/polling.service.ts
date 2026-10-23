import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { TELEGRAM_CONFIG, type TelegramConfig } from './telegram.config.js';
import { UpdatesService, type TelegramUpdate } from './updates.service.js';

// Segundos que Telegram mantiene abierta cada getUpdates si no hay mensajes (long polling).
export const POLLING_TIMEOUT_S = 25;
// Espera tras un error antes de volver a consultar.
export const POLLING_REINTENTO_MS = 5_000;

type RespuestaGetUpdates = {
  ok: boolean;
  result?: (TelegramUpdate & { update_id: number })[];
  description?: string;
};

// Recibe los mensajes del bot con getUpdates, solo con TELEGRAM_MODE=polling: en desarrollo no
// hay una URL pública para el webhook (spec 008, plan D12). Telegram no permite getUpdates con
// un webhook activo en el mismo bot: por eso se recomienda un bot de desarrollo aparte.
@Injectable()
export class PollingService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PollingService.name);
  private offset = 0;
  private detener = new AbortController();
  private ciclo: Promise<void> | null = null;
  // Reemplazable en las pruebas.
  fetchFn: typeof fetch = fetch;

  constructor(
    @Inject(TELEGRAM_CONFIG) private readonly config: TelegramConfig,
    private readonly updates: UpdatesService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.mode !== 'polling') return;
    this.logger.log('Recibiendo mensajes del bot con getUpdates');
    this.ciclo = this.consultarSiempre();
  }

  async onApplicationShutdown(): Promise<void> {
    this.detener.abort();
    await this.ciclo;
  }

  private async consultarSiempre(): Promise<void> {
    while (!this.detener.signal.aborted) {
      const ok = await this.consultarUnaVez();
      if (!ok && !this.detener.signal.aborted) {
        await esperar(POLLING_REINTENTO_MS, this.detener.signal);
      }
    }
  }

  // Una llamada a getUpdates; atiende cada update y avanza el offset para no recibirlo otra vez.
  // Devuelve false si la llamada falló.
  async consultarUnaVez(): Promise<boolean> {
    let datos: RespuestaGetUpdates;
    try {
      const respuesta = await this.fetchFn(
        `https://api.telegram.org/bot${this.config.botToken}/getUpdates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offset: this.offset,
            timeout: POLLING_TIMEOUT_S,
            allowed_updates: ['message'],
          }),
          signal: this.detener.signal,
        },
      );
      datos = (await respuesta.json()) as RespuestaGetUpdates;
    } catch (error) {
      if (!this.detener.signal.aborted) {
        this.logger.warn(`getUpdates falló: ${String(error)}`);
      }
      return false;
    }
    if (!datos.ok) {
      this.logger.warn(`getUpdates respondió: ${datos.description}`);
      return false;
    }

    for (const update of datos.result ?? []) {
      // El offset avanza aunque falle el update: si no, se repetiría para siempre.
      this.offset = update.update_id + 1;
      try {
        await this.updates.atender(update);
      } catch (error) {
        this.logger.error(
          `No se pudo atender el update ${update.update_id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return true;
  }
}

function esperar(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
