import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extiende app.json con la clave de Google Maps para Android (spec 006, plan D7). La clave vive
// en .env.local (ignorado por git, constitución 3.6); sin ella el build se arma igual y el mapa
// sale en blanco. Cambiarla requiere recompilar con `npx expo run:android`.
// El plugin de Mapbox va aquí porque `expo install` no escribe en una configuración dinámica
// (spec 010, T3). Su token se lee en lib/map/mapbox.ts y no hace falta recompilar para cambiarlo.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ['@rnmapbox/maps', { RNMapboxMapsVersion: '11.33.0' }],
    [
      'react-native-maps',
      { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    ],
    './plugins/withFontScaleConfigChange',
  ],
});
