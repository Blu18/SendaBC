import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma.service.js';
import type { TelegramSender } from './telegram.sender.js';
import {
  nombreTelegram,
  UpdatesService,
  type TelegramUpdate,
} from './updates.service.js';

const USUARIO = '11111111-1111-4111-8111-111111111111';
const CONTACTO = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'a'.repeat(43);
const CHAT = 4_503_599_627_370_495;

const contacto = {
  id: CONTACTO,
  name: 'Mamá',
  userId: USUARIO,
  user: { displayName: 'Ana' },
};

function update(
  text: string | undefined,
  chat: { id?: number; type?: string } = { id: CHAT, type: 'private' },
): TelegramUpdate {
  return {
    update_id: 1,
    message: {
      chat,
      from: { first_name: 'Rosa', last_name: 'Márquez', username: 'rosam' },
      text,
    },
  };
}

function montar() {
  const prisma = {
    emergencyContact: {
      findUnique: vi.fn().mockResolvedValue(contacto),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    alertMessage: { create: vi.fn().mockResolvedValue({}) },
  };
  const telegram = {
    sendMessage: vi.fn().mockResolvedValue({ ok: true, messageId: 3 }),
    sendLocation: vi.fn(),
  };
  const service = new UpdatesService(
    prisma as unknown as PrismaService,
    telegram as unknown as TelegramSender,
  );
  return { service, prisma, telegram };
}

function p2002() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('UpdatesService.atender (spec 008, T5)', () => {
  it('/start con un token válido deja el contacto ACTIVE, borra el token y da la bienvenida (CA-5)', async () => {
    const { service, prisma, telegram } = montar();

    expect(await service.atender(update(`/start ${TOKEN}`))).toBe('vinculado');

    expect(prisma.emergencyContact.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { inviteToken: TOKEN } }),
    );
    const { where, data } = prisma.emergencyContact.updateMany.mock.calls[0][0];
    expect(where).toEqual({ id: CONTACTO, inviteToken: TOKEN });
    expect(data).toMatchObject({
      status: 'ACTIVE',
      inviteToken: null,
      telegramChatId: BigInt(CHAT),
      telegramName: 'Rosa Márquez',
    });
    expect(data.acceptedAt).toBeInstanceOf(Date);

    const [chatId, html] = telegram.sendMessage.mock.calls[0];
    expect(chatId).toBe(BigInt(CHAT));
    expect(html).toContain('Hola, Mamá. <b>Ana</b> te registró');
    expect(prisma.alertMessage.create).toHaveBeenCalledWith({
      data: {
        userId: USUARIO,
        contactId: CONTACTO,
        contactName: 'Mamá',
        kind: 'WELCOME',
        status: 'SENT',
        telegramMessageId: 3,
        error: null,
      },
    });
  });

  it('acepta /start@bot y espacios de más', async () => {
    const { service } = montar();
    expect(
      await service.atender(update(`  /start@SendaBCBot   ${TOKEN}  `)),
    ).toBe('vinculado');
  });

  it('un token que no existe (usado o quitado) responde que la invitación no es válida', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyContact.findUnique.mockResolvedValue(null);

    expect(await service.atender(update(`/start ${TOKEN}`))).toBe(
      'invitacion-invalida',
    );
    expect(prisma.emergencyContact.updateMany).not.toHaveBeenCalled();
    expect(telegram.sendMessage.mock.calls[0][1]).toContain(
      'invitación de SendaBC no es válida',
    );
    expect(prisma.alertMessage.create).not.toHaveBeenCalled();
  });

  it('si otro /start ganó con el mismo token, no vincula dos veces', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyContact.updateMany.mockResolvedValue({ count: 0 });

    expect(await service.atender(update(`/start ${TOKEN}`))).toBe(
      'invitacion-invalida',
    );
    expect(telegram.sendMessage.mock.calls[0][1]).toContain('no es válida');
  });

  it('la misma cuenta de Telegram ya vinculada con ese usuario no vincula (RN-3)', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyContact.updateMany.mockRejectedValue(p2002());

    expect(await service.atender(update(`/start ${TOKEN}`))).toBe(
      'invitacion-invalida',
    );
    expect(telegram.sendMessage.mock.calls[0][1]).toContain('no es válida');
    expect(prisma.alertMessage.create).not.toHaveBeenCalled();
  });

  it('otro error de la base se propaga', async () => {
    const { service, prisma } = montar();
    prisma.emergencyContact.updateMany.mockRejectedValue(new Error('caída'));

    await expect(service.atender(update(`/start ${TOKEN}`))).rejects.toThrow(
      'caída',
    );
  });

  it('un contacto que no recibía mensajes vuelve a ACTIVE al aceptar su invitación (CA-7, RN-13)', async () => {
    // La invitación nueva de un UNREACHABLE se acepta igual que la primera: se busca solo por token.
    const { service, prisma } = montar();

    await service.atender(update(`/start ${TOKEN}`));

    expect(
      prisma.emergencyContact.updateMany.mock.calls[0][0].data.status,
    ).toBe('ACTIVE');
  });

  it('si falla la bienvenida, el contacto queda vinculado y el envío se registra como FAILED', async () => {
    const { service, prisma, telegram } = montar();
    telegram.sendMessage.mockResolvedValue({
      ok: false,
      error: 'Telegram tardó demasiado en responder',
    });

    expect(await service.atender(update(`/start ${TOKEN}`))).toBe('vinculado');
    expect(prisma.alertMessage.create.mock.calls[0][0].data).toMatchObject({
      kind: 'WELCOME',
      status: 'FAILED',
      error: 'Telegram tardó demasiado en responder',
    });
  });

  it('a cualquier otro mensaje, o /start sin token, responde qué es el bot', async () => {
    for (const text of ['hola', '/start', '/ayuda', undefined]) {
      const { service, prisma, telegram } = montar();

      expect(await service.atender(update(text))).toBe('explicacion');
      expect(telegram.sendMessage.mock.calls[0][1]).toContain(
        'bot de avisos de SendaBC',
      );
      expect(prisma.emergencyContact.findUnique).not.toHaveBeenCalled();
    }
  });

  it('ignora grupos, canales y updates sin mensaje', async () => {
    const { service, telegram } = montar();

    expect(
      await service.atender(
        update(`/start ${TOKEN}`, { id: -100, type: 'group' }),
      ),
    ).toBe('ignorado');
    expect(await service.atender({ update_id: 2 })).toBe('ignorado');
    expect(await service.atender({} as TelegramUpdate)).toBe('ignorado');
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });
});

describe('nombreTelegram', () => {
  it('usa nombre y apellido, o el usuario, o nada', () => {
    expect(nombreTelegram({ first_name: 'Rosa', last_name: 'Márquez' })).toBe(
      'Rosa Márquez',
    );
    expect(nombreTelegram({ first_name: 'Rosa' })).toBe('Rosa');
    expect(nombreTelegram({ first_name: ' ', username: 'rosam' })).toBe(
      '@rosam',
    );
    expect(nombreTelegram({})).toBeNull();
    expect(nombreTelegram()).toBeNull();
  });
});
