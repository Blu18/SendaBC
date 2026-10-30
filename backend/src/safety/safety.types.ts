import {
  AlertReason,
  MessageKind,
  Prisma,
  type ActivityType,
  type AlertStatus,
  type MessageStatus,
} from '@prisma/client';

// Respuestas de los endpoints de seguridad (spec 008, plan "Sesiones de seguridad y alertas").

export type AlertReasonApi = 'INACTIVITY' | 'SOS' | 'RETURN_TIME';

export const MOTIVO_API: Record<AlertReason, AlertReasonApi> = {
  [AlertReason.INACTIVITY_TIMEOUT]: 'INACTIVITY',
  [AlertReason.MANUAL_SOS]: 'SOS',
  [AlertReason.RETURN_TIME_EXCEEDED]: 'RETURN_TIME',
};

export type SafetyAlert = {
  id: string;
  reason: AlertReasonApi;
  status: AlertStatus;
  triggeredAt: string;
  locationAt: string | null;
  // A quiénes se envió la alerta (CA-17).
  deliveries: { contactName: string; status: MessageStatus; sentAt: string }[];
};

export type SafetySession = {
  clientId: string;
  type: ActivityType;
  startedAt: string;
  returnBy: string | null;
  endedAt: string | null;
  lastLocationAt: string | null;
  activeAlert: SafetyAlert | null;
};

// Lo que hay que leer de una alerta para responder: solo los envíos del mensaje de alerta,
// no los de ubicación ni de cancelación.
export const ALERTA_CON_ENTREGAS = {
  include: {
    messages: {
      where: { kind: MessageKind.ALERT },
      orderBy: { createdAt: 'asc' },
    },
  },
} satisfies Prisma.EmergencyAlertDefaultArgs;

type AlertaConEntregas = Prisma.EmergencyAlertGetPayload<
  typeof ALERTA_CON_ENTREGAS
>;

export function aSafetyAlert(alerta: AlertaConEntregas): SafetyAlert {
  return {
    id: alerta.id,
    reason: MOTIVO_API[alerta.reason],
    status: alerta.status,
    triggeredAt: alerta.triggeredAt.toISOString(),
    locationAt: alerta.locationAt?.toISOString() ?? null,
    deliveries: alerta.messages.map((m) => ({
      contactName: m.contactName,
      status: m.status,
      sentAt: m.createdAt.toISOString(),
    })),
  };
}

type SesionFila = {
  clientGeneratedId: string;
  type: ActivityType;
  startedAt: Date;
  returnBy: Date | null;
  endedAt: Date | null;
  lastLocationAt: Date | null;
};

export function aSafetySession(
  sesion: SesionFila,
  alertaActiva: AlertaConEntregas | null,
): SafetySession {
  return {
    clientId: sesion.clientGeneratedId,
    type: sesion.type,
    startedAt: sesion.startedAt.toISOString(),
    returnBy: sesion.returnBy?.toISOString() ?? null,
    endedAt: sesion.endedAt?.toISOString() ?? null,
    lastLocationAt: sesion.lastLocationAt?.toISOString() ?? null,
    activeAlert: alertaActiva ? aSafetyAlert(alertaActiva) : null,
  };
}
