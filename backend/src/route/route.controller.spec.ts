import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { RouteController, routeId } from './route.controller.js';
import type { RouteService } from './route.service.js';

const USUARIO = '11111111-1111-4111-8111-111111111111';
const RUTA = '7d9f3c1a-2b4e-4f6a-8c0d-1e2f3a4b5c6d';
const req = { user: { id: USUARIO } } as never;

function montar() {
  const service = {
    nearby: vi.fn().mockResolvedValue([{ id: 'r-1' }]),
    publish: vi.fn().mockResolvedValue(RUTA),
    detail: vi.fn().mockResolvedValue({ id: RUTA }),
    update: vi.fn().mockResolvedValue({ id: RUTA, name: 'Nuevo' }),
    remove: vi.fn().mockResolvedValue(undefined),
    listMine: vi.fn().mockResolvedValue([{ id: RUTA }]),
    listFavorites: vi.fn().mockResolvedValue([{ id: RUTA }]),
    addFavorite: vi.fn().mockResolvedValue(undefined),
    removeFavorite: vi.fn().mockResolvedValue(undefined),
  };
  const controller = new RouteController(service as unknown as RouteService);
  return { controller, service };
}

describe('RouteController (spec 006)', () => {
  it('protege las rutas con JwtAuthGuard (CA-17)', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, RouteController)).toEqual([
      JwtAuthGuard,
    ]);
  });

  it('nearby usa el usuario del token y la query validada', async () => {
    const { controller, service } = montar();
    const query = { lat: 31.86, lng: -116.6, radiusKm: 25 };

    const result = await controller.nearby(req, query);

    expect(service.nearby).toHaveBeenCalledWith(USUARIO, query);
    expect(result).toEqual([{ id: 'r-1' }]);
  });
});

describe('RouteController (spec 007)', () => {
  it('los endpoints nuevos heredan el JwtAuthGuard de la clase sin reemplazarlo (CA-27)', () => {
    for (const metodo of [
      'publish',
      'mine',
      'favorites',
      'detail',
      'update',
      'remove',
      'addFavorite',
      'removeFavorite',
    ] as const) {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, RouteController.prototype[metodo]),
      ).toBeUndefined();
    }
    expect(Reflect.getMetadata(GUARDS_METADATA, RouteController)).toEqual([
      JwtAuthGuard,
    ]);
  });

  it('publish publica con el usuario del token y responde con el detalle (CA-6)', async () => {
    const { controller, service } = montar();
    const body = { activityId: 'act-1', name: 'Ruta' };

    expect(await controller.publish(req, body)).toEqual({ id: RUTA });

    expect(service.publish).toHaveBeenCalledWith(USUARIO, body);
    expect(service.detail).toHaveBeenCalledWith(USUARIO, RUTA);
  });

  it('mine y favorites usan el usuario del token (CA-20, CA-21)', async () => {
    const { controller, service } = montar();

    await controller.mine(req);
    await controller.favorites(req);

    expect(service.listMine).toHaveBeenCalledWith(USUARIO);
    expect(service.listFavorites).toHaveBeenCalledWith(USUARIO);
  });

  it('detail, update y remove pasan el usuario del token y el id (CA-26)', async () => {
    const { controller, service } = montar();
    const body = { name: 'Nuevo' };

    await controller.detail(req, RUTA);
    await controller.update(req, RUTA, body);
    await controller.remove(req, RUTA);

    expect(service.detail).toHaveBeenCalledWith(USUARIO, RUTA);
    expect(service.update).toHaveBeenCalledWith(USUARIO, RUTA, body);
    expect(service.remove).toHaveBeenCalledWith(USUARIO, RUTA);
  });

  it('guardar y quitar favorita usan el usuario del token (CA-15)', async () => {
    const { controller, service } = montar();

    await controller.addFavorite(req, RUTA);
    await controller.removeFavorite(req, RUTA);

    expect(service.addFavorite).toHaveBeenCalledWith(USUARIO, RUTA);
    expect(service.removeFavorite).toHaveBeenCalledWith(USUARIO, RUTA);
  });

  it('remove, addFavorite y removeFavorite responden 204', () => {
    for (const metodo of ['remove', 'addFavorite', 'removeFavorite'] as const) {
      expect(
        Reflect.getMetadata('__httpCode__', RouteController.prototype[metodo]),
      ).toBe(204);
    }
  });

  it("'mine' y 'favorites' se declaran antes de ':id'", () => {
    const metodos = Object.getOwnPropertyNames(RouteController.prototype);
    expect(metodos.indexOf('mine')).toBeLessThan(metodos.indexOf('detail'));
    expect(metodos.indexOf('favorites')).toBeLessThan(
      metodos.indexOf('detail'),
    );
  });

  it('un id que no es UUID responde 404 "ya no está disponible"', async () => {
    await expect(
      routeId.transform('no-es-uuid', { type: 'param', data: 'id' }),
    ).rejects.toThrow(new NotFoundException('Esta ruta ya no está disponible'));
    await expect(
      routeId.transform(RUTA, { type: 'param', data: 'id' }),
    ).resolves.toBe(RUTA);
  });
});
