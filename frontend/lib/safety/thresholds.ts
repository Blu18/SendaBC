import { UMBRALES, type Umbrales } from './inactivity';

// Umbrales de inactividad que elige el usuario (spec 011, HU-11, CA-50 a CA-52, RN-9). Puro: la
// elección se guarda en app_settings (lib/db) y se copia a la sesión al iniciar (T24).

// RN-9: tiempo sin moverse y cuenta regresiva, en minutos. La distancia de 30 m no cambia.
export const OPCIONES_QUIETO_MIN = [5, 10, 15, 20, 30] as const;
export const OPCIONES_RESPUESTA_MIN = [1, 2, 3, 5] as const;

export type EleccionUmbrales = { quietoMin: number; respuestaMin: number };

// Los valores por defecto siguen siendo los de spec 008, RN-4: 10 y 2.
export const ELECCION_POR_DEFECTO: EleccionUmbrales = {
  quietoMin: UMBRALES.quietoMs / 60_000,
  respuestaMin: UMBRALES.respuestaMs / 60_000,
};

// Clave en app_settings.
export const CLAVE_UMBRALES = 'umbrales_inactividad';

const valida = (opciones: readonly number[], valor: unknown, defecto: number) =>
  typeof valor === 'number' && opciones.includes(valor) ? valor : defecto;

// Lectura segura de lo guardado (CA-52): sin nada guardado, con JSON dañado o con un valor que no
// está entre las opciones, ese campo usa el valor por defecto.
export function leerEleccion(guardado: string | null | undefined): EleccionUmbrales {
  if (!guardado) return ELECCION_POR_DEFECTO;
  let datos: unknown;
  try {
    datos = JSON.parse(guardado);
  } catch {
    return ELECCION_POR_DEFECTO;
  }
  const { quietoMin, respuestaMin } = (datos ?? {}) as Partial<Record<keyof EleccionUmbrales, unknown>>;
  return {
    quietoMin: valida(OPCIONES_QUIETO_MIN, quietoMin, ELECCION_POR_DEFECTO.quietoMin),
    respuestaMin: valida(OPCIONES_RESPUESTA_MIN, respuestaMin, ELECCION_POR_DEFECTO.respuestaMin),
  };
}

export function guardarEleccion(eleccion: EleccionUmbrales): string {
  return JSON.stringify(leerEleccion(JSON.stringify(eleccion)));
}

// Lo que se copia a safety_sessions al iniciar la actividad (CA-51).
export function aSesion(eleccion: EleccionUmbrales): { quietMs: number; responseMs: number } {
  return { quietMs: eleccion.quietoMin * 60_000, responseMs: eleccion.respuestaMin * 60_000 };
}

// Umbrales con los que corre una actividad (CA-51, CA-52). `base` son los umbrales de la app:
// los de RN-4 o, en desarrollo, los cortos de EXPO_PUBLIC_SAFETY_DEBUG_MINUTES, que siguen
// mandando para los casos manuales (plan). Una sesión de antes de v6, o sin valores, usa la base.
export function umbralesDeSesion(
  sesion: { quietMs: number | null; responseMs: number | null } | null,
  base: Umbrales
): Umbrales {
  const depuracion = base.quietoMs !== UMBRALES.quietoMs || base.respuestaMs !== UMBRALES.respuestaMs;
  if (depuracion || !sesion) return base;
  return {
    ...base,
    quietoMs: positivo(sesion.quietMs) ?? base.quietoMs,
    respuestaMs: positivo(sesion.responseMs) ?? base.respuestaMs,
  };
}

const positivo = (ms: number | null) => (typeof ms === 'number' && ms > 0 ? ms : null);
