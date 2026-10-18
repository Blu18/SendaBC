import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { RouteController } from './route.controller.js';
import type { RouteService } from './route.service.js';

const USUARIO = '11111111-1111-4111-8111-111111111111';
const req = { user: { id: USUARIO } } as never;

describe('RouteController (spec 006)', () => {
  it('protege las rutas con JwtAuthGuard (CA-17)', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, RouteController)).toEqual([
      JwtAuthGuard,
    ]);
  });

  it('nearby usa el usuario del token y la query validada', async () => {
    const service = { nearby: vi.fn().mockResolvedValue([{ id: 'r-1' }]) };
    const controller = new RouteController(service as unknown as RouteService);
    const query = { lat: 31.86, lng: -116.6, radiusKm: 25 };

    const result = await controller.nearby(req, query);

    expect(service.nearby).toHaveBeenCalledWith(USUARIO, query);
    expect(result).toEqual([{ id: 'r-1' }]);
  });
});
