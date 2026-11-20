import { transaccionExclusiva } from './espera';
import { getDb } from './sqlite';

// Lo que la pantalla de borrar la cuenta necesita saber del teléfono (spec 011, CA-46, CA-47).
export type EstadoLocalDeCuenta = {
  grabando: boolean; // hay una actividad de esta cuenta en RECORDING
  alertaActiva: boolean; // y su sesión tiene una alerta enviada o por enviar sin cancelar
  pendientes: number; // actividades sin subir (PENDING_SYNC), que se perderán
};

export async function getEstadoLocalDeCuenta(userId: string): Promise<EstadoLocalDeCuenta> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ grabando: number; alerta: number; pendientes: number }>(
    `SELECT
       (SELECT COUNT(*) FROM activities WHERE user_id = ? AND status = 'RECORDING') AS grabando,
       (SELECT COUNT(*) FROM safety_sessions s
          JOIN activities a ON a.local_id = s.activity_local_id
          WHERE s.user_id = ? AND a.status = 'RECORDING'
            AND s.alert_client_id IS NOT NULL AND s.alert_cancelled_at IS NULL) AS alerta,
       (SELECT COUNT(*) FROM activities WHERE user_id = ? AND status = 'PENDING_SYNC') AS pendientes`,
    [userId, userId, userId]
  );
  return {
    grabando: (fila?.grabando ?? 0) > 0,
    alertaActiva: (fila?.alerta ?? 0) > 0,
    pendientes: fila?.pendientes ?? 0,
  };
}

// Borra de este teléfono todo lo de la cuenta, en una transacción (CA-46; plan, "Cuenta"):
// actividades (con sus puntos, lecturas del barómetro, sesión de seguridad y detector, en
// cascada), la bandeja de salida, la copia de los contactos, los ajustes y lo guardado de rutas.
// Lo de otras cuentas del mismo teléfono no se toca. Después hay que cerrar la sesión.
export async function deleteLocalAccount(userId: string) {
  const db = await getDb();
  await transaccionExclusiva(db, async (tx) => {
    await tx.runAsync(`DELETE FROM activities WHERE user_id = ?`, [userId]);
    await tx.runAsync(`DELETE FROM safety_sessions WHERE user_id = ?`, [userId]);
    await tx.runAsync(`DELETE FROM safety_outbox WHERE user_id = ?`, [userId]);
    await tx.runAsync(`DELETE FROM emergency_contacts_cache WHERE user_id = ?`, [userId]);
    await tx.runAsync(`DELETE FROM app_settings WHERE user_id = ?`, [userId]);
    await tx.runAsync(`DELETE FROM route_cache WHERE user_id = ?`, [userId]);
  });
}
