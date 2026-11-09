// Textos y reglas de la pantalla de borrar la cuenta (spec 011, CA-46 a CA-48). Lógica pura:
// la pantalla los arma con el estado local (lib/db/account.ts) y "Mis rutas".

// Con una actividad en curso o una alerta activa no se deja borrar (CA-47). La alerta va primero:
// es lo más importante que el usuario tiene que resolver.
export function bloqueoDeBorrado(estado: { grabando: boolean; alertaActiva: boolean }): string | null {
  if (estado.alertaActiva) {
    return 'Tienes una alerta activa. Cancélala o termina la actividad antes de borrar tu cuenta.';
  }
  if (estado.grabando) {
    return 'Estás grabando una actividad. Termínala antes de borrar tu cuenta.';
  }
  return null;
}

// Qué se borra (CA-46).
export const QUE_SE_BORRA =
  'Se borran tu perfil, tus actividades, tus contactos de emergencia, tus rutas favoritas y tus rutas archivadas, del servidor y de este teléfono. No se puede deshacer.';

// Actividades sin subir: se pierden (CA-46; RN-1).
export function avisoPendientes(pendientes: number): string | null {
  if (pendientes <= 0) return null;
  return pendientes === 1
    ? 'Tienes 1 actividad sin subir. Se perderá.'
    : `Tienes ${pendientes} actividades sin subir. Se perderán.`;
}

// Rutas publicadas: siguen en el catálogo sin autor (CA-48; RN-16).
export function avisoRutasPublicadas(publicadas: number): string | null {
  if (publicadas <= 0) return null;
  return publicadas === 1
    ? 'Tu ruta publicada seguirá en el catálogo, con el autor "Cuenta eliminada".'
    : `Tus ${publicadas} rutas publicadas seguirán en el catálogo, con el autor "Cuenta eliminada".`;
}
