// Hora de regreso (spec 008, RN-10, plan D9). Opcional, posterior al inicio; el servidor avisa
// cuando pasa esa hora más 30 minutos.

export const MARGEN_REGRESO_MS = 30 * 60_000;
export const PASO_MS = 15 * 60_000;
// Ni muy pronto (en menos de 15 min el aviso llegaría casi al salir) ni más de 12 h.
export const MIN_REGRESO_MS = PASO_MS;
export const MAX_REGRESO_MS = 12 * 60 * 60_000;

// Botones de duración de ReturnTimePicker (D9).
export const DURACIONES_HORAS = [1, 2, 3, 4, 6, 8] as const;

export const RETURN_TIME_MESSAGES = {
  antesDelInicio: 'La hora de regreso debe ser posterior al inicio.',
  yaPaso: 'La hora de regreso ya pasó. Elige una más tarde.',
  muyLejos: 'La hora de regreso puede ser como máximo dentro de 12 horas.',
} as const;

// "Dentro de N horas", redondeado al minuto siguiente para no mostrar segundos.
export function regresoDentroDe(horas: number, ahora: number): number {
  return redondearAlMinuto(ahora + horas * 60 * 60_000);
}

// Botones de ±15 min: no baja de ahora + 15 min ni pasa de ahora + 12 h.
export function ajustarRegreso(regreso: number, pasos: number, ahora: number): number {
  const deseado = regreso + pasos * PASO_MS;
  const min = redondearAlMinuto(ahora + MIN_REGRESO_MS);
  const max = ahora + MAX_REGRESO_MS;
  return Math.min(Math.max(deseado, min), max);
}

// Error en español, o null si es válida. `inicio` es el de la actividad (RN-10).
export function validarRegreso(regreso: number, inicio: number, ahora: number): string | null {
  if (regreso <= inicio) return RETURN_TIME_MESSAGES.antesDelInicio;
  if (regreso <= ahora) return RETURN_TIME_MESSAGES.yaPaso;
  if (regreso > ahora + MAX_REGRESO_MS) return RETURN_TIME_MESSAGES.muyLejos;
  return null;
}

// Cuándo avisaría el servidor si la actividad no termina: hora de regreso + 30 min (RN-10).
export function horaDeAviso(regreso: number): number {
  return regreso + MARGEN_REGRESO_MS;
}

// "14:05" en la hora del teléfono. `timeZone` solo para las pruebas.
export function formatoHora(ms: number, timeZone?: string): string {
  return new Date(ms).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  });
}

// "Si no regresas, avisaríamos a las 14:35" (CA-8, CA-21).
export function textoAviso(regreso: number, timeZone?: string): string {
  return `Si no terminas la actividad, avisaríamos a tus contactos a las ${formatoHora(horaDeAviso(regreso), timeZone)}.`;
}

function redondearAlMinuto(ms: number): number {
  return Math.ceil(ms / 60_000) * 60_000;
}
