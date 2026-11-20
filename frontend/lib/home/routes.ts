// Rutas cercanas y populares en Inicio (spec 013, CA-9 a CA-15, CA-22).

// Radio y número de rutas cercanas: el radio por defecto de Explorar y 5 rutas (P9).
export const HOME_NEARBY_RADIUS_KM = 25;
export const HOME_NEARBY_LIMIT = 5;

// Resultado de una consulta de Inicio. Sin conexión o sin permiso no es un error: la sección lo
// explica sin ocupar la pantalla con avisos de error (CA-11, CA-22).
export type HomeRoutesOutcome<T> = { kind: 'ok'; items: T[] } | { kind: 'offline' } | { kind: 'noPermission' };

export type HomeRoutesStatus = 'loading' | 'ready' | 'empty' | 'offline' | 'noPermission' | 'error';

// Estado que muestra cada sección. Mientras se repite una consulta se conserva lo que ya se veía.
export function homeRoutesStatus<T>(q: {
  data: HomeRoutesOutcome<T> | undefined;
  isError: boolean;
}): HomeRoutesStatus {
  if (q.data) {
    if (q.data.kind === 'offline') return 'offline';
    if (q.data.kind === 'noPermission') return 'noPermission';
    return q.data.items.length > 0 ? 'ready' : 'empty';
  }
  return q.isError ? 'error' : 'loading';
}

// Una falla de la API sin respuesta del servidor (sin red, tiempo agotado) se muestra como sin
// conexión; una respuesta de error del servidor, como error.
export function esSinConexion(failure: { error: unknown } | { status: number }): boolean {
  return 'error' in failure;
}
