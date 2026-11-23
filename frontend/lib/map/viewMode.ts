// Vistas del mapa de grabación (spec 010, CA-10). "Sin mapa" existe solo para medir la batería
// (spec 011, CA-8, RN-7): aparece con EXPO_PUBLIC_BATTERY_TEST=1, que solo define el build de campo.
export type MapViewMode = '3D' | '2D' | 'none';

export function batteryTestDe(valor: string | undefined): boolean {
  return valor === '1';
}

// Expo solo reemplaza la variable si se lee con este nombre exacto.
export const BATTERY_TEST = batteryTestDe(process.env.EXPO_PUBLIC_BATTERY_TEST);

// El botón muestra la vista a la que se cambia: 3D → 2D → 3D, o 3D → 2D → Sin mapa → 3D si se
// permite "Sin mapa". Solo la grabación lo permite, y solo en la prueba de batería (spec 011,
// RN-7); los mapas de rutas nunca (spec 015, plan "Pantallas y navegación").
export function siguienteVista(view: MapViewMode, allowNone: boolean): MapViewMode {
  if (view === '3D') return '2D';
  if (view === '2D' && allowNone) return 'none';
  return '3D';
}

export function etiquetaDeVista(view: MapViewMode): string {
  return view === 'none' ? 'Sin mapa' : view;
}
