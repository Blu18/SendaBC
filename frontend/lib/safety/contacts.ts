import { MAX_NOMBRE, PUBLISH_MESSAGES } from '../routes/publish';

// Contactos de emergencia (spec 008). Las reglas son las mismas que valida el servidor
// (backend/src/emergency-contact/dto); la app las revisa antes para avisar junto al campo.

export type ContactStatus = 'PENDING' | 'ACTIVE' | 'UNREACHABLE';

export type EmergencyContact = {
  id: string;
  name: string;
  status: ContactStatus;
  telegramName: string | null;
  // Enlace t.me para compartir; null cuando el contacto está activo (CA-1, RN-13).
  inviteUrl: string | null;
  createdAt: string;
};

// De cero a tres contactos, activos o pendientes (RN-3).
export const MAX_CONTACTOS = 3;

// El nombre sigue las reglas del nombre de una ruta (RN-1): obligatorio y de 40 caracteres
// como máximo, sin contar los espacios de los extremos.
export const MAX_NOMBRE_CONTACTO = MAX_NOMBRE;

export const CONTACT_MESSAGES = {
  nombreObligatorio: PUBLISH_MESSAGES.nombreObligatorio,
  nombreLargo: PUBLISH_MESSAGES.nombreLargo,
  limite: `Puedes tener como máximo ${MAX_CONTACTOS} contactos de emergencia.`,
} as const;

export type ContactFormErrors = { name?: string };

// Errores por campo, en español (CA-2). Sin errores devuelve {}.
export function validarContacto(nombre: string): ContactFormErrors {
  const recortado = nombre.trim();
  if (recortado === '') return { name: CONTACT_MESSAGES.nombreObligatorio };
  if (recortado.length > MAX_NOMBRE_CONTACTO) return { name: CONTACT_MESSAGES.nombreLargo };
  return {};
}

// Estado de cada contacto en la pantalla "Seguridad" (CA-1, CA-5, CA-7).
export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  PENDING: 'Pendiente de aceptar',
  ACTIVE: 'Activo',
  UNREACHABLE: 'No recibe mensajes',
};

// Solo los activos reciben avisos (RN-12): con ellos se decide si la seguridad está activa al
// iniciar una actividad (CA-8, CA-9).
export function contactosActivos<T extends Pick<EmergencyContact, 'status'>>(contactos: T[]): T[] {
  return contactos.filter((c) => c.status === 'ACTIVE');
}

// Con tres contactos ya no se puede agregar otro (CA-1).
export function puedeAgregar(contactos: unknown[]) {
  return contactos.length < MAX_CONTACTOS;
}

// "Compartir invitación": los pendientes y los que dejaron de recibir mensajes (CA-1, CA-7).
// "Enviar mensaje de prueba": solo los activos (CA-6).
export function accionesDe(contacto: Pick<EmergencyContact, 'status' | 'inviteUrl'>) {
  return {
    compartir: contacto.status !== 'ACTIVE' && contacto.inviteUrl !== null,
    probar: contacto.status === 'ACTIVE',
  };
}
