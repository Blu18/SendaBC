import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma.service.js';
import { MENSAJES_SESION, SessionsService } from './sessions.service.js';

const USUARIO = '11111111-1111-4111-8111-111111111111';
const OTRO = '33333333-3333-4333-8333-333333333333';
const CLIENT_ID = '44444444-4444-4444-8444-444444444444';
const SESION_ID = '55555555-5555-4555-8555-555555555555';
const INICIO = '2026-10-22T15:00:00.000Z';
const REGRESO = '2026-10-22T18:00:00.000Z';

function sesion(overrides: Record<string, unknown> = {}) {
  return {
    id: SESION_ID,
    clientGeneratedId: CLIENT_ID,
    userId: USUARIO,
    type: 'HIKING',
    startedAt: new Date(INICIO),
    returnBy: new Date(REGRESO),
    endedAt: null,
    lastLocationAt: null,
    createdAt: new Date(INICIO),
    updatedAt: new Date(INICIO),
    ...overrides,
  };
}

const dto = { type: 'HIKING' as const, startedAt: INICIO, returnBy: REGRESO };

function montar() {
  const prisma = {
    safetySession: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(sesion(data)),
      ),
      update: vi.fn(
        ({ data }: { where: { id: string }; data: Record<string, unknown> }) =>
          Promise.resolve(sesion(data)),
      ),
    },
    emergencyAlert: { findFirst: vi.fn().mockResolvedValue(null) },
    $executeRaw: vi.fn().mockResolvedValue(1),
  };
  const service = new SessionsService(prisma as unknown as PrismaService);
  return { service, prisma };
}

function p2002() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

const respuestaBase = {
  clientId: CLIENT_ID,
  type: 'HIKING',
  startedAt: INICIO,
  returnBy: REGRESO,
  endedAt: null,
  lastLocationAt: null,
  activeAlert: null,
};

describe('SessionsService.upsert (spec 008, T6)', () => {
  it('crea la sesión con el usuario del token y la hora de regreso (CA-23)', async () => {
    const { service, prisma } = montar();

    expect(await service.upsert(USUARIO, CLIENT_ID, dto)).toEqual(
      respuestaBase,
    );
    expect(prisma.safetySession.create).toHaveBeenCalledWith({
      data: {
        clientGeneratedId: CLIENT_ID,
        userId: USUARIO,
        type: 'HIKING',
        startedAt: new Date(INICIO),
        returnBy: new Date(REGRESO),
      },
    });
  });

  it('crea la sesión sin hora de regreso (RN-10)', async () => {
    const { service, prisma } = montar();

    const result = await service.upsert(USUARIO, CLIENT_ID, {
      ...dto,
      returnBy: null,
    });

    expect(
      prisma.safetySession.create.mock.calls[0][0].data.returnBy,
    ).toBeNull();
    expect(result.returnBy).toBeNull();
  });

  it('responde 400 si la hora de regreso no es posterior al inicio', async () => {
    for (const returnBy of [INICIO, '2026-10-22T14:00:00.000Z']) {
      const { service, prisma } = montar();

      const error = await service
        .upsert(USUARIO, CLIENT_ID, { ...dto, returnBy })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        errors: { returnBy: [MENSAJES_SESION.regresoAntesDelInicio] },
      });
      expect(prisma.safetySession.create).not.toHaveBeenCalled();
    }
  });

  it('repetir el mismo PUT es idempotente: no escribe nada', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion());

    expect(await service.upsert(USUARIO, CLIENT_ID, dto)).toEqual(
      respuestaBase,
    );
    expect(prisma.safetySession.create).not.toHaveBeenCalled();
    expect(prisma.safetySession.update).not.toHaveBeenCalled();
  });

  it('cambia la hora de regreso de una sesión existente, sin cambiar tipo ni inicio (CA-19)', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion());
    const nuevo = '2026-10-22T19:30:00.000Z';

    const result = await service.upsert(USUARIO, CLIENT_ID, {
      type: 'CYCLING',
      startedAt: '2026-10-22T10:00:00.000Z',
      returnBy: nuevo,
    });

    expect(prisma.safetySession.update).toHaveBeenCalledWith({
      where: { id: SESION_ID },
      data: { returnBy: new Date(nuevo) },
    });
    expect(result.returnBy).toBe(nuevo);
    expect(result.type).toBe('HIKING');
  });

  it('valida la nueva hora contra el inicio guardado', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion());

    await expect(
      service.upsert(USUARIO, CLIENT_ID, {
        ...dto,
        startedAt: '2026-10-22T10:00:00.000Z',
        returnBy: '2026-10-22T12:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.safetySession.update).not.toHaveBeenCalled();
  });

  it('quitar la hora de regreso la deja en null', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion());

    await service.upsert(USUARIO, CLIENT_ID, { ...dto, returnBy: null });

    expect(prisma.safetySession.update.mock.calls[0][0].data).toEqual({
      returnBy: null,
    });
  });

  it('con la sesión terminada no cambia la hora de regreso', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(
      sesion({ endedAt: new Date('2026-10-22T17:00:00Z') }),
    );

    await service.upsert(USUARIO, CLIENT_ID, {
      ...dto,
      returnBy: '2026-10-22T20:00:00.000Z',
    });

    expect(prisma.safetySession.update).not.toHaveBeenCalled();
  });

  it('una sesión de otra cuenta con ese id da 404 y no se toca (CA-28)', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion({ userId: OTRO }));

    await expect(service.upsert(USUARIO, CLIENT_ID, dto)).rejects.toThrow(
      new NotFoundException(MENSAJES_SESION.noExiste),
    );
    expect(prisma.safetySession.update).not.toHaveBeenCalled();
    expect(prisma.safetySession.create).not.toHaveBeenCalled();
  });

  it('si dos PUT crean a la vez, el que pierde actualiza la del ganador', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(sesion({ returnBy: null }));
    prisma.safetySession.create.mockRejectedValue(p2002());

    const result = await service.upsert(USUARIO, CLIENT_ID, dto);

    expect(prisma.safetySession.update).toHaveBeenCalledWith({
      where: { id: SESION_ID },
      data: { returnBy: new Date(REGRESO) },
    });
    expect(result.returnBy).toBe(REGRESO);
  });

  it('incluye la alerta activa con a quiénes se envió (CA-17)', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion());
    prisma.emergencyAlert.findFirst.mockResolvedValue({
      id: 'a-1',
      reason: 'MANUAL_SOS',
      status: 'ACTIVE',
      triggeredAt: new Date('2026-10-22T16:00:00Z'),
      locationAt: new Date('2026-10-22T15:59:00Z'),
      messages: [
        {
          contactName: 'Mamá',
          status: 'SENT',
          createdAt: new Date('2026-10-22T16:00:01Z'),
        },
      ],
    });

    const result = await service.get(USUARIO, CLIENT_ID);

    expect(prisma.emergencyAlert.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: SESION_ID, status: 'ACTIVE' },
      }),
    );
    expect(result.activeAlert).toEqual({
      id: 'a-1',
      reason: 'SOS',
      status: 'ACTIVE',
      triggeredAt: '2026-10-22T16:00:00.000Z',
      locationAt: '2026-10-22T15:59:00.000Z',
      deliveries: [
        {
          contactName: 'Mamá',
          status: 'SENT',
          sentAt: '2026-10-22T16:00:01.000Z',
        },
      ],
    });
  });
});

describe('SessionsService.get (spec 008, T6)', () => {
  it('devuelve la sesión propia', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion());

    expect(await service.get(USUARIO, CLIENT_ID)).toEqual(respuestaBase);
  });

  it('una que no existe o es de otra cuenta da 404 (CA-28)', async () => {
    for (const fila of [null, sesion({ userId: OTRO })]) {
      const { service, prisma } = montar();
      prisma.safetySession.findUnique.mockResolvedValue(fila);

      await expect(service.get(USUARIO, CLIENT_ID)).rejects.toThrow(
        NotFoundException,
      );
    }
  });
});

describe('SessionsService.recordLocation (spec 008, CA-20)', () => {
  const ubicacion = {
    latitude: 32.05,
    longitude: -115.46,
    recordedAt: '2026-10-22T16:00:00.000Z',
  };

  it('guarda la ubicación como punto lng, lat solo si es más reciente', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion());

    const result = await service.recordLocation(USUARIO, CLIENT_ID, ubicacion);

    expect(result.guardada).toBe(true);
    const [partes, ...valores] = prisma.$executeRaw.mock.calls[0] as [
      string[],
      ...unknown[],
    ];
    const sql = partes.join('?');
    expect(sql).toContain('ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography');
    expect(sql).toContain('"lastLocationAt" IS NULL OR "lastLocationAt" < ?');
    expect(sql).toContain('"endedAt" IS NULL');
    expect(valores.slice(0, 2)).toEqual([-115.46, 32.05]);
    expect(valores).toContain(SESION_ID);
    expect(valores).toContainEqual(new Date(ubicacion.recordedAt));
  });

  it('una ubicación atrasada no reemplaza a la última: guardada es false', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion());
    prisma.$executeRaw.mockResolvedValue(0);

    const result = await service.recordLocation(USUARIO, CLIENT_ID, ubicacion);

    expect(result.guardada).toBe(false);
  });

  it('con la sesión terminada responde 409 sin guardar (RN-9)', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(
      sesion({ endedAt: new Date('2026-10-22T17:00:00Z') }),
    );

    await expect(
      service.recordLocation(USUARIO, CLIENT_ID, ubicacion),
    ).rejects.toThrow(new ConflictException(MENSAJES_SESION.terminada));
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('una sesión de otra cuenta da 404 sin guardar (CA-28)', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion({ userId: OTRO }));

    await expect(
      service.recordLocation(USUARIO, CLIENT_ID, ubicacion),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});

describe('SessionsService.finish (spec 008, CA-19)', () => {
  const FIN = '2026-10-22T17:00:00.000Z';

  it('termina la sesión con la hora de fin', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion());

    const result = await service.finish(USUARIO, CLIENT_ID, { endedAt: FIN });

    expect(prisma.safetySession.update).toHaveBeenCalledWith({
      where: { id: SESION_ID },
      data: { endedAt: new Date(FIN) },
    });
    expect(result.endedAt).toBe(FIN);
  });

  it('repetirlo conserva el primer fin', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(
      sesion({ endedAt: new Date(FIN) }),
    );

    const result = await service.finish(USUARIO, CLIENT_ID, {
      endedAt: '2026-10-22T17:05:00.000Z',
    });

    expect(prisma.safetySession.update).not.toHaveBeenCalled();
    expect(result.endedAt).toBe(FIN);
  });

  it('una sesión de otra cuenta da 404 (CA-28)', async () => {
    const { service, prisma } = montar();
    prisma.safetySession.findUnique.mockResolvedValue(sesion({ userId: OTRO }));

    await expect(
      service.finish(USUARIO, CLIENT_ID, { endedAt: FIN }),
    ).rejects.toThrow(NotFoundException);
  });
});
