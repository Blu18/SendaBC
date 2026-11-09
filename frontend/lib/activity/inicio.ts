// Inicio de una grabación que puede fallar a medias (spec 003, CA-16). Sin React Native, para
// probarlo con Vitest (constitución 6.1).

export type ResultadoInicio = { ok: true } | { ok: false; error: unknown };

// Corre `iniciar`. Si falla, corre `limpiar` para no dejar nada a medias (una actividad en
// RECORDING, el GPS o el barómetro escuchando) y devuelve el error original: un fallo de la
// limpieza no lo tapa.
export async function iniciarOLimpiar(
  iniciar: () => Promise<void>,
  limpiar: () => void | Promise<void>,
  registrar: (mensaje: string, e: unknown) => void = () => {}
): Promise<ResultadoInicio> {
  try {
    await iniciar();
    return { ok: true };
  } catch (error) {
    try {
      await limpiar();
    } catch (e) {
      registrar('Error limpiando un inicio fallido:', e);
    }
    return { ok: false, error };
  }
}

// Hora con la que se cierra una actividad que dejó de grabarse sin "Detener": la de su último
// punto o, si no tiene, su inicio (spec 003, CA-10). Sin actividad creada no hay nada que cerrar.
export function cierrePendiente(
  activityId: number | null,
  ultimoPunto: string | null,
  inicio: string | null
): { id: number; endedAt: string } | null {
  const endedAt = ultimoPunto ?? inicio;
  if (activityId == null || !endedAt) return null;
  return { id: activityId, endedAt };
}
