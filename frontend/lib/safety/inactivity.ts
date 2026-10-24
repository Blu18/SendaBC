import { haversineMeters } from '../metrics/geo';

// Detector de inactividad (spec 008, RN-4, plan D5 y D8). Puro: recibe el estado, el punto GPS
// (o null si solo pasó el tiempo) y la hora, y devuelve el estado nuevo y qué hacer. La tarea de
// ubicación lo llama cada ~10 s, con la pantalla bloqueada o no, y guarda el estado en SQLite.

export type Umbrales = {
  // Alejarse más que esto de un punto cuenta como moverse.
  radioM: number;
  // Tiempo sin moverse antes de preguntar "¿Estás bien?".
  quietoMs: number;
  // Cuenta regresiva de la pregunta antes de alertar.
  respuestaMs: number;
  // Peor precisión con la que un punto puede mover el ancla (D8).
  precisionM: number;
  // Cada cuánto, como mucho, se reprograma la notificación (plan, T17).
  reprogramarMs: number;
};

// RN-4: 30 m durante 10 minutos, y 2 minutos de cuenta regresiva.
export const UMBRALES: Umbrales = {
  radioM: 30,
  quietoMs: 10 * 60_000,
  respuestaMs: 2 * 60_000,
  precisionM: 30,
  reprogramarMs: 60_000,
};

export type PuntoDetector = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type FaseDetector =
  | 'vigilando' // se mide el tiempo sin moverse
  | 'preguntando' // se mostró "¿Estás bien?" y corre la cuenta regresiva
  | 'alertada' // se generó la alerta; no se vuelve a preguntar hasta reiniciar
  | 'detenida'; // la actividad terminó: no se vigila nada (CA-13)

export type EstadoDetector = {
  fase: FaseDetector;
  // Punto de referencia: el último desde el que la persona se alejó más de radioM.
  ancla: { latitude: number; longitude: number } | null;
  // Desde cuándo no se ha movido (ms). Empieza al iniciar la actividad.
  quietoDesde: number;
  // Cuándo se preguntó (ms); la cuenta regresiva empieza ahí.
  preguntaDesde: number | null;
  // Para cuándo está programada la notificación de respaldo, y cuándo se programó (ms).
  programadaPara: number | null;
  programadaEn: number | null;
};

export type AccionDetector =
  | 'nada'
  // Programar (o reprogramar) la notificación "¿Estás bien?" para estado.programadaPara.
  | 'programar-pregunta'
  // Mostrar ya la pregunta: modal con la app abierta, notificación con la pantalla bloqueada.
  | 'preguntar'
  // Terminó la cuenta regresiva sin respuesta: generar la alerta (CA-14).
  | 'alertar';

export type Evaluacion = { estado: EstadoDetector; accion: AccionDetector };

export function iniciarDetector(ahora: number): EstadoDetector {
  return {
    fase: 'vigilando',
    ancla: null,
    quietoDesde: ahora,
    preguntaDesde: null,
    programadaPara: null,
    programadaEn: null,
  };
}

export function evaluar(
  estado: EstadoDetector,
  punto: PuntoDetector | null,
  ahora: number,
  umbrales: Umbrales = UMBRALES
): Evaluacion {
  // Fuera de una actividad en curso no se vigila nada (CA-13).
  if (estado.fase === 'detenida') return { estado, accion: 'nada' };

  let siguiente = moverAncla(estado, punto, ahora, umbrales);

  if (siguiente.fase === 'vigilando') {
    if (ahora - siguiente.quietoDesde >= umbrales.quietoMs) {
      // La cuenta regresiva empieza al preguntar, no a los 10 min exactos: si la tarea llega
      // tarde o la notificación programada se retrasa, la persona igual tiene sus 2 minutos.
      siguiente = { ...siguiente, fase: 'preguntando', preguntaDesde: ahora };
      return { estado: siguiente, accion: 'preguntar' };
    }
    return programarSiToca(siguiente, ahora, umbrales);
  }

  if (siguiente.fase === 'preguntando' && ahora - siguiente.preguntaDesde! >= umbrales.respuestaMs) {
    return { estado: { ...siguiente, fase: 'alertada' }, accion: 'alertar' };
  }
  return { estado: siguiente, accion: 'nada' };
}

// "Estoy bien" (CA-12), o cancelar la alerta: la detección vuelve a empezar desde ahora.
export function reiniciar(estado: EstadoDetector, ahora: number): EstadoDetector {
  if (estado.fase === 'detenida') return estado;
  return {
    ...estado,
    fase: 'vigilando',
    quietoDesde: ahora,
    preguntaDesde: null,
    programadaPara: null,
    programadaEn: null,
  };
}

// Al terminar la actividad (CA-13).
export function detener(estado: EstadoDetector): EstadoDetector {
  return { ...estado, fase: 'detenida', preguntaDesde: null, programadaPara: null };
}

// Segundos que le quedan a la cuenta regresiva (para el modal). null si no se está preguntando.
export function restanteMs(estado: EstadoDetector, ahora: number, umbrales: Umbrales = UMBRALES) {
  if (estado.fase !== 'preguntando' || estado.preguntaDesde === null) return null;
  return Math.max(0, estado.preguntaDesde + umbrales.respuestaMs - ahora);
}

// El ancla solo se mueve con un punto preciso (D8: con mala señal, el ruido del GPS puede pasar
// de 30 m; es más seguro preguntar de más) y que se alejó más de radioM. Moverse reinicia el
// tiempo y, si se estaba preguntando, cuenta como respuesta: ya no está inactiva (RN-4).
// Con la alerta ya generada no cambia de fase: la ubicación sigue yendo a los contactos (CA-16).
function moverAncla(
  estado: EstadoDetector,
  punto: PuntoDetector | null,
  ahora: number,
  umbrales: Umbrales
): EstadoDetector {
  if (!punto || punto.accuracy === null || punto.accuracy > umbrales.precisionM) return estado;
  const posicion = { latitude: punto.latitude, longitude: punto.longitude };
  // El primer punto preciso fija el ancla sin contar como movimiento.
  if (!estado.ancla) return { ...estado, ancla: posicion };
  if (haversineMeters(estado.ancla, posicion) <= umbrales.radioM) return estado;
  if (estado.fase === 'alertada') return { ...estado, ancla: posicion };
  return { ...estado, ancla: posicion, fase: 'vigilando', quietoDesde: ahora, preguntaDesde: null };
}

// La notificación de respaldo suena a quietoDesde + quietoMs aunque la app esté suspendida
// (plan D5). Se reprograma cuando el ancla se movió, como mucho una vez por minuto.
function programarSiToca(estado: EstadoDetector, ahora: number, umbrales: Umbrales): Evaluacion {
  const para = estado.quietoDesde + umbrales.quietoMs;
  const cambio = estado.programadaPara !== para;
  const puede = estado.programadaEn === null || ahora - estado.programadaEn >= umbrales.reprogramarMs;
  if (!cambio || !puede) return { estado, accion: 'nada' };
  return {
    estado: { ...estado, programadaPara: para, programadaEn: ahora },
    accion: 'programar-pregunta',
  };
}
