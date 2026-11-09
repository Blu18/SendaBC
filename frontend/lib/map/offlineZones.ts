import type { Coordinates } from '../metrics/geo';

// Zonas del mapa para usar sin conexión al grabar (spec 011, CA-31, RN-8; plan, D13 y D15).
// Lógica pura: del marco que el usuario ve en pantalla a los límites, el tamaño aproximado y si
// se puede descargar. Sin imports de React Native ni de Mapbox, para probarla.

export const ZONE_MIN_ZOOM = 10;
export const ZONE_MAX_ZOOM = 13;
export const MAX_ZONE_KM2 = 900; // unos 30 × 30 km
export const MAX_ZONES = 10;

// D15: medido en la sierra, 100 km² pesan 41 MB y 900 km², 142 MB. Solo es una aproximación.
const MB_BASE = 28;
const MB_POR_KM2 = 0.126;

// Mapbox GL usa mosaicos de 512 px para la cámara: a zoom z el mundo mide 512 · 2^z px.
const TILE_PX = 512;
const MAX_LAT = 85.051_128_78;

export type ZoneBounds = { north: number; south: number; east: number; west: number };

// Los límites como los pide Mapbox.offlineManager.createPack: [[lngNE, latNE], [lngSW, latSW]].
export function boundsParaMapbox(b: ZoneBounds): [[number, number], [number, number]] {
  return [
    [b.east, b.north],
    [b.west, b.south],
  ];
}

// --- Marco a límites ---

function lngAX(lng: number, mundo: number) {
  return ((lng + 180) / 360) * mundo;
}

function latAY(lat: number, mundo: number) {
  const s = Math.sin((Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * mundo;
}

function xALng(x: number, mundo: number) {
  return (x / mundo) * 360 - 180;
}

function yALat(y: number, mundo: number) {
  const n = Math.PI - (2 * Math.PI * y) / mundo;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

// El marco fijo del centro de pickZonePage: con el centro y el zoom del mapa, y el tamaño del
// marco en px (dp), da los límites de la zona en proyección Web Mercator, como la dibuja Mapbox.
// Sin inclinación ni giro: el selector usa el mapa en 2D y hacia el norte.
export function marcoALimites(o: {
  center: Coordinates;
  zoom: number;
  widthPx: number;
  heightPx: number;
}): ZoneBounds {
  const mundo = TILE_PX * 2 ** o.zoom;
  const cx = lngAX(o.center.longitude, mundo);
  const cy = latAY(o.center.latitude, mundo);
  return {
    north: yALat(cy - o.heightPx / 2, mundo),
    south: yALat(cy + o.heightPx / 2, mundo),
    east: xALng(cx + o.widthPx / 2, mundo),
    west: xALng(cx - o.widthPx / 2, mundo),
  };
}

// --- Área y tamaño ---

const KM_POR_GRADO_LAT = 111.32;

// Área aproximada en km²: ancho a la latitud media por alto. A 30 km el error es despreciable.
export function areaKm2(b: ZoneBounds): number {
  const latMedia = ((b.north + b.south) / 2) * (Math.PI / 180);
  const altoKm = (b.north - b.south) * KM_POR_GRADO_LAT;
  const anchoKm = (b.east - b.west) * KM_POR_GRADO_LAT * Math.cos(latMedia);
  return Math.abs(altoKm * anchoKm);
}

// Megabytes aproximados que ocupará la zona con los dos estilos y el relieve (D14, D15).
export function tamanoAproximadoMb(b: ZoneBounds): number {
  return MB_BASE + MB_POR_KM2 * areaKm2(b);
}

// --- Conteo de mosaicos ---

// Mosaicos XYZ estándar (256 px por índice) que cubren la zona en cada zoom, de minZoom a maxZoom.
// Sirve para comparar zonas y para revisar los límites de Mapbox; el tope lo pone el área (D13).
export function contarMosaicos(b: ZoneBounds, minZoom = ZONE_MIN_ZOOM, maxZoom = ZONE_MAX_ZOOM): number {
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const n = 2 ** z;
    const x0 = Math.floor(lngAX(b.west, n));
    const x1 = Math.min(n - 1, Math.floor(lngAX(b.east, n)));
    const y0 = Math.floor(latAY(b.north, n));
    const y1 = Math.min(n - 1, Math.floor(latAY(b.south, n)));
    total += (x1 - x0 + 1) * (y1 - y0 + 1);
  }
  return total;
}

// --- Tope (RN-8) ---

export type ZoneCheck =
  | { ok: true; areaKm2: number; sizeMb: number }
  | { ok: false; reason: 'too-large'; areaKm2: number; sizeMb: number }
  | { ok: false; reason: 'too-many' };

// Si la zona se puede descargar: no más de MAX_ZONE_KM2 y no más de MAX_ZONES zonas (D13).
// Una zona con descarga incompleta también cuenta: ocupa un lugar hasta que se borra.
export function revisarZona(b: ZoneBounds, zonasExistentes: number): ZoneCheck {
  if (zonasExistentes >= MAX_ZONES) return { ok: false, reason: 'too-many' };
  const area = areaKm2(b);
  const sizeMb = tamanoAproximadoMb(b);
  if (area > MAX_ZONE_KM2) return { ok: false, reason: 'too-large', areaKm2: area, sizeMb };
  return { ok: true, areaKm2: area, sizeMb };
}

// Mensajes para pickZonePage (CA-31).
export const ZONE_MESSAGES = {
  tooLarge: `La zona es demasiado grande. Acerca el mapa: el máximo es de unos ${MAX_ZONE_KM2} km² (30 × 30 km).`,
  tooMany: `Ya tienes ${MAX_ZONES} zonas descargadas. Borra una para descargar otra.`,
} as const;

// "Unos 41 MB": redondeado, porque es una aproximación.
export function formatoTamano(mb: number): string {
  return `Unos ${Math.round(mb)} MB`;
}
