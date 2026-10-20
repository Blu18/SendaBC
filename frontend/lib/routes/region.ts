import { MAX_ZONA } from './publish';

// Los campos de LocationGeocodedAddress (expo-location) que sirven para nombrar la zona. Se
// declaran aquí para que lib/ no dependa del runtime de Expo (constitución 6.1).
export type DireccionGeocodificada = {
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
};

// Zona propuesta para una ruta a partir de reverseGeocodeAsync sobre su inicio (spec 007, RN-7,
// plan D6): la ciudad, si no la subregión (municipio) y si no la región (estado), de la primera
// dirección que traiga alguna. Recortada a 40 caracteres; sin datos, '' y el campo queda vacío.
export function zonaDe(direcciones: DireccionGeocodificada[] | null | undefined): string {
  for (const direccion of direcciones ?? []) {
    for (const valor of [direccion.city, direccion.subregion, direccion.region]) {
      const zona = valor?.trim();
      if (zona) return zona.slice(0, MAX_ZONA).trimEnd();
    }
  }
  return '';
}
