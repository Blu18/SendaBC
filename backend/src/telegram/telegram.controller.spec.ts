import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { TelegramController } from './telegram.controller.js';
import type { TelegramConfig } from './telegram.config.js';
import type { UpdatesService } from './updates.service.js';
import {
  ENCABEZADO_SECRETO,
  mismoSecreto,
  WebhookSecretGuard,
} from './webhook-secret.guard.js';

const SECRETO = 's3cr3t-del-webhook';

function config(webhookSecret: string | null): TelegramConfig {
  return {
    mode: 'webhook',
    botToken: '123:abc',
    botUsername: 'SendaBCBot',
    webhookSecret,
  };
}

function contexto(headers: Record<string, string | string[]>) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('WebhookSecretGuard (spec 008, T5)', () => {
  it('deja pasar con el secreto correcto', () => {
    const guard = new WebhookSecretGuard(config(SECRETO));
    expect(guard.canActivate(contexto({ [ENCABEZADO_SECRETO]: SECRETO }))).toBe(
      true,
    );
  });

  it('responde 401 sin el encabezado, con otro secreto o con uno de otra longitud', () => {
    const guard = new WebhookSecretGuard(config(SECRETO));
    for (const headers of <Record<string, string | string[]>[]>[
      {},
      { [ENCABEZADO_SECRETO]: 's3cr3t-del-webhooK' },
      { [ENCABEZADO_SECRETO]: 'corto' },
      { [ENCABEZADO_SECRETO]: [SECRETO, SECRETO] },
    ]) {
      expect(() => guard.canActivate(contexto(headers))).toThrow(
        UnauthorizedException,
      );
    }
  });

  it('sin secreto configurado no deja pasar a nadie', () => {
    const guard = new WebhookSecretGuard(config(null));
    expect(() =>
      guard.canActivate(contexto({ [ENCABEZADO_SECRETO]: '' })),
    ).toThrow(UnauthorizedException);
  });

  it('mismoSecreto compara el contenido completo', () => {
    expect(mismoSecreto('abc', 'abc')).toBe(true);
    expect(mismoSecreto('abc', 'abd')).toBe(false);
    expect(mismoSecreto('abc', 'abcd')).toBe(false);
  });
});

describe('TelegramController (spec 008, T5)', () => {
  it('el webhook usa el guard del secreto, no el JWT', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, TelegramController)).toEqual([
      WebhookSecretGuard,
    ]);
  });

  it('pasa el update al servicio', async () => {
    const updates = { atender: vi.fn().mockResolvedValue('vinculado') };
    const controller = new TelegramController(
      updates as unknown as UpdatesService,
    );
    const update = { update_id: 7, message: { text: 'hola' } };

    await controller.webhook(update);

    expect(updates.atender).toHaveBeenCalledWith(update);
  });

  it('si el servicio falla responde 200 igual, para que Telegram no reintente sin fin', async () => {
    const updates = { atender: vi.fn().mockRejectedValue(new Error('caída')) };
    const controller = new TelegramController(
      updates as unknown as UpdatesService,
    );

    await expect(controller.webhook({ update_id: 7 })).resolves.toBeUndefined();
  });
});
