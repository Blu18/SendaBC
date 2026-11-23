// Cámara del mapa de la grabación (spec 010, T9).

// Con más inclinación, las lomas tapan el trazo con frecuencia.
export const PITCH_3D = 55;

// Exageración del relieve en 3D, probada en la Sierra de Juárez (spec 010, T4). La comparten la grabación y los mapas de rutas, para que el
// terreno se vea igual en los dos (spec 015, plan D6).
export const TERRAIN_EXAGGERATION = 1.5;
export const ZOOM_FOLLOWING = 14;
export const ZOOM_OVERVIEW = 5.5;

// Los puntos llegan cada 2 a 10 s: la transición suaviza el salto del marcador (plan, R3).
export const CAMERA_MOVE_MS = 1000;

// Deja más mapa por delante de la posición que por detrás (Figma, spec 010). Es un margen de la
// cámara del mapa, no un espaciado de la interfaz.
export const LOOK_AHEAD_PADDING = { paddingTop: 110, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 };
