import { SMOOTHING_WINDOW } from './constants';

// Presión (hPa) → altitud (m) con la fórmula barométrica de la atmósfera estándar.
// La presión de referencia no importa porque solo se usan diferencias (plan D5).
export function pressureToAltitude(pressureHpa: number) {
  return 44330 * (1 - (pressureHpa / 1013.25) ** 0.1903);
}

type Direction = 'UP' | 'DOWN' | null;

// Elevación ganada y perdida acumuladas lectura a lectura, para usarse en vivo y al
// final (plan D2, D4).
// 1. Promedia cada altitud con las últimas SMOOTHING_WINDOW.
// 2. Histéresis hasta el extremo: alejarse `threshold` metros de la referencia confirma
//    una subida o bajada, y se recuerda su extremo. Regresar `threshold` metros desde
//    el extremo confirma la cumbre (o el valle): se suma extremo − referencia y el
//    extremo pasa a ser la referencia. Las oscilaciones menores al umbral nunca
//    confirman una dirección y no suman (CA-10, CA-11).
export function createElevationAccumulator(threshold: number) {
  const window: number[] = [];
  let reference: number | null = null;
  let extreme = 0;
  let direction: Direction = null;
  let gain = 0;
  let loss = 0;

  return {
    // Las altitudes null (punto GPS sin altitud) se ignoran.
    add(altitude: number | null) {
      if (altitude === null) return;
      window.push(altitude);
      if (window.length > SMOOTHING_WINDOW) window.shift();
      const a = window.reduce((sum, v) => sum + v, 0) / window.length;

      if (reference === null) {
        reference = a;
        return;
      }
      if (direction === null) {
        if (a - reference >= threshold) direction = 'UP';
        else if (reference - a >= threshold) direction = 'DOWN';
        extreme = a;
      } else if (direction === 'UP') {
        if (a > extreme) {
          extreme = a;
        } else if (extreme - a >= threshold) {
          gain += extreme - reference;
          reference = extreme;
          direction = 'DOWN';
          extreme = a;
        }
      } else if (a < extreme) {
        extreme = a;
      } else if (a - extreme >= threshold) {
        loss += reference - extreme;
        reference = extreme;
        direction = 'UP';
        extreme = a;
      }
    },
    // Incluyen la subida o bajada en curso hasta su extremo actual.
    get gain() {
      return direction === 'UP' && reference !== null ? gain + extreme - reference : gain;
    },
    get loss() {
      return direction === 'DOWN' && reference !== null ? loss + reference - extreme : loss;
    },
  };
}

// Elevación ganada y perdida en metros (positivas) de una lista de altitudes en orden.
export function computeElevation(altitudes: (number | null)[], threshold: number) {
  const acc = createElevationAccumulator(threshold);
  for (const a of altitudes) acc.add(a);
  return { gain: acc.gain, loss: acc.loss };
}
