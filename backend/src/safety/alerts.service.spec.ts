import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { EmergencyContactService } from '../emergency-contact/emergency-contact.service.js';
import type { PrismaService } from '../prisma.service.js';
import {
  CONTACTO_BLOQUEO,
  type TelegramSender,
} from '../telegram/telegram.sender.js';
import { AlertsService, MENSAJES_ALERTA } from './alerts.service.js';
import { REENVIO_CADA_MS } from './forwarding.js';
import type { SessionsService } from './sessions.service.js';

const USUARIO = '11111111-1111-4111-8111-111111111111';
const CLIENT_ID = '44444444-4444-4444-8444-444444444444';
const SESION_ID = '55555555-5555-4555-8555-555555555555';
const ALERTA_ID = '66666666-6666-4666-8666-666666666666';
const CLIENT_ALERT = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const DISPARO = new Date('2026-10-22T21:12:00Z');
const UBIC_AT = new Date('2026-10-22T21:10:00Z');

function sesion(overrides: Record<string, unknown> = {}) {
  return {
    id: SESION_ID,
    clientGeneratedId: CLIENT_ID,
    userId: USUARIO,
    type: 'HIKING',
    startedAt: new Date('2026-10-22T18:00:00Z'),
    returnBy: new Date('2026-10-22T20:30:00Z'),
    endedAt: null,
    lastLocationAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const contactos = [
  { id: 'c-1', name: 'Mamá', telegramChatId: 101n },
  { id: 'c-2', name: 'Beto', telegramChatId: 102n },
];

function alertaFila(overrides: Record<string, unknown> = {}) {
  return {
    id: ALERTA_ID,
    sessionId: SESION_ID,
    clientGeneratedId: CLIENT_ALERT,
    reason: 'INACTIVITY_TIMEOUT',
    status: 'ACTIVE',
    triggeredAt: DISPARO,
    locationAt: UBIC_AT,
    messages: [],
    ...overrides,
  };
}

const dtoAlerta = {
  clientAlertId: CLIENT_ALERT,
  reason: 'INACTIVITY' as const,
  triggeredAt: DISPARO.toISOString(),
  latitude: 32.0471,
  longitude: -115.4614,
  locationAt: UBIC_AT.toISOString(),
};

// Las consultas crudas se reconocen por su texto.
function sqlDe(llamada: unknown[]): Prisma.Sql {
  return llamada[0] as Prisma.Sql;
}

function montar() {
  const prisma = {
    $queryRaw: vi.fn(async (q: Prisma.Sql) => {
      if (q.sql.includes('INSERT INTO emergency_alerts'))
        return [{ id: ALERTA_ID }];
      if (q.sql.includes('"locationAt" AS at')) {
        return [{ lat: 32.0471, lng: -115.4614, at: UBIC_AT }];
      }
      return [];
    }),
    $executeRaw: vi.fn().mockResolvedValue(1),
    emergencyAlert: {
      findUniqueOrThrow: vi.fn().mockResolvedValue(alertaFila()),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    emergencyContact: { findMany: vi.fn().mockResolvedValue(contactos) },
    alertMessage: { create: vi.fn().mockResolvedValue({}) },
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ displayName: 'Ana' }),
    },
  };
  const sessions = {
    buscar: vi.fn().mockResolvedValue(sesion()),
    recordLocation: vi
      .fn()
      .mockResolvedValue({ sesion: sesion(), guardada: true }),
    finish: vi.fn().mockResolvedValue({}),
    responder: vi.fn().mockResolvedValue({ clientId: CLIENT_ID }),
  };
  const contacts = { marcarInalcanzable: vi.fn().mockResolvedValue(undefined) };
  const telegram = {
    sendMessage: vi.fn().mockResolvedValue({ ok: true, messageId: 9 }),
    sendLocation: vi.fn().mockResolvedValue({ ok: true, messageId: 10 }),
  };
  const service = new AlertsService(
    prisma as unknown as PrismaService,
    sessions as unknown as SessionsService,
    contacts as unknown as EmergencyContactService,
    telegram as unknown as TelegramSender,
  );
  return { service, prisma, sessions, contacts, telegram };
}

function insercion(prisma: ReturnType<typeof montar>['prisma']) {
  const llamada = prisma.$queryRaw.mock.calls.find((c) =>
    sqlDe(c).sql.includes('INSERT INTO emergency_alerts'),
  );
  return llamada ? sqlDe(llamada) : null;
}

describe('AlertsService.create (spec 008)', () => {
  it('inserta la alerta activa con su ubicación lng, lat, sin duplicar por los índices (CA-14, CA-27)', async () => {
    const { service, prisma, sessions } = montar();

    const { creada } = await service.create(USUARIO, CLIENT_ID, dtoAlerta);

    expect(creada).toBe(true);
    expect(sessions.buscar).toHaveBeenCalledWith(USUARIO, CLIENT_ID);
    const sql = insercion(prisma)!;
    expect(sql.sql).toContain('ON CONFLICT DO NOTHING');
    expect(sql.sql).toContain("'ACTIVE'");
    expect(sql.sql).toContain('ST_SetSRID(ST_MakePoint(');
    expect(sql.values).toEqual(
      expect.arrayContaining([
        SESION_ID,
        CLIENT_ALERT,
        'INACTIVITY_TIMEOUT',
        DISPARO,
        -115.4614,
        32.0471,
        UBIC_AT,
      ]),
    );
  });

  it('manda a cada contacto activo el texto de RN-6 y después el pin, y registra cada envío (CA-14)', async () => {
    const { service, prisma, telegram } = montar();

    await service.create(USUARIO, CLIENT_ID, dtoAlerta);

    expect(prisma.emergencyContact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: USUARIO,
          status: 'ACTIVE',
          telegramChatId: { not: null },
        },
      }),
    );
    expect(telegram.sendMessage.mock.calls.map((c) => c[0])).toEqual([
      101n,
      102n,
    ]);
    const html = telegram.sendMessage.mock.calls[0][1] as string;
    expect(html).toContain('Alerta de SendaBC');
    expect(html).toContain('Ana dejó de moverse');
    expect(html).toContain('Actividad: Senderismo');
    expect(html).toContain('Última ubicación, de las 14:10');
    expect(telegram.sendLocation.mock.calls).toEqual([
      [101n, 32.0471, -115.4614],
      [102n, 32.0471, -115.4614],
    ]);
    expect(prisma.alertMessage.create.mock.calls.map((c) => c[0].data)).toEqual(
      [
        {
          userId: USUARIO,
          alertId: ALERTA_ID,
          contactId: 'c-1',
          contactName: 'Mamá',
          kind: 'ALERT',
          status: 'SENT',
          telegramMessageId: 9,
          error: null,
        },
        expect.objectContaining({
          contactId: 'c-2',
          kind: 'ALERT',
          status: 'SENT',
        }),
      ],
    );
  });

  it('el SOS dice que pidió ayuda (CA-24)', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyAlert.findUniqueOrThrow.mockResolvedValue(
      alertaFila({ reason: 'MANUAL_SOS' }),
    );

    await service.create(USUARIO, CLIENT_ID, { ...dtoAlerta, reason: 'SOS' });

    expect(insercion(prisma)!.values).toContain('MANUAL_SOS');
    expect(telegram.sendMessage.mock.calls[0][1]).toContain(
      'Ana pidió ayuda desde la app.',
    );
  });

  it('devuelve la alerta con a quiénes se envió (CA-17)', async () => {
    const { service, prisma } = montar();
    prisma.emergencyAlert.findUniqueOrThrow.mockResolvedValue(
      alertaFila({
        messages: [
          {
            contactName: 'Mamá',
            status: 'SENT',
            createdAt: new Date('2026-10-22T21:12:01Z'),
          },
        ],
      }),
    );

    const { alerta } = await service.create(USUARIO, CLIENT_ID, dtoAlerta);

    expect(alerta).toEqual({
      id: ALERTA_ID,
      reason: 'INACTIVITY',
      status: 'ACTIVE',
      triggeredAt: DISPARO.toISOString(),
      locationAt: UBIC_AT.toISOString(),
      deliveries: [
        {
          contactName: 'Mamá',
          status: 'SENT',
          sentAt: '2026-10-22T21:12:01.000Z',
        },
      ],
    });
  });

  it('sin ubicación inserta NULL y no manda pin', async () => {
    const { service, prisma, telegram } = montar();
    prisma.$queryRaw.mockImplementation(async (q: Prisma.Sql) =>
      q.sql.includes('INSERT') ? [{ id: ALERTA_ID }] : [],
    );

    await service.create(USUARIO, CLIENT_ID, {
      ...dtoAlerta,
      latitude: null,
      longitude: null,
      locationAt: null,
    });

    expect(insercion(prisma)!.sql).not.toContain('ST_MakePoint');
    expect(telegram.sendMessage.mock.calls[0][1]).toContain(
      'la app no registró ninguna',
    );
    expect(telegram.sendLocation).not.toHaveBeenCalled();
  });

  it('una ubicación incompleta da 400 sin insertar', async () => {
    const { service, prisma } = montar();

    await expect(
      service.create(USUARIO, CLIENT_ID, { ...dtoAlerta, locationAt: null }),
    ).rejects.toThrow(BadRequestException);
    expect(insercion(prisma)).toBeNull();
  });

  it('con una alerta activa devuelve esa y no envía nada (CA-27, RN-8)', async () => {
    const { service, prisma, telegram } = montar();
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.emergencyAlert.findFirst.mockResolvedValue(
      alertaFila({ id: 'otra', clientGeneratedId: 'x' }),
    );

    const { alerta, creada } = await service.create(
      USUARIO,
      CLIENT_ID,
      dtoAlerta,
    );

    expect(creada).toBe(false);
    expect(alerta.id).toBe('otra');
    expect(prisma.emergencyAlert.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: SESION_ID, status: 'ACTIVE' },
      }),
    );
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('un reintento con el mismo clientAlertId devuelve la misma, aunque ya esté cancelada', async () => {
    const { service, prisma, telegram } = montar();
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.emergencyAlert.findUnique.mockResolvedValue(
      alertaFila({ status: 'CANCELLED' }),
    );

    const { alerta, creada } = await service.create(
      USUARIO,
      CLIENT_ID,
      dtoAlerta,
    );

    expect(creada).toBe(false);
    expect(alerta).toMatchObject({ id: ALERTA_ID, status: 'CANCELLED' });
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('un clientAlertId que usó otra sesión da 404', async () => {
    const { service, prisma } = montar();
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.emergencyAlert.findUnique.mockResolvedValue(
      alertaFila({ sessionId: 'otra-sesion' }),
    );

    await expect(service.create(USUARIO, CLIENT_ID, dtoAlerta)).rejects.toThrow(
      new NotFoundException(MENSAJES_ALERTA.noExiste),
    );
  });

  it('una sesión de otra cuenta da 404 sin insertar (CA-28)', async () => {
    const { service, prisma, sessions } = montar();
    sessions.buscar.mockRejectedValue(new NotFoundException());

    await expect(service.create(USUARIO, CLIENT_ID, dtoAlerta)).rejects.toThrow(
      NotFoundException,
    );
    expect(insercion(prisma)).toBeNull();
  });

  it('un envío fallido se registra como FAILED y no detiene a los demás', async () => {
    const { service, prisma, telegram } = montar();
    telegram.sendMessage
      .mockResolvedValueOnce({
        ok: false,
        error: 'No se pudo conectar con Telegram',
      })
      .mockResolvedValueOnce({ ok: true, messageId: 11 });

    await service.create(USUARIO, CLIENT_ID, dtoAlerta);

    const datos = prisma.alertMessage.create.mock.calls.map((c) => c[0].data);
    expect(datos[0]).toMatchObject({
      contactId: 'c-1',
      status: 'FAILED',
      error: 'No se pudo conectar con Telegram',
    });
    expect(datos[1]).toMatchObject({ contactId: 'c-2', status: 'SENT' });
    // Sin texto no se manda el pin.
    expect(telegram.sendLocation.mock.calls).toEqual([
      [102n, 32.0471, -115.4614],
    ]);
  });

  it('un contacto que bloqueó al bot pasa a UNREACHABLE (CA-7)', async () => {
    const { service, contacts, telegram } = montar();
    telegram.sendMessage
      .mockResolvedValueOnce({
        ok: false,
        blocked: true,
        error: CONTACTO_BLOQUEO,
      })
      .mockResolvedValueOnce({ ok: true, messageId: 11 });

    await service.create(USUARIO, CLIENT_ID, dtoAlerta);

    expect(contacts.marcarInalcanzable.mock.calls).toEqual([['c-1']]);
  });

  it('sin contactos activos crea la alerta igual, sin enviar nada', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyContact.findMany.mockResolvedValue([]);

    const { creada } = await service.create(USUARIO, CLIENT_ID, dtoAlerta);

    expect(creada).toBe(true);
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });
});

describe('AlertsService.cancel (spec 008, CA-25)', () => {
  it('cancela la alerta activa del usuario y manda "está bien" a los contactos', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyAlert.findFirst.mockResolvedValue({
      id: ALERTA_ID,
      status: 'ACTIVE',
    });
    prisma.emergencyAlert.findUniqueOrThrow.mockResolvedValue(
      alertaFila({ status: 'CANCELLED' }),
    );

    const result = await service.cancel(USUARIO, ALERTA_ID);

    expect(prisma.emergencyAlert.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ALERTA_ID, session: { userId: USUARIO } },
      }),
    );
    const { where, data } = prisma.emergencyAlert.updateMany.mock.calls[0][0];
    expect(where).toEqual({ id: ALERTA_ID, status: 'ACTIVE' });
    expect(data.status).toBe('CANCELLED');
    expect(data.resolvedAt).toBeInstanceOf(Date);
    expect(telegram.sendMessage.mock.calls[0][1]).toContain(
      '<b>Ana está bien.</b>',
    );
    expect(telegram.sendLocation).not.toHaveBeenCalled();
    expect(prisma.alertMessage.create.mock.calls[0][0].data.kind).toBe(
      'CANCELLED',
    );
    expect(result.status).toBe('CANCELLED');
  });

  it('una alerta que no existe o es de otra cuenta da 404', async () => {
    const { service, prisma } = montar();

    await expect(service.cancel(USUARIO, ALERTA_ID)).rejects.toThrow(
      new NotFoundException(MENSAJES_ALERTA.noExiste),
    );
    expect(prisma.emergencyAlert.updateMany).not.toHaveBeenCalled();
  });

  it('una alerta que ya no está activa da 409 sin avisar', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyAlert.findFirst.mockResolvedValue({
      id: ALERTA_ID,
      status: 'CANCELLED',
    });
    prisma.emergencyAlert.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.cancel(USUARIO, ALERTA_ID)).rejects.toThrow(
      new ConflictException(MENSAJES_ALERTA.noActiva),
    );
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });
});

describe('AlertsService.recordLocation (spec 008, CA-16, RN-11)', () => {
  const ULTIMO_AT = new Date('2026-10-22T21:10:00Z');
  const lejos = {
    latitude: 32.0471 + 300 / 111_195,
    longitude: -115.4614,
    recordedAt: '2026-10-22T21:13:00.000Z',
  };

  function conAlertaActiva(prisma: ReturnType<typeof montar>['prisma']) {
    prisma.$queryRaw.mockImplementation(async (q: Prisma.Sql) =>
      q.sql.includes('"lastForwardedAt" AS at')
        ? [{ id: ALERTA_ID, at: ULTIMO_AT, lat: 32.0471, lng: -115.4614 }]
        : [],
    );
  }

  it('con la alerta activa y a más de 200 m, reclama el reenvío y lo manda con el pin', async () => {
    const { service, prisma, sessions, telegram } = montar();
    conAlertaActiva(prisma);

    await service.recordLocation(USUARIO, CLIENT_ID, lejos);

    expect(sessions.recordLocation).toHaveBeenCalledWith(
      USUARIO,
      CLIENT_ID,
      lejos,
    );
    const reclamo = sqlDe(prisma.$executeRaw.mock.calls[0]);
    expect(reclamo.sql).toContain("status = 'ACTIVE'");
    expect(reclamo.sql).toContain('"lastForwardedAt" IS NOT DISTINCT FROM');
    expect(reclamo.values).toEqual(
      expect.arrayContaining([
        new Date(lejos.recordedAt),
        ALERTA_ID,
        ULTIMO_AT,
      ]),
    );
    expect(telegram.sendMessage.mock.calls[0][1]).toContain(
      'Ubicación actualizada de Ana, de las 14:13',
    );
    expect(telegram.sendLocation).toHaveBeenCalledWith(
      101n,
      lejos.latitude,
      lejos.longitude,
    );
    expect(prisma.alertMessage.create.mock.calls[0][0].data.kind).toBe(
      'LOCATION',
    );
  });

  it('cerca y antes de 15 min no reenvía', async () => {
    const { service, prisma, telegram } = montar();
    conAlertaActiva(prisma);

    await service.recordLocation(USUARIO, CLIENT_ID, {
      ...lejos,
      latitude: 32.0471 + 50 / 111_195,
    });

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('a los 15 min reenvía aunque no se haya movido', async () => {
    const { service, prisma, telegram } = montar();
    conAlertaActiva(prisma);

    await service.recordLocation(USUARIO, CLIENT_ID, {
      latitude: 32.0471,
      longitude: -115.4614,
      recordedAt: new Date(ULTIMO_AT.getTime() + REENVIO_CADA_MS).toISOString(),
    });

    expect(telegram.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('si otra petición ya reclamó el reenvío, no lo manda dos veces', async () => {
    const { service, prisma, telegram } = montar();
    conAlertaActiva(prisma);
    prisma.$executeRaw.mockResolvedValue(0);

    await service.recordLocation(USUARIO, CLIENT_ID, lejos);

    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('sin alerta activa (cancelada o sin alerta) no manda nada a los contactos (CA-25)', async () => {
    const { service, prisma, telegram } = montar();

    await service.recordLocation(USUARIO, CLIENT_ID, lejos);

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('una ubicación atrasada que no se guardó no se reenvía', async () => {
    const { service, prisma, sessions, telegram } = montar();
    conAlertaActiva(prisma);
    sessions.recordLocation.mockResolvedValue({
      sesion: sesion(),
      guardada: false,
    });

    await service.recordLocation(USUARIO, CLIENT_ID, lejos);

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });
});

describe('AlertsService.finish (spec 008, CA-22, CA-26)', () => {
  const FIN = '2026-10-22T22:00:00.000Z';

  it('con una alerta por hora de regreso, la resuelve y manda "terminó" (CA-22)', async () => {
    const { service, prisma, sessions, telegram } = montar();
    sessions.buscar.mockResolvedValue(sesion({ endedAt: new Date(FIN) }));
    prisma.emergencyAlert.findFirst.mockResolvedValue({ id: ALERTA_ID });

    const result = await service.finish(USUARIO, CLIENT_ID, { endedAt: FIN });

    expect(sessions.finish).toHaveBeenCalledWith(USUARIO, CLIENT_ID, {
      endedAt: FIN,
    });
    expect(prisma.emergencyAlert.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sessionId: SESION_ID,
          status: 'ACTIVE',
          reason: 'RETURN_TIME_EXCEEDED',
        },
      }),
    );
    expect(prisma.emergencyAlert.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: ALERTA_ID, status: 'ACTIVE' },
      data: { status: 'RESOLVED' },
    });
    expect(telegram.sendMessage.mock.calls[0][1]).toContain(
      'Ana terminó su actividad y está bien.',
    );
    expect(telegram.sendMessage.mock.calls[0][1]).toContain('a las 15:00');
    expect(prisma.alertMessage.create.mock.calls[0][0].data.kind).toBe(
      'FINISHED',
    );
    expect(result).toEqual({ clientId: CLIENT_ID });
  });

  it('sin alerta por hora de regreso (ninguna, o por inactividad o SOS) no resuelve nada (CA-26)', async () => {
    const { service, prisma, telegram } = montar();

    await service.finish(USUARIO, CLIENT_ID, { endedAt: FIN });

    expect(prisma.emergencyAlert.updateMany).not.toHaveBeenCalled();
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('si otra petición ya la resolvió, no avisa dos veces', async () => {
    const { service, prisma, sessions, telegram } = montar();
    sessions.buscar.mockResolvedValue(sesion({ endedAt: new Date(FIN) }));
    prisma.emergencyAlert.findFirst.mockResolvedValue({ id: ALERTA_ID });
    prisma.emergencyAlert.updateMany.mockResolvedValue({ count: 0 });

    await service.finish(USUARIO, CLIENT_ID, { endedAt: FIN });

    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });
});

describe('AlertsService.avisar con hora de regreso (spec 008, CA-18)', () => {
  it('manda "no ha confirmado su regreso" con la hora de regreso y el pin', async () => {
    const { service, prisma, telegram } = montar();
    prisma.emergencyAlert.findUniqueOrThrow.mockResolvedValue(
      alertaFila({ reason: 'RETURN_TIME_EXCEEDED', clientGeneratedId: null }),
    );

    await service.avisar(sesion() as never, ALERTA_ID);

    const html = telegram.sendMessage.mock.calls[0][1] as string;
    expect(html).toContain('no ha confirmado su regreso');
    expect(html).toContain('regresaría a las 13:30');
    expect(html).toContain('falta de señal');
    expect(telegram.sendLocation).toHaveBeenCalledTimes(2);
  });
});
