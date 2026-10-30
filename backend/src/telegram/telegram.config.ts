// Configuración del bot de Telegram (spec 008). Los valores vienen solo del entorno (constitución 3.6).

export const TELEGRAM_CONFIG = Symbol('TELEGRAM_CONFIG');

export type TelegramMode = 'log' | 'polling' | 'webhook';

export type TelegramConfig = {
  mode: TelegramMode;
  botToken: string | null;
  botUsername: string | null;
  webhookSecret: string | null;
};

const MODOS: TelegramMode[] = ['log', 'polling', 'webhook'];

function valor(env: NodeJS.ProcessEnv, nombre: string): string | null {
  return env[nombre]?.trim() || null;
}

export function leerConfigTelegram(
  env: NodeJS.ProcessEnv = process.env,
): TelegramConfig {
  const produccion = env.NODE_ENV === 'production';
  // Fuera de producción, por omisión no se manda nada a Telegram (plan, Art. 3.6).
  const modo = valor(env, 'TELEGRAM_MODE') ?? (produccion ? 'webhook' : 'log');
  if (!MODOS.includes(modo as TelegramMode)) {
    throw new Error(
      `TELEGRAM_MODE debe ser log, polling o webhook; se recibió "${modo}"`,
    );
  }

  const config: TelegramConfig = {
    mode: modo as TelegramMode,
    botToken: valor(env, 'TELEGRAM_BOT_TOKEN'),
    botUsername: valor(env, 'TELEGRAM_BOT_USERNAME'),
    webhookSecret: valor(env, 'TELEGRAM_WEBHOOK_SECRET'),
  };

  if (config.mode !== 'log' && (!config.botToken || !config.botUsername)) {
    throw new Error(
      `TELEGRAM_BOT_TOKEN y TELEGRAM_BOT_USERNAME son obligatorios con TELEGRAM_MODE=${config.mode}`,
    );
  }
  if (config.mode === 'webhook' && !config.webhookSecret) {
    throw new Error(
      'TELEGRAM_WEBHOOK_SECRET es obligatorio con TELEGRAM_MODE=webhook',
    );
  }
  return config;
}
