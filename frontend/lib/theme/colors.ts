// Paleta de SendaBC. Usa estos nombres en lugar de valores hex sueltos.
export const colors = {
  background: '#EDEAE1', // Polvo de granito — fondo
  text: '#2B2A26', // Roca sombra — texto
  primary: '#5C6B49', // Chaparral — primario (botones, encabezados)
  secondary: '#A9762F', // Ocre de sendero — secundario / acentos
  data: '#2E6E7E', // Azul Pacífico — datos y mapa (métricas, recorrido)
  alert: '#C1432A', // Alerta — SOLO seguridad (inactividad, SOS); no usar para errores de formulario

  // Tonos que ya usaba la app, fuera de la paleta base
  textMuted: '#444444', // texto de inputs
  primaryDark: '#38412c', // borde/texto de BgBtn
  error: '#B3261E', // errores de validación de formularios
} as const;
