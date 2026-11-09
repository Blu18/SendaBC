// Validaciones de cambiar correo y contraseña antes de pedirlo al servidor (spec 011, CA-43,
// CA-44). Mismas reglas y mensajes que el registro (spec 001); el servidor las vuelve a revisar.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_CONTRASENA = 8;

export type EmailForm = { email: string; password: string };
export type EmailFormErrors = Partial<Record<keyof EmailForm, string>>;

export function validarCambioCorreo({ email, password }: EmailForm): EmailFormErrors {
  const errores: EmailFormErrors = {};
  if (!email.trim()) errores.email = 'El correo es obligatorio';
  else if (!EMAIL_REGEX.test(email.trim())) errores.email = 'Ingresa un correo válido';
  if (!password) errores.password = 'Escribe tu contraseña';
  return errores;
}

export type PasswordForm = { actual: string; nueva: string; confirmar: string };
export type PasswordFormErrors = Partial<Record<keyof PasswordForm, string>>;

export function validarCambioContrasena({ actual, nueva, confirmar }: PasswordForm): PasswordFormErrors {
  const errores: PasswordFormErrors = {};
  if (!actual) errores.actual = 'Escribe tu contraseña actual';
  if (!nueva) errores.nueva = 'La contraseña es obligatoria';
  else if (nueva.length < MIN_CONTRASENA) {
    errores.nueva = `Debe tener al menos ${MIN_CONTRASENA} caracteres`;
  }
  if (!confirmar) errores.confirmar = 'Confirma tu contraseña';
  else if (nueva !== confirmar) errores.confirmar = 'Las contraseñas no coinciden';
  return errores;
}
