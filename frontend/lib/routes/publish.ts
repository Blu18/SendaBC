import type { Activity } from '../db/activities';
import { MARGEN_UBICACION_VIEJA_MS } from '../safety/recording';

// Reglas para publicar una actividad como ruta (spec 007). Son las mismas que valida el
// servidor (backend/src/route/dto/create-route.dto.ts y RouteService.publish); la app las
// revisa antes para avisar junto al campo sin hacer la petición.

// Una ruta debe medir al menos 1.5 km (RN-5).
export const MIN_PUBLISH_DISTANCE_M = 1_500;
export const MAX_NOMBRE = 40;
export const MAX_DESCRIPCION = 200;
export const MAX_ZONA = 40;

export const PUBLISH_MESSAGES = {
  nombreObligatorio: 'El nombre es obligatorio',
  nombreLargo: `El nombre debe tener como máximo ${MAX_NOMBRE} caracteres`,
  descripcionLarga: `La descripción debe tener como máximo ${MAX_DESCRIPCION} caracteres`,
  zonaLarga: `La zona debe tener como máximo ${MAX_ZONA} caracteres`,
  noSincronizada: 'Para publicarla como ruta, primero tiene que subirse a tu cuenta.',
  muyCorta: 'Una ruta debe medir al menos 1.5 km.',
} as const;

export type RouteFormValues = { name: string; description: string; region: string };
export type RouteFormErrors = Partial<Record<keyof RouteFormValues, string>>;

// Errores por campo, en español (CA-5, RN-4, RN-7). Sin errores devuelve {}. Como en el
// servidor, los límites no cuentan los espacios del principio y del final.
export function validarRuta(valores: RouteFormValues): RouteFormErrors {
  const errores: RouteFormErrors = {};
  const nombre = valores.name.trim();
  if (nombre === '') errores.name = PUBLISH_MESSAGES.nombreObligatorio;
  else if (nombre.length > MAX_NOMBRE) errores.name = PUBLISH_MESSAGES.nombreLargo;
  if (valores.description.trim().length > MAX_DESCRIPCION) {
    errores.description = PUBLISH_MESSAGES.descripcionLarga;
  }
  if (valores.region.trim().length > MAX_ZONA) errores.region = PUBLISH_MESSAGES.zonaLarga;
  return errores;
}

export type Publicable =
  | { kind: 'publicable' }
  | { kind: 'no-sincronizada'; mensaje: string }
  | { kind: 'muy-corta'; mensaje: string }
  | { kind: 'ya-publicada'; rutaId: string };

// Qué ve el resumen de la actividad: "Publicar como ruta", el motivo por el que no se puede o
// "Ver ruta publicada" (CA-1 a CA-3, CA-8). `rutaExistente` es la ruta de "Mis rutas" cuyo
// sourceActivityId es el serverId de la actividad (plan D7); una borrada ya no aparece ahí.
export function motivoNoPublicable(
  actividad: Pick<Activity, 'status' | 'distanceMeters' | 'serverId'>,
  rutaExistente: { id: string } | null | undefined
): Publicable {
  // "Pendiente de subir" y "No se pudo subir" siguen en PENDING_SYNC (spec 005, D6).
  if (actividad.status !== 'SYNCED' || actividad.serverId === null) {
    return { kind: 'no-sincronizada', mensaje: PUBLISH_MESSAGES.noSincronizada };
  }
  if ((actividad.distanceMeters ?? 0) < MIN_PUBLISH_DISTANCE_M) {
    return { kind: 'muy-corta', mensaje: PUBLISH_MESSAGES.muyCorta };
  }
  if (rutaExistente) return { kind: 'ya-publicada', rutaId: rutaExistente.id };
  return { kind: 'publicable' };
}

// Primer punto real del recorrido, para proponer la zona: el servidor quita del principio los de
// antes del inicio de la actividad (CA-28, RN-10). Si quedarían menos de 2, el reloj estaba
// desfasado y cuenta el primero. Sin puntos, undefined.
export function inicioDelRecorrido<T extends { recordedAt: string }>(puntos: T[], startedAt: string) {
  const limite = Date.parse(startedAt) - MARGEN_UBICACION_VIEJA_MS;
  const primero = puntos.findIndex((p) => Date.parse(p.recordedAt) >= limite);
  if (primero === -1 || puntos.length - primero < 2) return puntos[0];
  return puntos[primero];
}
