import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import {
  contactId,
  EmergencyContactController,
} from './emergency-contact.controller.js';
import type { EmergencyContactService } from './emergency-contact.service.js';

const USUARIO = '11111111-1111-4111-8111-111111111111';
const CONTACTO = '22222222-2222-4222-8222-222222222222';
const req = { user: { id: USUARIO } } as never;

function montar() {
  const service = {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: CONTACTO }),
    update: vi.fn().mockResolvedValue({ id: CONTACTO }),
    remove: vi.fn().mockResolvedValue(undefined),
    sendTest: vi.fn().mockResolvedValue({ status: 'SENT', error: null }),
  };
  const controller = new EmergencyContactController(
    service as unknown as EmergencyContactService,
  );
  return { controller, service };
}

describe('EmergencyContactController (spec 008, CA-28)', () => {
  it('protege toda la clase con JwtAuthGuard, sin reemplazarlo en ningún método', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, EmergencyContactController),
    ).toEqual([JwtAuthGuard]);
    for (const metodo of [
      'list',
      'create',
      'update',
      'remove',
      'sendTest',
    ] as const) {
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          EmergencyContactController.prototype[metodo],
        ),
      ).toBeUndefined();
    }
  });

  it('usa el usuario del token en cada acción (constitución 3.3)', async () => {
    const { controller, service } = montar();

    await controller.list(req);
    await controller.create(req, { name: 'Mamá' });
    await controller.update(req, CONTACTO, { name: 'Papá' });
    await controller.remove(req, CONTACTO);
    await controller.sendTest(req, CONTACTO);

    expect(service.list).toHaveBeenCalledWith(USUARIO);
    expect(service.create).toHaveBeenCalledWith(USUARIO, { name: 'Mamá' });
    expect(service.update).toHaveBeenCalledWith(USUARIO, CONTACTO, {
      name: 'Papá',
    });
    expect(service.remove).toHaveBeenCalledWith(USUARIO, CONTACTO);
    expect(service.sendTest).toHaveBeenCalledWith(USUARIO, CONTACTO);
  });

  it('un id que no es UUID da 404', async () => {
    await expect(
      contactId.transform('no-es-uuid', { type: 'param' }),
    ).rejects.toThrow(NotFoundException);
  });
});
