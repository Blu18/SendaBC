import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { ActivityController } from './activity.controller.js';
import type { ActivityService } from './activity.service.js';

const USUARIO = '11111111-1111-4111-8111-111111111111';
const req = { user: { id: USUARIO } } as never;

function montar() {
  const service = {
    syncBatch: vi.fn().mockResolvedValue([{ status: 'CREATED' }]),
    list: vi.fn().mockResolvedValue([]),
    getDetail: vi.fn().mockResolvedValue({ id: 'srv-1' }),
  };
  const controller = new ActivityController(
    service as unknown as ActivityService,
  );
  return { controller, service };
}

describe('ActivityController (spec 005)', () => {
  it('protege todas las rutas con JwtAuthGuard (CA-18)', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ActivityController)).toEqual([
      JwtAuthGuard,
    ]);
  });

  it('sync usa el usuario del token y envuelve los resultados', async () => {
    const { controller, service } = montar();
    const activities = [{ clientGeneratedId: 'a' }];

    const result = await controller.sync(req, { activities });

    expect(service.syncBatch).toHaveBeenCalledWith(USUARIO, activities);
    expect(result).toEqual({ results: [{ status: 'CREATED' }] });
  });

  it('list y detail usan el usuario del token', async () => {
    const { controller, service } = montar();

    await controller.list(req);
    await controller.detail(req, 'srv-1');

    expect(service.list).toHaveBeenCalledWith(USUARIO);
    expect(service.getDetail).toHaveBeenCalledWith(USUARIO, 'srv-1');
  });
});
