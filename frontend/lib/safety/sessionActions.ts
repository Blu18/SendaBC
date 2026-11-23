import type { Activity } from '../db/activities';
import type { LocalSafetySession } from '../db/safety';
import type { SafetyAlert } from './api';
import type { OutboxEntry } from './outbox';
import { debeGuardarse } from '../metrics/validPoints';
import { aSesion, type EleccionUmbrales } from './thresholds';
import { hayAlertaActiva } from './recording';
import { validarRegreso } from './returnTime';

// Sesión de seguridad de la actividad en curso (spec 008, plan D1): se crea al iniciar con el
// mismo clientGeneratedId de la actividad, guarda la hora de regreso y se termina al detener.
// Todo pasa por la bandeja: funciona sin conexión y se envía en cuanto la hay (CA-23). Sin
// dependencias de React Native.

export type SessionActionsDeps = {
  getActivity(localId: number): Promise<Pick<Activity, 'clientGeneratedId' | 'type' | 'startedAt' | 'endedAt'> | null>;
  createSafetySession(
    localId: number,
    clientId: string,
    userId: string,
    returnBy: string | null,
    umbrales: { quietMs: number; responseMs: number }
  ): Promise<void>;
  // Umbrales de inactividad elegidos por la cuenta (spec 011, CA-50).
  getEleccionUmbrales(userId: string): Promise<EleccionUmbrales>;
  getSafetySession(localId: number): Promise<LocalSafetySession | null>;
  setReturnBy(clientId: string, returnBy: string | null): Promise<void>;
  // Actividades en RECORDING que tienen sesión de seguridad (para cerrar las huérfanas).
  listRecordingSessionIds(): Promise<number[]>;
  // Para descartar las huérfanas con menos de 3 puntos válidos (spec 012, CA-22).
  countValidPoints(localId: number): Promise<number>;
  discardActivity(localId: number): Promise<boolean>;
  setAlert(clientId: string, clientAlertId: string, triggeredAt: string): Promise<void>;
  markAlertSent(clientAlertId: string, serverId: string): Promise<void>;
  enqueueOutbox(userId: string, entry: OutboxEntry): Promise<number>;
  requestSend(): void;
};

export type ResultadoRegreso =
  | { kind: 'guardada' }
  | { kind: 'invalida'; error: string }
  | { kind: 'sin-sesion' };

// La alerta activa que reporta el servidor y que la app no conoce: la creó el servidor por la hora
// de regreso (CA-18). No se adopta si hay una alerta local activa (al enviarse, el servidor la
// junta con la suya, CA-27) ni si es la que el usuario ya canceló y la cancelación sigue en la
// bandeja.
export function debeAdoptarAlerta(
  local: Pick<LocalSafetySession, 'alertClientId' | 'alertServerId' | 'alertCancelledAt'>,
  remota: Pick<SafetyAlert, 'id'> | null
): boolean {
  if (!remota) return false;
  if (hayAlertaActiva(local)) return false;
  return local.alertServerId !== remota.id;
}

export function createSessionActions(deps: SessionActionsDeps) {
  // Al iniciar con contactos activos (CA-8). Una hora de regreso que ya no es válida (p. ej. se
  // eligió y se tardó en iniciar) se descarta: el servidor rechazaría la sesión completa.
  async function iniciar(localId: number, userId: string, regreso: number | null, ahora = Date.now()) {
    const actividad = await deps.getActivity(localId);
    if (!actividad) return false;
    const inicio = new Date(actividad.startedAt).getTime();
    const valida = regreso !== null && validarRegreso(regreso, inicio, ahora) === null;
    const returnBy = valida ? new Date(regreso).toISOString() : null;

    // Los umbrales elegidos se copian a la sesión: cambiarlos después no afecta a esta actividad
    // (spec 011, CA-51).
    const umbrales = aSesion(await deps.getEleccionUmbrales(userId));
    await deps.createSafetySession(localId, actividad.clientGeneratedId, userId, returnBy, umbrales);
    await deps.enqueueOutbox(userId, {
      kind: 'session',
      clientId: actividad.clientGeneratedId,
      payload: { type: actividad.type, startedAt: actividad.startedAt, returnBy },
    });
    deps.requestSend();
    return true;
  }

  // Cambiar o quitar la hora de regreso durante la actividad (CA-19, CA-23). Queda pendiente de
  // enviar hasta que el servidor la reciba.
  async function cambiarRegreso(
    localId: number,
    regreso: number | null,
    ahora = Date.now()
  ): Promise<ResultadoRegreso> {
    const [sesion, actividad] = await Promise.all([
      deps.getSafetySession(localId),
      deps.getActivity(localId),
    ]);
    if (!sesion || !actividad) return { kind: 'sin-sesion' };

    if (regreso !== null) {
      const error = validarRegreso(regreso, new Date(actividad.startedAt).getTime(), ahora);
      if (error) return { kind: 'invalida', error };
    }
    const returnBy = regreso === null ? null : new Date(regreso).toISOString();
    await deps.setReturnBy(sesion.clientGeneratedId, returnBy);
    await deps.enqueueOutbox(sesion.userId, {
      kind: 'session',
      clientId: sesion.clientGeneratedId,
      payload: { type: actividad.type, startedAt: actividad.startedAt, returnBy },
    });
    deps.requestSend();
    return { kind: 'guardada' };
  }

  // Al terminar la actividad: el servidor deja de esperar la hora de regreso (CA-19) y, si ya
  // había avisado por ella, manda "ya terminó" (CA-22). Sin sesión no hay nada que avisar.
  async function terminar(localId: number, endedAt: string) {
    const sesion = await deps.getSafetySession(localId);
    if (!sesion) return false;
    await deps.enqueueOutbox(sesion.userId, {
      kind: 'finish',
      clientId: sesion.clientGeneratedId,
      payload: { endedAt },
    });
    deps.requestSend();
    return true;
  }

  // Al abrir la app se cierran las actividades que quedaron grabando (spec 003, CA-10). Sus
  // sesiones también se terminan, con la misma hora de fin, para que el servidor no avise por la
  // hora de regreso de una actividad que ya no sigue.
  //
  // Después, sin aviso, descarta las que cerró con menos de 3 puntos válidos (spec 012, CA-22,
  // CA-24). Siempre en este orden: cerrar, encolar el fin de la sesión y luego borrar, porque
  // borrar la actividad borra su sesión y sin el fin encolado el servidor avisaría a los contactos
  // (CA-23, plan D3). Si el fin no se pudo encolar, esa actividad no se borra. Un error no detiene
  // a las demás: se lanza el primero al final.
  async function cerrarHuerfanas(cerrarActividades: () => Promise<number[]>) {
    const conSesion = await deps.listRecordingSessionIds();
    const cerradas = await cerrarActividades();
    let error: unknown = null;

    for (const id of new Set([...conSesion, ...cerradas])) {
      try {
        if (conSesion.includes(id)) {
          const actividad = await deps.getActivity(id);
          if (actividad?.endedAt) await terminar(id, actividad.endedAt);
        }
        if (cerradas.includes(id) && !debeGuardarse(await deps.countValidPoints(id))) {
          await deps.discardActivity(id);
        }
      } catch (e) {
        error ??= e;
      }
    }

    if (error) throw error;
  }

  // Guarda en el teléfono la alerta que creó el servidor, para verla y cancelarla como las demás
  // (CA-17, CA-25, CA-26). Su id del servidor hace también de id local: la cancelación se encola
  // por ese id y la bandeja encuentra la alerta ya enviada.
  async function adoptarAlerta(
    localId: number,
    remota: Pick<SafetyAlert, 'id' | 'triggeredAt'> | null
  ) {
    const sesion = await deps.getSafetySession(localId);
    if (!sesion || !debeAdoptarAlerta(sesion, remota)) return false;
    await deps.setAlert(sesion.clientGeneratedId, remota!.id, remota!.triggeredAt);
    await deps.markAlertSent(remota!.id, remota!.id);
    return true;
  }

  return { iniciar, cambiarRegreso, terminar, cerrarHuerfanas, adoptarAlerta };
}

export type SessionActions = ReturnType<typeof createSessionActions>;
