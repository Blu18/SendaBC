import type { DistancePoint } from '../metrics/distance';
import type { Theme } from '../theme';
import { ZONE_STYLES } from './style';
import { computeTrack, type LngLat } from './track';

// Miniaturas de recorridos en Inicio (spec 013, CA-3, CA-8; plan D3). El fondo es una imagen
// estática de Mapbox pedida solo por centro y zoom: el recorrido no viaja en la URL, se dibuja en
// el teléfono encima de la imagen con la misma proyección (Web Mercator). Sin red, la miniatura
// queda con el recorrido sobre un fondo liso.

// La Static Images API usa mosaicos de 512 px: en el zoom z el mundo mide 512 · 2^z px.
const TILE_SIZE = 512;
// Margen alrededor del recorrido, como fracción del lado de la miniatura.
export const THUMBNAIL_MARGIN = 0.15;
// Zoom máximo: un recorrido muy corto o de un solo punto no se acerca a nivel de calle.
export const THUMBNAIL_MAX_ZOOM = 15;
// Puntos que se dibujan como máximo: una actividad de 3 h trae ~5 400.
export const THUMBNAIL_MAX_POINTS = 200;

const STATIC_API = 'https://api.mapbox.com/styles/v1';

// Coordenadas del mundo en el zoom 0 (0 a 512).
function project([lng, lat]: LngLat): [number, number] {
  const x = ((lng + 180) / 360) * TILE_SIZE;
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * TILE_SIZE;
  return [x, y];
}

function unproject([x, y]: [number, number]): LngLat {
  const lng = (x / TILE_SIZE) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / TILE_SIZE;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return [lng, lat];
}

// Hasta `max` puntos repartidos a lo largo del recorrido, con el primero y el último.
export function simplifyPoints<T>(points: T[], max = THUMBNAIL_MAX_POINTS): T[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

export type Thumbnail = {
  center: LngLat; // centro de la imagen, en [lng, lat]
  zoom: number;
  svgPath: string; // "M x y L x y …" en coordenadas de la miniatura (0 a width, 0 a height)
};

// Encuadre y trazo de una miniatura de `width` × `height` px. Sin puntos, null.
export function frameThumbnail(path: LngLat[], width: number, height: number): Thumbnail | null {
  if (path.length === 0) return null;
  const puntos = simplifyPoints(path).map(project);
  const xs = puntos.map(([x]) => x);
  const ys = puntos.map(([, y]) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];

  // El zoom en que el recorrido ocupa el lado disponible, sin pasar del máximo.
  const util = 1 - 2 * THUMBNAIL_MARGIN;
  const zoomPara = (span: number, lado: number) => (span > 0 ? Math.log2((lado * util) / span) : Infinity);
  // Redondeado a centésimas, el mismo valor que lleva la URL: imagen y trazo usan la misma escala.
  const zoom =
    Math.floor(Math.min(zoomPara(maxX - minX, width), zoomPara(maxY - minY, height), THUMBNAIL_MAX_ZOOM) * 100) / 100;
  const escala = 2 ** zoom;

  const centro: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2];
  const aPantalla = ([x, y]: [number, number]) => [
    (x - centro[0]) * escala + width / 2,
    (y - centro[1]) * escala + height / 2,
  ];
  const svgPath = puntos
    .map(aPantalla)
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  return { center: unproject(centro), zoom, svgPath };
}

// URL de la imagen de fondo: solo estilo, centro, zoom y tamaño, nunca el recorrido (plan D3).
// Centro y zoom se redondean para que el mismo recorrido dé siempre la misma URL y la imagen se
// reutilice desde el caché (plan R3). Sin logo ni atribución dentro de la imagen, porque no caben
// en una miniatura: Inicio muestra la atribución de Mapbox y OpenStreetMap aparte.
export function staticMapUrl(o: {
  scheme: Theme['scheme'];
  center: LngLat;
  zoom: number;
  width: number;
  height: number;
  token: string;
}): string {
  const estilo = ZONE_STYLES[o.scheme === 'dark' ? 'dark' : 'light'].replace('mapbox://styles/', '');
  const [lng, lat] = o.center;
  const posicion = `${lng.toFixed(5)},${lat.toFixed(5)},${o.zoom.toFixed(2)}`;
  const tamano = `${Math.round(o.width)}x${Math.round(o.height)}@2x`;
  const query = `access_token=${encodeURIComponent(o.token)}&logo=false&attribution=false`;
  return `${STATIC_API}/${estilo}/static/${posicion}/${tamano}?${query}`;
}

// Camino de la miniatura de una actividad a partir de sus puntos guardados. Usa las reglas del
// mapa de la grabación (spec 010, CA-4): sin puntos imprecisos, para que la forma coincida con la
// distancia medida. Los tramos separados por un salto se unen, porque en la miniatura no se nota.
// Si ningún punto alcanza la precisión, se usan todos para no dejar la miniatura vacía.
export function activityThumbnailPath(points: DistancePoint[]): LngLat[] {
  const tramos = computeTrack(points).feature.geometry.coordinates;
  const camino = tramos.flat();
  return camino.length > 0 ? camino : points.map((p) => [p.longitude, p.latitude] as LngLat);
}
