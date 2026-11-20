import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import { LocalAuthGuard } from './guards/local-auth/local-auth.guard.js';

// Spec 002, CA-1 (spec 011, CA-23): el login pasa por LocalAuthGuard y responde el id y el token
// del usuario que validó la estrategia.
describe('AuthController (spec 002)', () => {
  it('login usa LocalAuthGuard', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.login),
    ).toEqual([LocalAuthGuard]);
  });

  it('login firma el token con el id que dejó la estrategia', async () => {
    const service = { login: vi.fn().mockReturnValue('token-firmado') };
    const controller = new AuthController(service as unknown as AuthService);

    const res = await controller.login({ user: { id: 'u-1' } } as never);

    expect(service.login).toHaveBeenCalledWith('u-1');
    expect(res).toEqual({ id: 'u-1', token: 'token-firmado' });
  });
});
