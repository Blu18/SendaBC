import Mapbox from '@rnmapbox/maps';

// Configuración global de Mapbox, para el mapa de la grabación (spec 010, plan D4 y D5). El token
// público vive en .env.local (constitución 3.6). Sin él, el mapa falla al cargar y la grabación
// sigue igual (spec 010, RN-2).
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

// El proveedor solo debe recibir la zona visible, no datos de uso (spec 010, D5).
Mapbox.setTelemetryEnabled(false);
