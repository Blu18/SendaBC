import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extiende app.json con la clave de Google Maps para Android (spec 006, plan D7). La clave vive
// en .env.local (ignorado por git, constitución 3.6); sin ella el build se arma igual y el mapa
// sale en blanco. Cambiarla requiere recompilar con `npx expo run:android`.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    [
      'react-native-maps',
      { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    ],
  ],
});
