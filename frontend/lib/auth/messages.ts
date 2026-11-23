// Mensajes cuando el inicio de sesión o el registro no reciben respuesta del servidor (spec 002,
// CA-9; spec 001). Sin conexión se dice que hace falta internet, como en el resto de la app; con
// conexión, el servidor no respondió y se usa el mensaje genérico. Sin React Native, para probarlo
// con Vitest (constitución 6.1).

export type AuthAction = 'login' | 'registro';

export const AUTH_ERROR_GENERICO: Record<AuthAction, string> = {
  login: 'Error al iniciar sesión. Inténtalo más tarde.',
  registro: 'Error al registrar usuario. Inténtalo más tarde.',
};

export const AUTH_ERROR_SIN_CONEXION: Record<AuthAction, string> = {
  login: 'Iniciar sesión necesita conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
  registro: 'Crear tu cuenta necesita conexión a internet. Revisa tu conexión e inténtalo de nuevo.',
};

/** El mensaje cuando la petición no obtuvo respuesta, según si el teléfono tiene conexión. */
export function sinRespuesta(action: AuthAction, online: boolean): string {
  return online ? AUTH_ERROR_GENERICO[action] : AUTH_ERROR_SIN_CONEXION[action];
}
