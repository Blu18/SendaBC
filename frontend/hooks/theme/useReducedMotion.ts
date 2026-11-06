import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

// Opción de reducir animaciones del teléfono (spec 010, CA-27). El valor vive fuera de React para
// que las opciones de navegación, que no pueden usar hooks, lo lean con getReducedMotion().
let reducida = false;
const oyentes = new Set<() => void>();

function actualizar(valor: boolean) {
  if (valor === reducida) return;
  reducida = valor;
  oyentes.forEach((oyente) => oyente());
}

// Sin respuesta del sistema se queda en false: las animaciones son cortas y nada depende de ellas.
AccessibilityInfo.isReduceMotionEnabled().then(actualizar, () => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', actualizar);

export function getReducedMotion() {
  return reducida;
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function useReducedMotion() {
  return useSyncExternalStore(suscribir, getReducedMotion);
}
