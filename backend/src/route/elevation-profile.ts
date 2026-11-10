// Spec 007, RN-8 y plan D2: el perfil de elevación se calcula al publicar y se guarda en
// routes.elevationProfile. Sin imports de runtime para que el seed (`node prisma/seed/...`)
// también pueda usarlo con las trazas GPX.

export const MAX_PUNTOS_PERFIL = 200;
const RADIO_TIERRA_M = 6_371_008.8;

export type PuntoPerfil = {
  lat: number;
  lng: number;
  altitudeMeters: number | null;
};

/** [distancia acumulada m, altitud m] */
export type Perfil = [number, number][];

const rad = (g: number) => (g * Math.PI) / 180;

export function haversine(a: PuntoPerfil, b: PuntoPerfil) {
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

const redondear = (m: number) => Math.round(m * 10) / 10;

/**
 * Perfil de un recorrido con sus puntos en orden. La distancia acumulada cuenta todos los
 * puntos, pero solo entran al perfil los que tienen altitud. Se muestrea por distancia a
 * MAX_PUNTOS_PERFIL como máximo, conservando el primero y el último. Sin altitudes, `null`.
 */
export function perfilDe(puntos: PuntoPerfil[]): Perfil | null {
  const conAltitud: Perfil = [];
  let acumulada = 0;
  for (let i = 0; i < puntos.length; i++) {
    if (i > 0) acumulada += haversine(puntos[i - 1], puntos[i]);
    const altitud = puntos[i].altitudeMeters;
    if (altitud === null || !Number.isFinite(altitud)) continue;
    const distancia = redondear(acumulada);
    // Con el GPS detenido, varios puntos caen en la misma distancia: se queda el primero.
    if (conAltitud.length > 0 && distancia <= conAltitud.at(-1)![0]) continue;
    conAltitud.push([distancia, redondear(altitud)]);
  }
  if (conAltitud.length === 0) return null;
  if (conAltitud.length <= MAX_PUNTOS_PERFIL) return conAltitud;

  // Para cada distancia objetivo, espaciadas por igual, el primer punto que la alcanza.
  const inicio = conAltitud[0][0];
  const tramo = (conAltitud.at(-1)![0] - inicio) / (MAX_PUNTOS_PERFIL - 1);
  const muestra: Perfil = [];
  let j = 0;
  for (let k = 0; k < MAX_PUNTOS_PERFIL; k++) {
    const objetivo =
      k === MAX_PUNTOS_PERFIL - 1 ? Infinity : inicio + k * tramo;
    while (j < conAltitud.length - 1 && conAltitud[j][0] < objetivo) j++;
    if (muestra.at(-1) !== conAltitud[j]) muestra.push(conAltitud[j]);
  }
  return muestra;
}
