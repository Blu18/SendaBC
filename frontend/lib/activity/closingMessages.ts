// Textos de las preguntas al terminar una actividad (spec 003, CA-15; spec 012, CA-17, CA-21,
// RN-6). Sin React Native, para probarlos con Vitest (constitución 6.1).
import { debeGuardarse } from '../metrics/validPoints';

export const CLOSING_MESSAGES = {
  seguirGrabando: 'Seguir grabando',
  // "Detener" con menos de 3 puntos válidos (CA-17).
  sinGuardarTitulo: '¿Terminar sin guardar?',
  sinGuardarCuerpo: 'La actividad tiene muy poco recorrido y no se guardará.',
  terminarSinGuardar: 'Terminar sin guardar',
  // Salir de la pantalla grabando (spec 003, CA-15; spec 012, CA-21).
  salirTitulo: '¿Terminar la actividad?',
  salirCuerpo: 'Si sales, la grabación termina y no se puede reanudar. Lo grabado queda guardado.',
  salirSinGuardarCuerpo:
    'Si sales, la grabación termina. La actividad tiene muy poco recorrido y no se guardará.',
  terminar: 'Terminar',
} as const;

export type PreguntaSalir = { titulo: string; cuerpo: string; terminar: string };

// Pregunta al salir de la pantalla grabando, según los puntos válidos que lleva. Con menos de 3,
// avisa que la actividad no se guardará (CA-21).
export function preguntaAlSalir(puntosValidos: number): PreguntaSalir {
  if (debeGuardarse(puntosValidos)) {
    return {
      titulo: CLOSING_MESSAGES.salirTitulo,
      cuerpo: CLOSING_MESSAGES.salirCuerpo,
      terminar: CLOSING_MESSAGES.terminar,
    };
  }
  return {
    titulo: CLOSING_MESSAGES.salirTitulo,
    cuerpo: CLOSING_MESSAGES.salirSinGuardarCuerpo,
    terminar: CLOSING_MESSAGES.terminarSinGuardar,
  };
}
