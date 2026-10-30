import { HttpStatus, NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import type { AlertsService } from './alerts.service.js';
import { alertId, SafetyController, sessionId } from './safety.controller.js';
import type { SessionsService } from './sessions.service.js';

const USUARIO = '11111111-1111-4111-8111-111111111111';
const CLIENT_ID = '44444444-4444-4444-8444-444444444444';
const ALERTA = '66666666-6666-4666-8666-666666666666';
const req = { user: { id: USUARIO } } as never;

const sesionDto = {
  type: 'HIKING' as const,
  startedAt: '2026-10-22T15:00:00.000Z',
  returnBy: null,
};
const ubicacion = {
  latitude: 32.05,
  longitude: -115.46,
  recordedAt: '2026-10-22T16:00:00.000Z',
};
const alertaDto = {
  clientAlertId: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
  reason: 'SOS' as const,
  triggeredAt: '2026-10-22T16:00:00.000Z',
};

function montar() {
  const sessions = {
    upsert: vi.fn().mockResolvedValue({ clientId: CLIENT_ID }),
    get: vi.fn().mockResolvedValue({ clientId: CLIENT_ID }),
  };
  const alerts = {
    recordLocation: vi.fn().mockResolvedValue(undefined),
    finish: vi.fn().mockResolvedValue({ clientId: CLIENT_ID }),
    create: vi.fn().mockResolvedValue({ alerta: { id: ALERTA }, creada: true }),
    cancel: vi.fn().mockResolvedValue({ id: ALERTA, status: 'CANCELLED' }),
  };
  const controller = new SafetyController(
    sessions as unknown as SessionsService,
    alerts as unknown as AlertsService,
  );
  const res = { status: vi.fn() };
  return { controller, sessions, alerts, res };
}

describe('SafetyController (spec 008, CA-28)', () => {
  it('protege toda la clase con JwtAuthGuard, sin reemplazarlo en ningún método', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, SafetyController)).toEqual([
      JwtAuthGuard,
    ]);
    for (const metodo of [
      'upsert',
      'get',
      'recordLocation',
      'finish',
      'createAlert',
      'cancel',
    ] as const) {
      expect(
        Reflect.getMetadata(
          GUARDS_METADATA,
          SafetyController.prototype[metodo],
        ),
      ).toBeUndefined();
    }
  });

  it('usa el usuario del token en cada acción (constitución 3.3)', async () => {
    const { controller, sessions, alerts, res } = montar();

    await controller.upsert(req, CLIENT_ID, sesionDto);
    await controller.get(req, CLIENT_ID);
    await controller.recordLocation(req, CLIENT_ID, ubicacion);
    await controller.finish(req, CLIENT_ID, {
      endedAt: '2026-10-22T17:00:00.000Z',
    });
    await controller.createAlert(req, CLIENT_ID, alertaDto, res as never);
    await controller.cancel(req, ALERTA);

    expect(sessions.upsert).toHaveBeenCalledWith(USUARIO, CLIENT_ID, sesionDto);
    expect(sessions.get).toHaveBeenCalledWith(USUARIO, CLIENT_ID);
    expect(alerts.recordLocation).toHaveBeenCalledWith(
      USUARIO,
      CLIENT_ID,
      ubicacion,
    );
    expect(alerts.finish).toHaveBeenCalledWith(USUARIO, CLIENT_ID, {
      endedAt: '2026-10-22T17:00:00.000Z',
    });
    expect(alerts.create).toHaveBeenCalledWith(USUARIO, CLIENT_ID, alertaDto);
    expect(alerts.cancel).toHaveBeenCalledWith(USUARIO, ALERTA);
  });

  it('una alerta nueva responde 201 y una que ya existía 200 (CA-27)', async () => {
    const { controller, alerts, res } = montar();

    expect(
      await controller.createAlert(req, CLIENT_ID, alertaDto, res as never),
    ).toEqual({ id: ALERTA });
    expect(res.status).toHaveBeenLastCalledWith(HttpStatus.CREATED);

    alerts.create.mockResolvedValue({ alerta: { id: ALERTA }, creada: false });
    await controller.createAlert(req, CLIENT_ID, alertaDto, res as never);
    expect(res.status).toHaveBeenLastCalledWith(HttpStatus.OK);
  });

  it('un clientId que no es UUID v4, o un id de alerta que no es UUID, da 404', async () => {
    await expect(
      sessionId.transform('no-es-uuid', { type: 'param' }),
    ).rejects.toThrow(NotFoundException);
    // UUID v1: la actividad siempre usa v4 (constitución 2.2).
    await expect(
      sessionId.transform('a1b2c3d4-0000-11ee-8000-000000000000', {
        type: 'param',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(await sessionId.transform(CLIENT_ID, { type: 'param' })).toBe(
      CLIENT_ID,
    );
    await expect(alertId.transform('x', { type: 'param' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
