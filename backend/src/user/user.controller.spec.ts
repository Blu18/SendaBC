import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { UserController } from './user.controller.js';
import type { UserService } from './user.service.js';

// Spec 011, CA-23: el controlador solo pasa al servicio el id del token (constitución 3.3).
const USUARIO = '11111111-1111-4111-8111-111111111111';
const req = { user: { id: USUARIO } } as never;

function montar() {
  const service = {
    create: vi.fn().mockResolvedValue({ id: USUARIO }),
    findOne: vi.fn().mockResolvedValue({ id: USUARIO }),
    updateProfile: vi.fn().mockResolvedValue({ id: USUARIO }),
    updateEmail: vi.fn().mockResolvedValue({ id: USUARIO }),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
  };
  const controller = new UserController(service as unknown as UserService);
  return { controller, service };
}

describe('UserController (specs 001, 002 y 011)', () => {
  it('crear cuenta no pide token; todo lo demás usa JwtAuthGuard', () => {
    const guards = (metodo: keyof UserController) =>
      Reflect.getMetadata(GUARDS_METADATA, UserController.prototype[metodo]);

    expect(guards('create')).toBeUndefined();
    for (const metodo of [
      'getProfile',
      'updateProfile',
      'updateEmail',
      'updatePassword',
      'deleteAccount',
    ] as const) {
      expect(guards(metodo)).toEqual([JwtAuthGuard]);
    }
  });

  it('cada endpoint de "mi usuario" usa el id del token y el cuerpo validado', async () => {
    const { controller, service } = montar();
    const perfil = { displayName: 'Blu' };
    const correo = { email: 'nuevo@senda.bc', currentPassword: 'x' };
    const contrasena = { currentPassword: 'x', newPassword: 'y' };
    const borrar = { password: 'x' };

    await controller.getProfile(req);
    await controller.updateProfile(req, perfil as never);
    await controller.updateEmail(req, correo as never);
    await controller.updatePassword(req, contrasena as never);
    await controller.deleteAccount(req, borrar as never);

    expect(service.findOne).toHaveBeenCalledWith(USUARIO);
    expect(service.updateProfile).toHaveBeenCalledWith(USUARIO, perfil);
    expect(service.updateEmail).toHaveBeenCalledWith(USUARIO, correo);
    expect(service.updatePassword).toHaveBeenCalledWith(USUARIO, contrasena);
    expect(service.deleteAccount).toHaveBeenCalledWith(USUARIO, borrar);
  });

  it('crear cuenta pasa el cuerpo tal cual', async () => {
    const { controller, service } = montar();
    const dto = { email: 'a@senda.bc', displayName: 'A', password: 'x' };

    await controller.create(dto as never);

    expect(service.create).toHaveBeenCalledWith(dto);
  });
});
