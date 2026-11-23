// Lo que pasa después de cerrar una actividad en SQLite (finishActivity): guardarla o descartarla
// por la regla de los 3 puntos válidos (spec 012, RN-2 a RN-4). Sin React Native, para probarlo
// con Vitest (constitución 6.1). activityTracker.hook.ts lo usa al detener y al salir.
import { debeGuardarse } from '../metrics/validPoints';

export type DepsCierre = {
  // Encola el fin de la sesión de seguridad (sessionActions.terminar).
  terminar: (localId: number, endedAt: string) => Promise<unknown>;
  contarValidos: (localId: number) => Promise<number>; // countValidPoints de lib/db
  descartar: (localId: number) => Promise<boolean>; // discardActivity de lib/db
  finalizar: (localId: number) => Promise<unknown>; // finalizeMetrics
  sincronizar: () => void; // syncEngine.requestSync, sin esperar
  registrar?: (mensaje: string, e: unknown) => void;
};

// 'descartar': el usuario eligió "Terminar sin guardar" (CA-18).
// 'guardar': "Detener" con 3 puntos válidos o más; no hubo pregunta (CA-20).
// 'contar': salir de la pantalla o fallo al iniciar; decide la cuenta de puntos válidos (CA-21).
export type DecisionCierre = 'descartar' | 'guardar' | 'contar';

export type ResultadoCierre = 'guardada' | 'descartada';

// 1. Termina la sesión de seguridad. Va primero porque descartar la borra en cascada, y sin el
//    aviso de fin en la bandeja el servidor avisaría a los contactos por la hora de regreso
//    (CA-23, plan D3).
// 2. Descarta la actividad, o calcula sus métricas y pide subirla, como hasta la spec 011.
//
// Si la sesión no se pudo terminar, la actividad no se descarta: se guarda como siempre y el
// servidor la rechazará al subirla (CA-26). Es preferible a que los contactos reciban un aviso
// falso. Un fallo de las métricas no impide subirla: computeMissingMetrics las calcula al abrir
// la app (spec 004, CA-19).
export async function guardarODescartar(
  localId: number,
  endedAt: string,
  decision: DecisionCierre,
  deps: DepsCierre
): Promise<ResultadoCierre> {
  const registrar = deps.registrar ?? (() => {});

  let sesionTerminada = true;
  try {
    await deps.terminar(localId, endedAt);
  } catch (e) {
    sesionTerminada = false;
    registrar('Error terminando la sesión de seguridad:', e);
  }

  try {
    const descartar =
      decision === 'descartar' ||
      (decision === 'contar' && !debeGuardarse(await deps.contarValidos(localId)));
    if (descartar && sesionTerminada && (await deps.descartar(localId))) return 'descartada';
  } catch (e) {
    // Un fallo de SQLite al contar o borrar no pierde la actividad: se guarda (RN-4).
    registrar('Error descartando la actividad:', e);
  }

  try {
    await deps.finalizar(localId);
  } catch (e) {
    registrar('Error calculando métricas al cerrar:', e);
  }
  deps.sincronizar();
  return 'guardada';
}
