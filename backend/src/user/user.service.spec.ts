import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcrypt';
import { Prisma } from '@prisma/client';
import { MENSAJE_ALERTA_ACTIVA, UserService } from './user.service.js';
import type { PrismaService } from '../prisma.service.js';

const body = {
  email: 'prueba@senda.bc',
  displayName: 'Prueba',
  password: '12345678',
};

function serviceCon(create: ReturnType<typeof vi.fn>) {
  return new UserService({ user: { create } } as unknown as PrismaService);
}

describe('UserService.create (spec 001)', () => {
  it('no incluye passwordHash en la respuesta (CA-1)', async () => {
    const guardado = {
      id: 'u1',
      email: 'prueba@senda.bc',
      displayName: 'Prueba',
      passwordHash: '$2a$06$hash',
      avatarId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const service = serviceCon(vi.fn().mockResolvedValue(guardado));

    const result = await service.create(body);

    expect(result).not.toHaveProperty('passwordHash');
    const { passwordHash: _passwordHash, ...esperado } = guardado;
    expect(result).toEqual(esperado);
  });

  it('lanza ConflictException con el mensaje en español si el correo ya existe (CA-4)', async () => {
    const duplicado = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test',
      },
    );
    const service = serviceCon(vi.fn().mockRejectedValue(duplicado));

    const error = await service.create(body).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).message).toBe(
      'Ya existe un usuario con ese email',
    );
  });

  it('propaga otros errores de Prisma sin convertirlos en 409', async () => {
    const otro = new Prisma.PrismaClientKnownRequestError('Otro', {
      code: 'P2000',
      clientVersion: 'test',
    });
    const service = serviceCon(vi.fn().mockRejectedValue(otro));

    await expect(service.create(body)).rejects.toBe(otro);
  });

  it('manda la contraseña en passwordHash para que la hashee el trigger e ignora campos extra (RN-3)', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'u1',
      email: 'prueba@senda.bc',
      displayName: 'Prueba',
      passwordHash: '$2a$06$hash',
    });
    const service = new UserService({
      user: { create },
    } as unknown as PrismaService);

    await service.create({
      email: 'prueba@senda.bc',
      displayName: 'Prueba',
      password: '12345678',
      avatarId: 'zorro',
    } as never);

    expect(create).toHaveBeenCalledWith({
      data: {
        email: 'prueba@senda.bc',
        displayName: 'Prueba',
        passwordHash: '12345678',
      },
    });
  });

  it('normaliza el correo antes de guardarlo (RN-1)', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'u1', passwordHash: 'x' });
    const service = new UserService({
      user: { create },
    } as unknown as PrismaService);

    await service.create({
      email: '  Ana@Senda.BC ',
      displayName: 'Ana',
      password: '12345678',
    });

    expect(create.mock.calls[0][0].data.email).toBe('ana@senda.bc');
  });
});

describe('UserService.findByEmail (spec 001)', () => {
  it('busca con el correo normalizado (RN-1)', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const service = new UserService({
      user: { findFirst },
    } as unknown as PrismaService);

    await service.findByEmail(' Ana@Senda.BC');

    expect(findFirst).toHaveBeenCalledWith({
      where: { email: 'ana@senda.bc' },
    });
  });
});

describe('UserService.updateProfile (spec 011)', () => {
  const guardado = { id: 'u1', email: 'prueba@senda.bc', displayName: 'Ana Luz', avatarId: 'pino' };

  function serviceConUpdate() {
    const update = vi.fn().mockResolvedValue(guardado);
    const service = new UserService({ user: { update } } as unknown as PrismaService);
    return { service, update };
  }

  it('guarda nombre y avatar en la cuenta del token, sin passwordHash (CA-41, CA-42)', async () => {
    const { service, update } = serviceConUpdate();

    const result = await service.updateProfile('u1', { displayName: 'Ana Luz', avatarId: 'pino' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { displayName: 'Ana Luz', avatarId: 'pino' },
      omit: { passwordHash: true },
    });
    expect(result).toBe(guardado);
  });

  it('solo cambia los campos que vienen', async () => {
    const { service, update } = serviceConUpdate();

    await service.updateProfile('u1', { avatarId: 'sol' });

    expect(update.mock.calls[0][0].data).toEqual({ avatarId: 'sol' });
  });

  it('avatarId null quita el avatar (RN-15)', async () => {
    const { service, update } = serviceConUpdate();

    await service.updateProfile('u1', { avatarId: null });

    expect(update.mock.calls[0][0].data).toEqual({ avatarId: null });
  });
});

describe('UserService.updateEmail y updatePassword (spec 011)', () => {
  let hashActual: string;

  beforeAll(async () => {
    hashActual = await hash('actual-123', 4);
  });

  function serviceCon(update = vi.fn().mockResolvedValue({ id: 'u1', email: 'nuevo@senda.bc' })) {
    const findUnique = vi.fn().mockResolvedValue({ passwordHash: hashActual });
    const service = new UserService({ user: { findUnique, update } } as unknown as PrismaService);
    return { service, update, findUnique };
  }

  it('cambia el correo normalizado con la contraseña correcta, sin passwordHash (CA-43)', async () => {
    const { service, update, findUnique } = serviceCon();

    await service.updateEmail('u1', { email: ' Nuevo@Senda.BC', password: 'actual-123' });

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { passwordHash: true } });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { email: 'nuevo@senda.bc' },
      omit: { passwordHash: true },
    });
  });

  it('correo ya usado: 409 con el mensaje del registro (CA-43, spec 001 CA-4)', async () => {
    const duplicado = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    const { service } = serviceCon(vi.fn().mockRejectedValue(duplicado));

    const error = await service
      .updateEmail('u1', { email: 'otro@senda.bc', password: 'actual-123' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).message).toBe('Ya existe un usuario con ese email');
  });

  it('contraseña incorrecta: 403 y no cambia el correo (plan, D11)', async () => {
    const { service, update } = serviceCon();

    await expect(
      service.updateEmail('u1', { email: 'nuevo@senda.bc', password: 'mala-1234' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('escribe la contraseña nueva para que el trigger la hashee (CA-44; plan, D5)', async () => {
    const { service, update } = serviceCon();

    await service.updatePassword('u1', { currentPassword: 'actual-123', newPassword: 'nueva-1234' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'nueva-1234' },
      select: { id: true },
    });
  });

  it('contraseña actual incorrecta: 403 y no cambia nada (CA-44)', async () => {
    const { service, update } = serviceCon();

    await expect(
      service.updatePassword('u1', { currentPassword: 'mala-1234', newPassword: 'nueva-1234' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('usuario inexistente: 401', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const service = new UserService({ user: { findUnique } } as unknown as PrismaService);

    await expect(
      service.updatePassword('u1', { currentPassword: 'x', newPassword: 'nueva-1234' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('UserService.deleteAccount (spec 011, CA-46 a CA-48)', () => {
  let hashActual: string;

  beforeAll(async () => {
    hashActual = await hash('actual-123', 4);
  });

  function montarBorrado(alertasActivas = 0) {
    const tx = {
      emergencyAlert: { count: vi.fn().mockResolvedValue(alertasActivas) },
      route: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      user: { delete: vi.fn().mockResolvedValue({ id: 'u1' }) },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ passwordHash: hashActual }) },
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    const service = new UserService(prisma as unknown as PrismaService);
    return { service, prisma, tx };
  }

  it('en una transacción: busca alertas activas, retira las rutas no públicas y borra al usuario', async () => {
    const { service, prisma, tx } = montarBorrado();

    await service.deleteAccount('u1', { password: 'actual-123' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.emergencyAlert.count).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', session: { userId: 'u1' } },
    });
    // Las publicadas se quedan, sin autor por el SET NULL (CA-48).
    expect(tx.route.updateMany).toHaveBeenCalledWith({
      where: { createdByUserId: 'u1', status: { in: ['ARCHIVED', 'DRAFT'] } },
      data: { status: 'DELETED' },
    });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { id: true } });
    // Las rutas se retiran antes de que el SET NULL las deje sin autor.
    expect(tx.route.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.user.delete.mock.invocationCallOrder[0],
    );
  });

  it('con una alerta activa responde 409 y no borra nada (CA-47)', async () => {
    const { service, tx } = montarBorrado(1);

    const error = await service
      .deleteAccount('u1', { password: 'actual-123' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).message).toBe(MENSAJE_ALERTA_ACTIVA);
    expect(tx.route.updateMany).not.toHaveBeenCalled();
    expect(tx.user.delete).not.toHaveBeenCalled();
  });

  it('con la contraseña incorrecta responde 403 y no abre la transacción (CA-46; plan, D11)', async () => {
    const { service, prisma } = montarBorrado();

    await expect(
      service.deleteAccount('u1', { password: 'mala-1234' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('UserService.exists (spec 011, CA-49)', () => {
  it.each([
    [{ id: 'u1' }, true],
    [null, false],
  ])('busca por clave primaria: %o → %s', async (fila, esperado) => {
    const findUnique = vi.fn().mockResolvedValue(fila);
    const service = new UserService({ user: { findUnique } } as unknown as PrismaService);

    expect(await service.exists('u1')).toBe(esperado);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { id: true } });
  });
});
