import type { AvatarId } from './avatars';
import type { ProfileChanges } from './api';

// Misma regla que el registro (spec 001, RN-4): al menos 5 caracteres sin contar los espacios de
// los extremos. El servidor la vuelve a comprobar.
export const MIN_NOMBRE = 5;
export const MENSAJE_NOMBRE_CORTO = `El nombre visible debe tener al menos ${MIN_NOMBRE} caracteres`;

export function validarNombre(nombre: string): string | null {
  return nombre.trim().length < MIN_NOMBRE ? MENSAJE_NOMBRE_CORTO : null;
}

// Solo lo que cambió respecto al perfil guardado; vacío si no hay nada que guardar.
export function cambiosDePerfil(
  guardado: { displayName: string; avatarId: string | null },
  nombre: string,
  avatar: AvatarId | null
): ProfileChanges {
  const cambios: ProfileChanges = {};
  const recortado = nombre.trim();
  if (recortado !== guardado.displayName) cambios.displayName = recortado;
  if (avatar !== (guardado.avatarId ?? null)) cambios.avatarId = avatar;
  return cambios;
}
