// "Buscar en esta zona" aparece cuando el centro del mapa se aleja de la última búsqueda (spec 006,
// CA-9). Ese centro llega con cada evento de reposo del mapa (onMapIdle).
//
// Al abrir Explorar en 3D, el reposo de la vista inicial (todo Baja California) llega unos
// milisegundos después de pedir el encuadre hacia el usuario. Mostraba el botón sin que el usuario
// moviera el mapa, hasta el reposo siguiente (spec 015, T18). Mientras la cámara se mueve no hay un
// reposo real, así que uno que llega durante la animación es de la vista anterior y se ignora.

// Margen para el caso sin animación (movimiento reducido): los reposos viejos llegaron a menos de
// 10 ms del encuadre en el S9+.
export const STALE_IDLE_MIN_MS = 250;

// Si el reposo que llega en `ahora` es de antes del último encuadre, pedido en `encuadreEn` con una
// animación de `duracionMs`. Sin encuadre previo (null), ninguno es viejo.
export function esReposoViejo(ahora: number, encuadreEn: number | null, duracionMs: number): boolean {
  if (encuadreEn === null) return false;
  return ahora - encuadreEn < Math.max(duracionMs, STALE_IDLE_MIN_MS);
}
