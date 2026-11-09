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

// --- De paquetes de Mapbox a zonas (CA-32, CA-33) ---

// Cada zona son dos paquetes, uno por estilo (D14). El nombre del paquete lleva la zona y el
// estilo; la metadata guarda lo necesario para listarla y volver a crear un paquete que falte.
export type ZoneStyle = 'light' | 'dark';
export const ZONE_STYLE_KEYS: readonly ZoneStyle[] = ['light', 'dark'];

export type ZoneMetadata = { zoneId: string; style: ZoneStyle; createdAt: string; bounds: ZoneBounds };

export function nombreDePaquete(zoneId: string, style: ZoneStyle) {
  return `${zoneId}:${style}`;
}

// Un paquete como lo deja offlinePacks.ts, ya sin tipos de Mapbox.
export type PackInfo = {
  name: string;
  metadata: Partial<ZoneMetadata>;
  complete: boolean;
  percentage: number | null;
  sizeBytes: number;
};

// Lo que se sabe en esta sesión de las descargas: los eventos de avance y de error de Mapbox.
// Tras cerrar la app no hay nada aquí y una zona sin terminar se ve como incompleta.
export type PackLive = { state: 'active' | 'complete' | 'error'; percentage: number | null };

export type ZoneStatus = 'ready' | 'downloading' | 'incomplete';

export type ZoneItem = {
  id: string;
  createdAt: string;
  bounds: ZoneBounds;
  areaKm2: number;
  status: ZoneStatus;
  percentage: number; // 0 a 100, promedio de los dos estilos
  sizeBytes: number;
  missingStyles: ZoneStyle[]; // paquetes que no se llegaron a crear
};

function esZona(m: Partial<ZoneMetadata>): m is ZoneMetadata {
  return typeof m.zoneId === 'string' && typeof m.createdAt === 'string' && !!m.bounds && !!m.style;
}

// Agrupa los paquetes por zona, de la más nueva a la más vieja. Un paquete sin metadata de zona
// no es de esta app y se ignora.
//
// - Lista: los dos paquetes completos (CA-32: solo entonces aparece como lista).
// - Descargando: algún paquete avanza en esta sesión y ninguno falló.
// - Incompleta: lo demás, incluido un fallo o una descarga cortada al cerrar la app. Se reintenta.
//
// El tamaño es el del paquete más grande, no la suma: el segundo estilo comparte casi todos sus
// mosaicos con el primero y no ocupa más espacio (D14), pero Mapbox los cuenta en ambos.
export function agruparZonas(packs: PackInfo[], vivos: Record<string, PackLive> = {}): ZoneItem[] {
  const porZona = new Map<string, { meta: ZoneMetadata; packs: Map<ZoneStyle, PackInfo> }>();
  for (const p of packs) {
    if (!esZona(p.metadata)) continue;
    const z = porZona.get(p.metadata.zoneId) ?? { meta: p.metadata, packs: new Map() };
    z.packs.set(p.metadata.style, p);
    porZona.set(p.metadata.zoneId, z);
  }

  const zonas: ZoneItem[] = [];
  for (const [id, z] of porZona) {
    const estados = ZONE_STYLE_KEYS.map((style) => {
      const p = z.packs.get(style);
      if (!p) return { complete: false, percentage: 0, live: undefined };
      const live = vivos[p.name];
      const complete = p.complete || live?.state === 'complete';
      return {
        complete,
        percentage: complete ? 100 : (live?.percentage ?? p.percentage ?? 0),
        live,
      };
    });

    let status: ZoneStatus;
    if (estados.every((e) => e.complete)) status = 'ready';
    else if (estados.some((e) => e.live?.state === 'error')) status = 'incomplete';
    else if (estados.some((e) => e.live?.state === 'active')) status = 'downloading';
    else status = 'incomplete';

    const tamanos = [...z.packs.values()].map((p) => p.sizeBytes);
    zonas.push({
      id,
      createdAt: z.meta.createdAt,
      bounds: z.meta.bounds,
      areaKm2: areaKm2(z.meta.bounds),
      status,
      percentage: Math.min(100, estados.reduce((s, e) => s + e.percentage, 0) / estados.length),
      sizeBytes: Math.max(0, ...tamanos),
      missingStyles: ZONE_STYLE_KEYS.filter((s) => !z.packs.has(s)),
    });
  }
  return zonas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// "41 MB" para lo que ya ocupa una zona descargada (CA-33).
export function formatoOcupado(bytes: number): string {
  const mb = bytes / 1_000_000;
  return mb < 1 ? 'Menos de 1 MB' : `${Math.round(mb)} MB`;
}
