// Aviso al presionar "Iniciar actividad" sin el permiso de ubicación (spec 003, CA-3). Va en un
// diálogo y no solo en la pantalla: el aviso en línea quedaba debajo de la hora de regreso, fuera
// de la vista, y parecía que el botón no hacía nada. Sin React Native, para probarlo con Vitest
// (constitución 6.1).

export type MotivoSinUbicacion = 'denied' | 'blocked';

export type AvisoSinUbicacion = {
  titulo: string;
  cuerpo: string;
  // Con el permiso bloqueado ("No volver a preguntar"), Android ya no muestra su pregunta: el
  // único camino es abrir los ajustes de la app.
  ofreceAjustes: boolean;
};

export const LOCATION_PERMISSION_MESSAGES = {
  porQue:
    'SendaBC usa tu ubicación para grabar el recorrido de tu actividad: la distancia, el mapa y la elevación. Si tienes contactos de emergencia, también la usa para avisarles dónde estás si dejas de moverte.',
  bloqueadoTitulo: 'Activa tu ubicación',
  bloqueadoPasos:
    'El permiso está desactivado y Android ya no deja pedirlo desde la app. Toca "Abrir ajustes", entra a Permisos > Ubicación y elige "Permitir solo mientras se usa la app" o "Permitir todo el tiempo". Después vuelve y presiona "Iniciar actividad".',
  negadoTitulo: 'Se necesita tu ubicación',
  negadoPasos: 'Presiona "Iniciar actividad" otra vez y elige "Permitir" cuando Android te lo pregunte.',
  abrirAjustes: 'Abrir ajustes',
  ahoraNo: 'Ahora no',
  entendido: 'Entendido',
} as const;

export function avisoSinUbicacion(motivo: MotivoSinUbicacion): AvisoSinUbicacion {
  const m = LOCATION_PERMISSION_MESSAGES;
  if (motivo === 'blocked') {
    return { titulo: m.bloqueadoTitulo, cuerpo: `${m.porQue}\n\n${m.bloqueadoPasos}`, ofreceAjustes: true };
  }
  return { titulo: m.negadoTitulo, cuerpo: `${m.porQue}\n\n${m.negadoPasos}`, ofreceAjustes: false };
}
