// RN-1 (spec 001): el correo se guarda y se busca sin espacios y en minúsculas.
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}
