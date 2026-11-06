import type { Theme } from '../theme';

// Estilos del mapa de la grabación, elegidos en la Sierra de Juárez (spec 010, plan D7). Outdoors
// trae curvas de nivel y sombreado. Dark no muestra el relieve por sí solo, así que se le agrega
// un sombreado calculado con los mismos datos de relieve.
export function mapStyle(scheme: Theme['scheme']) {
  return scheme === 'dark'
    ? {
        styleURL: 'mapbox://styles/mapbox/dark-v11',
        hillshade: {
          hillshadeShadowColor: '#000000',
          hillshadeHighlightColor: '#7f9488',
          hillshadeAccentColor: '#2c3a33',
          hillshadeExaggeration: 0.9,
        },
      }
    : { styleURL: 'mapbox://styles/mapbox/outdoors-v12', hillshade: null };
}

// Estilo mínimo para cuando no se puede cargar el normal (spec 010, CA-15). No usa la red: solo un
// fondo liso, sobre el que se siguen dibujando el trazo y la posición.
export function localMapStyle(background: string) {
  return JSON.stringify({
    version: 8,
    sources: {},
    layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': background } }],
  });
}
