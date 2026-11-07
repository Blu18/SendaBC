import type { ActivityPointInput } from '../db/activities';
import { createHeading } from './heading';
import { createTrack, type LngLat, type TrackFeature } from './track';

export type MapSnapshot = {
  track: TrackFeature;
  position: LngLat | null;
  heading: number | null; // null hasta tener el primer avance
};

// Lo que muestra el mapa de la grabación, a partir de los puntos guardados y los que van llegando
// (spec 010, CA-2 a CA-4). Un punto puede llegar dos veces, al releer SQLite y por el evento de la
// grabación: el número de secuencia evita contarlo de nuevo.
export function createLiveMap(saved: ActivityPointInput[] = []) {
  const track = createTrack();
  const heading = createHeading();
  let lastSequence = 0;

  const add = (point: ActivityPointInput) => {
    if (point.sequence <= lastSequence) return false;
    lastSequence = point.sequence;
    track.add(point);
    heading.add(point);
    return true;
  };
  saved.forEach(add);

  return {
    add,
    get snapshot(): MapSnapshot {
      return { track: track.feature, position: track.position, heading: heading.value };
    },
  };
}
