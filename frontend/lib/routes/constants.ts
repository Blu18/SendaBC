// Constantes del catálogo de rutas cercanas (spec 006).

// Radios que se pueden elegir; al abrir "Explorar rutas" siempre es 25 km (CA-11, RN-5).
export const RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;
export const DEFAULT_RADIUS_KM = 25;

// El backend devuelve como máximo 50 rutas, las más cercanas (CA-5).
export const MAX_ROUTES = 50;

// Límite de tiempo de la búsqueda: sin él, un backend inalcanzable deja la pantalla cargando
// más de un minuto (CA-15, CA-16).
export const NEARBY_TIMEOUT_MS = 10_000;

// "Buscar en esta zona" aparece cuando el centro del mapa se movió más de esta fracción del
// radio desde la última búsqueda (CA-9).
export const MOVE_THRESHOLD = 0.2;

// Todo el estado de Baja California, para abrir el mapa sin permiso de ubicación (CA-14).
// Latitud 28.0–32.72 y longitud -117.13 a -112.7 (hasta la Isla Ángel de la Guarda), con un
// poco de margen.
export const BAJA_CALIFORNIA_REGION = {
  latitude: 30.36,
  longitude: -114.92,
  latitudeDelta: 5.2,
  longitudeDelta: 4.8,
};
