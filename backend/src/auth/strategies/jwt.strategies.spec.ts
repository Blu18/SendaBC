import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategies.js';
import type { UserService } from '../../user/user.service.js';

function estrategia(existe: boolean) {
  const exists = vi.fn().mockResolvedValue(existe);
  const strategy = new JwtStrategy(
    { secret: 'secreto-de-prueba' } as never,
    { exists } as unknown as UserService,
  );
  return { strategy, exists };
}

describe('JwtStrategy.validate (spec 011, CA-49; plan, D6)', () => {
  it('con el usuario existente devuelve su id', async () => {
    const { strategy, exists } = estrategia(true);

    expect(await strategy.validate({ id: 'u1' })).toEqual({ id: 'u1' });
    expect(exists).toHaveBeenCalledWith('u1');
  });

  it('con una cuenta borrada responde 401', async () => {
    const { strategy } = estrategia(false);

    await expect(strategy.validate({ id: 'u1' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
