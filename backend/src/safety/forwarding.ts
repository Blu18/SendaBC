// Cuándo se reenvía la ubicación a los contactos con una alerta activa (spec 008, RN-11, plan D7):
// cada 15 minutos o cuando la persona se movió más de 200 m, lo que pase primero. Puro.

export const REENVIO_CADA_MS = 15 * 60_000;
export const REENVIO_METROS = 200;

const RADIO_TIERRA_M = 6_371_008.8;

export type Punto = { lat: number; lng: number };

// Distancia sobre la esfera (haversine). A 200 m la diferencia con el elipsoide es de centímetros.
export function distanciaMetros(a: Punto, b: Punto): number {
  const rad = (grados: number) => (grados * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function debeReenviar(
  ultimo: { at: Date | null; punto: Punto | null },
  nuevo: { at: Date; punto: Punto },
): boolean {
  // Sin reenvío previo, o la alerta salió sin ubicación: se manda la primera que llegue.
  if (!ultimo.at || !ultimo.punto) return true;
  // Una ubicación atrasada no se reenvía.
  if (nuevo.at.getTime() <= ultimo.at.getTime()) return false;
  return (
    nuevo.at.getTime() - ultimo.at.getTime() >= REENVIO_CADA_MS ||
    distanciaMetros(ultimo.punto, nuevo.punto) > REENVIO_METROS
  );
}
