// Error de la API listo para mostrar en pantalla (spec 001, T8).
export interface ApiError {
  message: string;
  // Mensajes por campo del 400 de validación: { email: "El correo no es válido" }.
  fieldErrors: Record<string, string>;
}

// Convierte el body de error del backend en un ApiError. Acepta:
// - { message: "Ya existe un usuario con ese email" }              (409 y otros)
// - { message: "Datos inválidos", errors: { campo: ["..."] } }    (400 del ValidationPipe)
// - { message: ["..."] }                                          (formato por defecto de Nest)
// - cualquier otra cosa → fallback
export function parseApiError(payload: unknown, fallback: string): ApiError {
  const error: ApiError = { message: fallback, fieldErrors: {} };
  if (!payload || typeof payload !== 'object') return error;

  const { message, errors } = payload as { message?: unknown; errors?: unknown };

  if (typeof message === 'string' && message.trim()) {
    error.message = message;
  } else if (Array.isArray(message) && typeof message[0] === 'string') {
    error.message = message[0];
  }

  if (errors && typeof errors === 'object') {
    for (const [field, messages] of Object.entries(errors)) {
      if (Array.isArray(messages) && typeof messages[0] === 'string') {
        error.fieldErrors[field] = messages[0];
      }
    }
  }

  return error;
}
