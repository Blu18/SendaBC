// Umbrales de cálculo de métricas (spec 004).

// Los puntos con precisión horizontal peor que esto no cuentan para la distancia (CA-8).
export const MAX_ACCURACY_M = 20;

// Un punto que implica más velocidad que esto respecto al anterior es un salto de
// ubicación (p. ej. una ubicación guardada de otro lugar): reinicia el ancla sin sumar
// (CA-25). Bici en bajada ronda 15–25 m/s.
export const MAX_SPEED_MS = 50;

// Distancia y elevación promedian cada lectura con las anteriores hasta esta cantidad
// para quitar el ruido del sensor (plan D3, D4).
export const SMOOTHING_WINDOW = 5;

// Distancia: solo se suma al alejarse del ancla más que las precisiones de ambos
// puntos, y al menos esto (CA-9, plan D3).
export const MIN_STEP_M = 5;

// Variaciones de altitud menores a estos umbrales se consideran ruido (CA-11).
export const BARO_NOISE_M = 3;
export const GPS_NOISE_M = 10;
