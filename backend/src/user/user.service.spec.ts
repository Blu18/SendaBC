import { UserService } from './user.service.js';
import type { PrismaService } from '../prisma.service.js';

describe('UserService.create (spec 001)', () => {
  it('manda la contraseña en passwordHash para que la hashee el trigger e ignora campos extra (RN-3)', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'u1',
      email: 'prueba@senda.bc',
      displayName: 'Prueba',
      passwordHash: '$2a$06$hash',
    });
    const service = new UserService({ user: { create } } as unknown as PrismaService);

    await service.create({
      email: 'prueba@senda.bc',
      displayName: 'Prueba',
      password: '12345678',
      avatarUrl: 'https://x.y/z.png',
    } as never);

    expect(create).toHaveBeenCalledWith({
      data: { email: 'prueba@senda.bc', displayName: 'Prueba', passwordHash: '12345678' },
    });
  });

  it('normaliza el correo antes de guardarlo (RN-1)', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'u1', passwordHash: 'x' });
    const service = new UserService({ user: { create } } as unknown as PrismaService);

    await service.create({ email: '  Ana@Senda.BC ', displayName: 'Ana', password: '12345678' });

    expect(create.mock.calls[0][0].data.email).toBe('ana@senda.bc');
  });
});

describe('UserService.findByEmail (spec 001)', () => {
  it('busca con el correo normalizado (RN-1)', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const service = new UserService({ user: { findFirst } } as unknown as PrismaService);

    await service.findByEmail(' Ana@Senda.BC');

    expect(findFirst).toHaveBeenCalledWith({ where: { email: 'ana@senda.bc' } });
  });
});
