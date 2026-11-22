import type { LngLat } from '../map/track';
import type { Coordinates } from '../metrics/geo';

// Capas de Explorar y del detalle de ruta en Mapbox (spec 013, T9, T10). Cada ruta se dibuja como
// una línea y su inicio como un punto, con el id de la ruta en sus propiedades para saber cuál se
// tocó (spec 006, CA-2, CA-8).

export type RouteFeatureProps = { id: string };

export type LineFeature = {
  type: 'Feature';
  properties: RouteFeatureProps;
  geometry: { type: 'LineString'; coordinates: LngLat[] };
};

export type PointFeature = {
  type: 'Feature';
  properties: RouteFeatureProps;
  geometry: { type: 'Point'; coordinates: LngLat };
};

export type FeatureCollection<F> = { type: 'FeatureCollection'; features: F[] };

const toLngLat = ({ latitude, longitude }: Coordinates): LngLat => [longitude, latitude];

// Recorridos con al menos dos puntos: con uno solo no hay línea que dibujar.
export function routeLines(
  routes: { id: string; path: [number, number][] }[]
): FeatureCollection<LineFeature> {
  return {
    type: 'FeatureCollection',
    features: routes
      .filter((route) => route.path.length >= 2)
      .map((route) => ({
        type: 'Feature',
        properties: { id: route.id },
        geometry: { type: 'LineString', coordinates: route.path },
      })),
  };
}

// Punto de inicio de cada ruta (spec 006, CA-2).
export function routeStarts(routes: { id: string; start: Coordinates }[]): FeatureCollection<PointFeature> {
  return {
    type: 'FeatureCollection',
    features: routes.map((route) => pointFeature(route.id, route.start)),
  };
}

export function pointFeature(id: string, point: Coordinates): PointFeature {
  return { type: 'Feature', properties: { id }, geometry: { type: 'Point', coordinates: toLngLat(point) } };
}

// Id de la ruta de un toque en una capa. Sin elementos o sin id, null.
export function touchedRouteId(features: { properties?: unknown }[] | undefined): string | null {
  for (const feature of features ?? []) {
    const id = (feature.properties as Partial<RouteFeatureProps> | null | undefined)?.id;
    if (typeof id === 'string') return id;
  }
  return null;
}
