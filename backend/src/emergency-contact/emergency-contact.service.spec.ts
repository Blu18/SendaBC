import {
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma.service.js';
import type { TelegramConfig } from '../telegram/telegram.config.js';
import {
  CONTACTO_BLOQUEO,
  type TelegramSender,
} from '../telegram/telegram.sender.js';
import {
  EmergencyContactService,
  ESPERA_PRUEBA_MS,
  MENSAJES_CONTACTO,
} from './emergency-contact.service.js';

const USUARIO = '11111111-1111-4111-8111-111111111111';
const CONTACTO = '22222222-2222-4222-8222-222222222222';
const CREADO = new Date('2026-10-22T18:00:00Z');
const CONFIG: TelegramConfig = {
  mode: 'log',
  botToken: null,
  botUsername: 'SendaBCBot',
  webhookSecret: null,
};

function fila(overrides: Record<string, unknown> = {}) {
  return {
    id: CONTACTO,
    userId: USUARIO,
    name: 'Mamá',
    status: 'PENDING',
    inviteToken: 'tok',
    telegramChatId: null,
    telegramName: null,
    acceptedAt: null,
    createdAt: CREADO,
    updatedAt: CREADO,
    ...overrides,
  };
}

const activo = () =>
  fila({
    status: 'ACTIVE',
    inviteToken: null,
    telegramChatId: 99n,
    telegramName: 'Rosa M.',
  });

function montar() {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: USUARIO }]),
    emergencyContact: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(fila(data)),
      ),
    },
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    emergencyContact: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(fila()),
      update: vi.fn(
        ({ data }: { where: { id: string }; data: Record<string, unknown> }) =>
          Promise.resolve(fila(data)),
      ),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    alertMessage: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ displayName: 'Ana' }),
    },
  };
  const telegram = {
    sendMessage: vi.fn().mockResolvedValue({ ok: true, messageId: 5 }),
    sendLocation: vi.fn(),
  };
  const service = new EmergencyContactService(
    prisma as unknown as PrismaService,
    telegram as unknown as TelegramSender,
    CONFIG,
  );
  return { service, prisma, tx, telegram };
}

describe('EmergencyContactService.list (spec 008)', () => {
  it('lista solo los del usuario, en orden de creación (CA-3, CA-4)', async () => {
    const { service, prisma } = montar();
    prisma.emergencyContact.findMany.mockResolvedValue([fila(), activo()]);

    const result = await service.list(USUARIO);

    expect(prisma.emergencyContact.findMany).toHaveBeenCalledWith({
      where: { userId: USUARIO },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual([
      {
        id: CONTACTO,
        name: 'Mamá',
        status: 'PENDING',
        telegramName: null,
        inviteUrl: 'https://t.me/SendaBCBot?start=tok',
        createdAt: '2026-10-22T18:00:00.000Z',
      },
      {
        id: CONTACTO,
        name: 'Mamá',
        status: 'ACTIVE',
        telegramName: 'Rosa M.',
        inviteUrl: null,
        createdAt: '2026-10-22T18:00:00.000Z',
      },
    ]);
  });

  it('no expone el chat de Telegram ni el usuario', async () => {
    const { service, prisma } = montar();
    prisma.emergencyContact.findMany.mockResolvedValue([activo()]);

    const [contacto] = await service.list(USUARIO);

    expect(contacto).not.toHaveProperty('telegramChatId');
    expect(contacto).not.toHaveProperty('userId');
  });
});

describe('EmergencyContactService.create (spec 008)', () => {
  it('crea el contacto pendiente con una invitación nueva (CA-1)', async () => {
    const { service, tx } = montar();

    const result = await service.create(USUARIO, { name: 'Mamá' });

    const { data } = tx.emergencyContact.create.mock.calls[0][0];
    expect(data).toMatchObject({
      userId: USUARIO,
      name: 'Mamá',
      status: 'PENDING',
    });
    expect(data.inviteToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.status).toBe('PENDING');
    expect(result.inviteUrl).toBe(
      `https://t.me/SendaBCBot?start=${data.inviteToken as string}`,
    );
  });

  it('bloquea la fila del usuario antes de contar, en la misma transacción (RN-3)', async () => {
    const { service, tx } = montar();

    await service.create(USUARIO, { name: 'Mamá' });

    const sql = (tx.$queryRaw.mock.calls[0][0] as string[]).join('?');
    expect(sql).toContain('FOR UPDATE');
    expect(tx.$queryRaw.mock.calls[0][1]).toBe(USUARIO);
    expect(tx.emergencyContact.count).toHaveBeenCalledWith({
      where: { userId: USUARIO },
    });
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.emergencyContact.count.mock.invocationCallOrder[0],
    );
  });

  it('con tres contactos responde 409 y no crea nada (CA-1, RN-3)', async () => {
    const { service, tx } = montar();
    tx.emergencyContact.count.mockResolvedValue(3);

    const error = await service
      .create(USUARIO, { name: 'Cuarto' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).message).toBe(MENSAJES_CONTACTO.limite);
    expect(tx.emergencyContact.create).not.toHaveBeenCalled();
  });

  it('con dos contactos todavía deja agregar el tercero', async () => {
    const { service, tx } = montar();
    tx.emergencyContact.count.mockResolvedValue(2);

    await service.create(USUARIO, { name: 'Tercero' });

    expect(tx.emergencyContact.create).toHaveBeenCalled();
  });
});

describe('EmergencyContactService.update y remove (spec 008, CA-3, CA-4)', () => {
  it('edita el nombre de un contacto propio', async () => {
    const { service, prisma } = montar();

    const result = await service.update(USUARIO, CONTACTO, { name: 'Papá' });

    expect(prisma.emergencyContact.findFirst).toHaveBeenCalledWith({
      where: { id: CONTACTO, userId: USUARIO },
    });
    expect(prisma.emergencyContact.update).toHaveBeenCalledWith({
      where: { id: CONTACTO },
      data: { name: 'Papá' },
    });
    expect(result.name).toBe('Papá');
  });

  it('un contacto de otra cuenta da 404 y no se edita', async () => {
    const { service, prisma } = montar();
    prisma.emergencyContact.findFirst.mockResolvedValue(null);

    await expect(
      service.update(USUARIO, CONTACTO, { name: 'Papá' }),
    ).rejects.toThrow(new NotFoundException(MENSAJES_CONTACTO.noExiste));
    expect(prisma.emergencyContact.update).not.toHaveBeenCalled();
  });

  it('quita un contacto propio, con su invitación', async () => {
    const { service, prisma } = montar();

    await service.remove(USUARIO, CONTACTO);

    expect(prisma.emergencyContact.deleteMany).toHaveBeenCalledWith({
      where: { id: CONTACTO, userId: USUARIO },
    });
  });

  it('quitar un contacto de otra cuenta da 404', async () => {
    const { service, prisma } = montar();
    prisma.emergencyContact.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.remove(USUARIO, CONTACTO)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('EmergencyContactService.sendTest (spec 008, CA-6, CA-7)', () => {
  it('manda la prueba al chat del contacto activo y la registra', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyContact.findFirst.mockResolvedValue(activo());

    const result = await service.sendTest(USUARIO, CONTACTO);

    expect(result).toEqual({ status: 'SENT', error: null });
    const [chatId, html] = telegram.sendMessage.mock.calls[0];
    expect(chatId).toBe(99n);
    expect(html).toContain('Mensaje de prueba de SendaBC');
    expect(html).toContain('Hola, Mamá. Ana envió');
    expect(prisma.alertMessage.create).toHaveBeenCalledWith({
      data: {
        userId: USUARIO,
        contactId: CONTACTO,
        contactName: 'Mamá',
        kind: 'TEST',
        status: 'SENT',
        telegramMessageId: 5,
        error: null,
      },
    });
  });

  it('un contacto pendiente o que no recibe mensajes da 409 sin enviar nada', async () => {
    for (const contacto of [
      fila(),
      fila({ status: 'UNREACHABLE', telegramChatId: 99n }),
    ]) {
      const { service, prisma, telegram } = montar();
      prisma.emergencyContact.findFirst.mockResolvedValue(contacto);

      await expect(service.sendTest(USUARIO, CONTACTO)).rejects.toThrow(
        new ConflictException(MENSAJES_CONTACTO.pruebaNoActivo),
      );
      expect(telegram.sendMessage).not.toHaveBeenCalled();
    }
  });

  it('un contacto de otra cuenta da 404', async () => {
    const { service, prisma } = montar();
    prisma.emergencyContact.findFirst.mockResolvedValue(null);

    await expect(service.sendTest(USUARIO, CONTACTO)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('a menos de un minuto de la anterior da 429 sin enviar', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyContact.findFirst.mockResolvedValue(activo());
    prisma.alertMessage.findFirst.mockResolvedValue({ id: 'm-1' });
    const antes = Date.now();

    const error = await service
      .sendTest(USUARIO, CONTACTO)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect((error as HttpException).message).toBe(
      MENSAJES_CONTACTO.pruebaSeguida,
    );
    expect(telegram.sendMessage).not.toHaveBeenCalled();
    const { where } = prisma.alertMessage.findFirst.mock.calls[0][0];
    expect(where).toMatchObject({ contactId: CONTACTO, kind: 'TEST' });
    const desde = (where.createdAt.gt as Date).getTime();
    expect(desde).toBeGreaterThanOrEqual(antes - ESPERA_PRUEBA_MS);
    expect(desde).toBeLessThanOrEqual(Date.now() - ESPERA_PRUEBA_MS);
  });

  it('un fallo de Telegram responde 200 con el motivo y lo registra', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyContact.findFirst.mockResolvedValue(activo());
    telegram.sendMessage.mockResolvedValue({
      ok: false,
      error: 'No se pudo conectar con Telegram',
    });

    const result = await service.sendTest(USUARIO, CONTACTO);

    expect(result).toEqual({
      status: 'FAILED',
      error: 'No se pudo conectar con Telegram',
    });
    expect(prisma.alertMessage.create.mock.calls[0][0].data).toMatchObject({
      status: 'FAILED',
      telegramMessageId: null,
      error: 'No se pudo conectar con Telegram',
    });
    expect(prisma.emergencyContact.update).not.toHaveBeenCalled();
  });

  it('si el contacto bloqueó al bot queda UNREACHABLE con una invitación nueva (CA-7)', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyContact.findFirst.mockResolvedValue(activo());
    telegram.sendMessage.mockResolvedValue({
      ok: false,
      blocked: true,
      error: CONTACTO_BLOQUEO,
    });

    const result = await service.sendTest(USUARIO, CONTACTO);

    expect(result).toEqual({ status: 'FAILED', error: CONTACTO_BLOQUEO });
    const { where, data } = prisma.emergencyContact.update.mock.calls[0][0];
    expect(where).toEqual({ id: CONTACTO });
    expect(data.status).toBe('UNREACHABLE');
    expect(data.inviteToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
