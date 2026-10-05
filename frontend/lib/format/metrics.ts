// Formato en pantalla de las métricas de actividad (spec 004, RN-1).
// Todas aceptan null (dato que no aplica o aún no calculado) y muestran "—".

const EMPTY = '—';

// Metros → "640 m" por debajo de 1 km, "3.42 km" desde 1 km.
export function formatDistance(meters: number | null) {
  if (meters === null) return EMPTY;
  const rounded = Math.round(meters);
  return rounded < 1000 ? `${rounded} m` : `${(meters / 1000).toFixed(2)} km`;
}

// Metros → "312 m".
export function formatElevation(meters: number | null) {
  if (meters === null) return EMPTY;
  return `${Math.round(meters)} m`;
}

// Segundos por kilómetro → "12:30 /km" (CA-5).
export function formatPace(secondsPerKm: number | null) {
  if (secondsPerKm === null) return EMPTY;
  const total = Math.round(secondsPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds} /km`;
}

// km/h → "18.4 km/h" (CA-5).
export function formatSpeed(kmPerHour: number | null) {
  if (kmPerHour === null) return EMPTY;
  return `${kmPerHour.toFixed(1)} km/h`;
}
