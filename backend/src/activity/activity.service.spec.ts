import { Prisma } from '@prisma/client';
import { ActivityService, ID_AJENO } from './activity.service.js';
import type { PrismaService } from '../prisma.service.js';

const USUARIO = '11111111-1111-4111-8111-111111111111';
const OTRO = '22222222-2222-4222-8222-222222222222';

function punto(sequence: number) {
  return {
    sequence,
    latitude: 31.86 + sequence / 1000,
    longitude: -116.59 - sequence / 1000,
    altitude: sequence === 2 ? null : 20 + sequence,
    accuracy: 4,
    recordedAt: `2026-10-09T10:00:0${sequence}.000Z`,
  };
}

function actividad(id: string, points = [punto(1), punto(2), punto(3)]) {
  return {
    clientGeneratedId: id,
    type: 'TRAIL_RUNNING',
    startedAt: '2026-10-09T10:00:00.000Z',
    endedAt: '2026-10-09T11:00:00.000Z',
    distanceMeters: 8123.4,
    durationSeconds: 3600,
    elevationGainMeters: 410,
    elevationLossMeters: 395,
    elevationSource: 'GPS',
    points,
  };
}

const A1 = '3b241101-e2bb-4255-8caf-4136c566a961';
const A2 = '3b241101-e2bb-4255-8caf-4136c566a962';

function p2002() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

// Prisma simulado: findUnique fuera de la transacción; create y $executeRaw dentro.
function montar() {
  const tx = {
    activity: { create: vi.fn().mockResolvedValue({ id: 'srv-1' }) },
    $executeRaw: vi.fn().mockResolvedValue(1),
  };
  const prisma = {
    activity: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const service = new ActivityService(prisma as unknown as PrismaService);
  return { service, prisma, tx };
}

// Valores interpolados en una llamada a $executeRaw`...` (el primer argumento son los textos).
function valores(call: unknown[]) {
  return call.slice(1);
}

describe('ActivityService.syncBatch (spec 005)', () => {
  it('guarda una válida y rechaza una inválida del mismo lote (CA-11)', async () => {
    const { service, tx } = montar();
    const invalida = { ...actividad(A2), endedAt: '2026-10-09T09:00:00.000Z' };

    const results = await service.syncBatch(USUARIO, [actividad(A1), invalida]);

    expect(results).toEqual([
      { clientGeneratedId: A1, status: 'CREATED', id: 'srv-1' },
      {
        clientGeneratedId: A2,
        status: 'REJECTED',
        errors: ['El fin de la actividad debe ser posterior al inicio'],
      },
    ]);
    expect(tx.activity.create).toHaveBeenCalledTimes(1);
  });

  it('guarda la actividad con el usuario del token, métricas y fuente (CA-5, CA-18)', async () => {
    const { service, tx } = montar();

    await service.syncBatch(USUARIO, [{ ...actividad(A1), userId: OTRO }]);

    expect(tx.activity.create).toHaveBeenCalledWith({
      data: {
        clientGeneratedId: A1,
        userId: USUARIO,
        type: 'TRAIL_RUNNING',
        status: 'SYNCED',
        startedAt: new Date('2026-10-09T10:00:00.000Z'),
        endedAt: new Date('2026-10-09T11:00:00.000Z'),
        distanceMeters: 8123.4,
        durationSeconds: 3600,
        elevationGainMeters: 410,
        elevationLossMeters: 395,
        elevationSource: 'GPS',
      },
      select: { id: true },
    });
  });

  it('inserta los puntos en un solo INSERT y arma el recorrido (CA-5, CA-6)', async () => {
    const { service, tx } = montar();

    await service.syncBatch(USUARIO, [actividad(A1)]);

    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    const [insert, path] = tx.$executeRaw.mock.calls;
    expect(insert[0].join('?')).toContain('INSERT INTO activity_points');
    expect(valores(insert)).toEqual([
      'srv-1',
      [1, 2, 3],
      [1, 2, 3].map((s) => punto(s).latitude),
      [1, 2, 3].map((s) => punto(s).longitude),
      [21, null, 23],
      [4, 4, 4],
      [
        '2026-10-09T10:00:01.000Z',
        '2026-10-09T10:00:02.000Z',
        '2026-10-09T10:00:03.000Z',
      ],
    ]);
    expect(path[0].join('?')).toContain(
      'ST_MakeLine(location ORDER BY sequence)',
    );
    expect(valores(path)).toEqual(['srv-1', 'srv-1']);
  });

  it('sin puntos no inserta puntos ni recorrido (spec 004, CA-17)', async () => {
    const { service, tx } = montar();

    const [result] = await service.syncBatch(USUARIO, [actividad(A1, [])]);

    expect(result.status).toBe('CREATED');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('con un solo punto lo inserta pero no arma recorrido', async () => {
    const { service, tx } = montar();

    await service.syncBatch(USUARIO, [actividad(A1, [punto(1)])]);

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw.mock.calls[0][0].join('?')).toContain(
      'INSERT INTO activity_points',
    );
  });

  it('un reenvío del mismo usuario responde ALREADY_EXISTS sin guardar de nuevo (CA-10)', async () => {
    const { service, prisma } = montar();
    prisma.activity.findUnique.mockResolvedValue({
      id: 'srv-7',
      userId: USUARIO,
    });

    const results = await service.syncBatch(USUARIO, [actividad(A1)]);

    expect(results).toEqual([
      { clientGeneratedId: A1, status: 'ALREADY_EXISTS', id: 'srv-7' },
    ]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('un identificador de otra cuenta se rechaza sin revelar que existe', async () => {
    const { service, prisma } = montar();
    prisma.activity.findUnique.mockResolvedValue({ id: 'srv-7', userId: OTRO });

    const results = await service.syncBatch(USUARIO, [actividad(A1)]);

    expect(results).toEqual([
      { clientGeneratedId: A1, status: 'REJECTED', errors: [ID_AJENO] },
    ]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('dos envíos simultáneos: el que choca con P2002 responde ALREADY_EXISTS (CA-10)', async () => {
    const { service, prisma } = montar();
    prisma.activity.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'srv-9', userId: USUARIO });
    prisma.$transaction.mockRejectedValue(p2002());

    const results = await service.syncBatch(USUARIO, [actividad(A1)]);

    expect(results).toEqual([
      { clientGeneratedId: A1, status: 'ALREADY_EXISTS', id: 'srv-9' },
    ]);
  });

  it('un P2002 sin actividad que lo explique se relanza', async () => {
    const { service, prisma } = montar();
    prisma.$transaction.mockRejectedValue(p2002());

    await expect(
      service.syncBatch(USUARIO, [actividad(A1)]),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it('un error inesperado se relanza para que el cliente reintente el lote (CA-13)', async () => {
    const { service, prisma } = montar();
    prisma.$transaction.mockRejectedValue(new Error('la base no responde'));

    await expect(
      service.syncBatch(USUARIO, [actividad(A1), actividad(A2)]),
    ).rejects.toThrow('la base no responde');
  });

  it('una actividad mal formada se rechaza con clientGeneratedId null si no lo trae', async () => {
    const { service } = montar();

    const results = await service.syncBatch(USUARIO, [{ foo: 1 }, 'x']);

    expect(results.map((r) => [r.clientGeneratedId, r.status])).toEqual([
      [null, 'REJECTED'],
      [null, 'REJECTED'],
    ]);
  });
});
