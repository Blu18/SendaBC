import { AlertReason, MessageKind } from '@prisma/client';
import { aSafetyAlert, aSafetySession, MOTIVO_API } from './safety.types.js';

// Spec 008 (spec 011, CA-23): forma de las respuestas de seguridad.
const T = (iso: string) => new Date(iso);

function alerta(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alerta-1',
    reason: AlertReason.INACTIVITY_TIMEOUT,
    status: 'ACTIVE',
    triggeredAt: T('2026-11-06T16:00:00Z'),
    locationAt: T('2026-11-06T15:58:00Z'),
    messages: [
      {
        kind: MessageKind.ALERT,
        contactName: 'Mamá',
        status: 'SENT',
        createdAt: T('2026-11-06T16:00:01Z'),
      },
    ],
    ...overrides,
  } as never;
}

const sesion = {
  clientGeneratedId: 'c-1',
  type: 'HIKING' as const,
  startedAt: T('2026-11-06T15:00:00Z'),
  returnBy: null,
  endedAt: null,
  lastLocationAt: T('2026-11-06T15:58:00Z'),
};

describe('safety.types (spec 008)', () => {
  it('cada motivo de la base tiene su nombre de la API', () => {
    expect(MOTIVO_API).toEqual({
      INACTIVITY_TIMEOUT: 'INACTIVITY',
      MANUAL_SOS: 'SOS',
      RETURN_TIME_EXCEEDED: 'RETURN_TIME',
    });
  });

  it('aSafetyAlert usa fechas ISO y lista a quién se envió (CA-17)', () => {
    expect(aSafetyAlert(alerta())).toEqual({
      id: 'alerta-1',
      reason: 'INACTIVITY',
      status: 'ACTIVE',
      triggeredAt: '2026-11-06T16:00:00.000Z',
      locationAt: '2026-11-06T15:58:00.000Z',
      deliveries: [
        {
          contactName: 'Mamá',
          status: 'SENT',
          sentAt: '2026-11-06T16:00:01.000Z',
        },
      ],
    });
  });

  it('aSafetyAlert sin ubicación da null', () => {
    expect(aSafetyAlert(alerta({ locationAt: null })).locationAt).toBeNull();
  });

  it('aSafetySession incluye la alerta activa o null', () => {
    expect(aSafetySession(sesion, null)).toEqual({
      clientId: 'c-1',
      type: 'HIKING',
      startedAt: '2026-11-06T15:00:00.000Z',
      returnBy: null,
      endedAt: null,
      lastLocationAt: '2026-11-06T15:58:00.000Z',
      activeAlert: null,
    });
    expect(
      aSafetySession(
        { ...sesion, returnBy: T('2026-11-06T18:00:00Z') },
        alerta(),
      ),
    ).toMatchObject({
      returnBy: '2026-11-06T18:00:00.000Z',
      activeAlert: { id: 'alerta-1', reason: 'INACTIVITY' },
    });
  });
});
