import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extiende app.json con los plugins nativos. Desde la spec 013 todos los mapas son de Mapbox: ya
// no hay clave de Google Maps.
// El plugin de Mapbox va aquí porque `expo install` no escribe en una configuración dinámica
// (spec 010, T3). Su token se lee en lib/map/mapbox.ts y no hace falta recompilar para cambiarlo.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ['@rnmapbox/maps', { RNMapboxMapsVersion: '11.33.0' }],
    './plugins/withFontScaleConfigChange',
  ],
});
