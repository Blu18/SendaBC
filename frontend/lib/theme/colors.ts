// Paleta de SendaBC (spec 009). Usa estos nombres en lugar de valores hex sueltos.
// Los nombres coinciden con las variables de la colección Color en Figma (plan D6).
export type ColorTokens = {
  background: string; // Polvo de granito — fondo
  surface: string; // Tarjetas, campos, barra de pestañas
  text: string; // Roca sombra — texto
  textMuted: string; // Texto secundario
  primary: string; // Chaparral — botones, encabezados
  onPrimary: string; // Texto sobre primary (y sobre error en el botón de peligro)
  secondary: string; // Ocre de sendero — íconos, acentos, texto grande (RN-4)
  secondaryText: string; // Ocre para texto normal (p. ej. insignia "pendiente")
  data: string; // Azul Pacífico — métricas y recorrido
  alert: string; // SOLO seguridad (inactividad, SOS); no usar para errores de formulario (RN-5)
  onAlert: string; // Texto sobre alert
  error: string; // Validación y acciones destructivas
  border: string; // Bordes de campos (≥ 3:1 contra background y surface)
  shadow: string; // Color de las sombras, con su opacidad (spec 014, RN-11). Solo para shadows.ts
};

export const lightColors: ColorTokens = {
  background: '#EDEAE1',
  surface: '#F7F5EF',
  text: '#2B2A26',
  textMuted: '#444444',
  primary: '#5C6B49',
  onPrimary: '#FFFFFF',
  secondary: '#A9762F',
  secondaryText: '#8A5F22',
  data: '#2E6E7E',
  alert: '#C1432A',
  onAlert: '#FFFFFF',
  error: '#B3261E',
  border: '#857F72',
  shadow: 'rgba(43, 41, 33, 0.12)',
};

export const darkColors: ColorTokens = {
  background: '#1A1B17',
  surface: '#262722',
  text: '#EDEAE1',
  textMuted: '#B8B4A8',
  primary: '#A7B98C',
  onPrimary: '#1A1B17',
  secondary: '#D9A75E',
  secondaryText: '#D9A75E',
  data: '#7DB8C7',
  alert: '#EE7A5F',
  onAlert: '#1A1B17',
  error: '#F2B8B5',
  border: '#807C72',
  // Más opaca que en claro: sobre un fondo oscuro, una sombra al 12 % no se ve (spec 014, D11).
  shadow: 'rgba(0, 0, 0, 0.5)',
};
