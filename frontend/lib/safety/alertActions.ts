import type { ActivityPointInput } from '../db/activities';
import type { LocalSafetySession } from '../db/safety';
import type { EstadoDetector } from './inactivity';
import type { AlertPayload, OutboxEntry } from './outbox';
import { hayAlertaActiva } from './recording';

// Crear y cancelar la alerta de la actividad en curso (spec 008). La crea el detector a los 12 min
// sin respuesta (CA-14) y, en T18, el SOS (CA-24). Funciona sin conexión: se guarda en SQLite y la
// bandeja la envía en cuanto hay red (CA-15). Sin dependencias de React Native.

export type AlertActionsDeps = {
  getSafetySession(localId: number): Promise<LocalSafetySession | null>;
  getLastPoint(localId: number): Promise<ActivityPointInput | null>;
  setAlert(clientId: string, clientAlertId: string, triggeredAt: string): Promise<void>;
  markAlertCancelled(clientId: string, at?: string): Promise<void>;
  enqueueOutbox(userId: string, entry: OutboxEntry): Promise<number>;
  requestSend(): void;
  reiniciarDetector(localId: number, ahora?: number): Promise<EstadoDetector | null>;
  randomUUID(): string;
};

export type ResultadoCrear =
  | { kind: 'creada'; clientAlertId: string }
  // Ya había una activa: no se crea otra ni se vuelve a avisar (CA-27, RN-8).
  | { kind: 'ya-activa'; clientAlertId: string }
  // La actividad no tiene sesión de seguridad (p. ej. se inició antes de T18): no hay a quién avisar.
  | { kind: 'sin-sesion' };

export type ResultadoCancelar = 'cancelada' | 'sin-alerta';

export function createAlertActions(deps: AlertActionsDeps) {
  async function crear(
    localId: number,
    reason: AlertPayload['reason'],
    ahora = Date.now()
  ): Promise<ResultadoCrear> {
    const sesion = await deps.getSafetySession(localId);
    if (!sesion) return { kind: 'sin-sesion' };
    if (hayAlertaActiva(sesion)) return { kind: 'ya-activa', clientAlertId: sesion.alertClientId! };

    // Última ubicación conocida y la hora en que se registró (RN-5). Sin puntos todavía, la
    // alerta sale sin ubicación (plan, T7).
    const punto = await deps.getLastPoint(localId);
    const clientAlertId = deps.randomUUID();
    const triggeredAt = new Date(ahora).toISOString();
    await deps.setAlert(sesion.clientGeneratedId, clientAlertId, triggeredAt);
    await deps.enqueueOutbox(sesion.userId, {
      kind: 'alert',
      clientId: sesion.clientGeneratedId,
      payload: {
        clientAlertId,
        reason,
        triggeredAt,
        latitude: punto?.latitude ?? null,
        longitude: punto?.longitude ?? null,
        locationAt: punto?.recordedAt ?? null,
      },
    });
    deps.requestSend();
    return { kind: 'creada', clientAlertId };
  }

  // Cancelar (CA-25): los contactos reciben que el usuario está bien y la detección vuelve a
  // empezar, para que más adelante pueda generarse otra alerta (RN-8).
  async function cancelar(localId: number, ahora = Date.now()): Promise<ResultadoCancelar> {
    const sesion = await deps.getSafetySession(localId);
    if (!sesion || !hayAlertaActiva(sesion)) return 'sin-alerta';

    await deps.markAlertCancelled(sesion.clientGeneratedId, new Date(ahora).toISOString());
    await deps.enqueueOutbox(sesion.userId, {
      kind: 'cancel',
      clientId: sesion.clientGeneratedId,
      payload: { clientAlertId: sesion.alertClientId! },
    });
    deps.requestSend();
    await deps.reiniciarDetector(localId, ahora);
    return 'cancelada';
  }

  return { crear, cancelar };
}

export type AlertActions = ReturnType<typeof createAlertActions>;
