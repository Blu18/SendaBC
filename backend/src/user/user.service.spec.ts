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
});
