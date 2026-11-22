// Textos de Inicio (spec 013), los del prototipo aprobado en Figma (T1, T2).

type Aviso = { title: string; description: string };

export const HOME_MESSAGES = {
  nearbyNoPermission: {
    title: 'Activa tu ubicación para ver rutas cerca',
    description: 'Ve a los permisos de la app. Sin ubicación también puedes explorar el mapa.',
  },
  nearbyEmpty: { title: 'No hay rutas publicadas cerca de ti', description: 'Busca en otra zona del mapa.' },
  nearbyOffline: { title: 'Las rutas necesitan conexión', description: 'Aparecerán solas cuando vuelva la red.' },
  nearbyError: { title: 'No se pudieron cargar las rutas', description: 'Inténtalo de nuevo en un momento.' },
  popularOffline: {
    title: 'Las rutas populares necesitan conexión',
    description: 'Aparecerán solas cuando vuelva la red.',
  },
  popularError: { title: 'No se pudieron cargar las rutas populares', description: 'Inténtalo de nuevo en un momento.' },
  noActivities: { title: 'Sin actividades todavía', description: 'Toca "Empezar actividad" para grabar la primera.' },
  offlineMaps: { title: 'Mapas sin conexión', description: 'Descarga una zona antes de salir' },
  pendingDescription: 'Se suben solas al volver la conexión',
  // Las miniaturas piden la imagen sin logo ni atribución: se muestran aquí (spec 013, T15).
  attribution: 'Mapas © Mapbox © OpenStreetMap',
} satisfies Record<string, Aviso | string>;

// "2 actividades sin subir"; null si no hay ninguna (CA-19).
export function pendingTitle(pendientes: number): string | null {
  if (pendientes <= 0) return null;
  return pendientes === 1 ? '1 actividad sin subir' : `${pendientes} actividades sin subir`;
}
