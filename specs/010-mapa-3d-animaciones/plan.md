# 010 — Plan técnico

Spec: [spec.md](spec.md)

## Resumen

Todo el trabajo es del frontend: no hay endpoints, migraciones ni cambios en SQLite. Se hace en tres fases, en este orden (RN-9, RN-10):

- **Fase A, Figma.** Se agrega al prototipo de la spec 009 la pantalla de grabación con el mapa y se aprueba (CA-19).
- **Fase B, mapa.** Empieza con una prueba técnica (T1 del plan, D2). Después, la pantalla de grabación muestra un mapa de Mapbox con relieve, alimentado **solo** por los puntos que la grabación ya guarda. El mapa no escucha el GPS por su cuenta, no escribe nada y vive aislado de la grabación: si falla, se queda sin mapa y nada más.
- **Fase C, animaciones.** Se usan `Animated` de React Native y las opciones de las librerías de navegación ya instaladas. No se agrega ninguna librería de animación.

## Verificación contra la constitución

- [x] **Art. 1 La spec primero:** spec aprobada el 2026-11-05. Este plan se revisa antes de implementar.
- [x] **Art. 2 Offline-first:** el mapa solo lee los puntos de SQLite y los eventos de la grabación. Sin red o con un fallo del mapa, la grabación sigue igual (CA-15 a CA-17). No se tocan los estados de la actividad.
- [x] **Art. 3 Seguridad y privacidad:** no se usa el seguimiento de ubicación del SDK, así que no se abre otra escucha del GPS (3.5, CA-8). La telemetría de Mapbox se apaga (D5). El token va en una variable de entorno (3.6, D4).
- [x] **Art. 4 Contratos de API:** no hay endpoints nuevos ni cambios en los existentes.
- [x] **Art. 5 Datos:** sin cambios en Prisma ni en SQLite. Mapbox usa `[longitud, latitud]`, igual que 5.2; la conversión desde los puntos locales vive en `lib/map/`.
- [x] **Art. 6 Verificación:** lógica pura con Vitest, y pantallas y dispositivo con casos manuales. Ver la tabla "Verificación".
- [x] **Art. 7 Simplicidad y stack:** una sola dependencia nueva, `@rnmapbox/maps`, justificada en D1. Hay que agregarla al stack en la constitución v1.8.
- [x] **Art. 8 Ritmo:** rama `010-mapa-3d-animaciones`, que sale de `master` después de fusionar la 009.

## Backend

Sin cambios.

### Endpoints

Ninguno.

### Módulos / archivos

Ninguno.

### Cambios de esquema (Prisma)

Ninguno.

## Prototipo en Figma (fase A)

En el archivo [SendaBC — Diseño](https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX) se agrega la pantalla de grabación en modo claro y oscuro, con estas variantes:

- Mapa 3D siguiendo al usuario, y mapa 2D.
- Mapa sin seguir al usuario, con el botón de volver a mi posición.
- Esperando señal GPS, sin conexión y mapa no disponible.
- Con hora de regreso, con alerta activa y con avisos, para decidir cómo caben en el panel inferior.

La aprobación del usuario se anota en el historial de la spec antes de programar `activityPage` (CA-19). La prueba técnica de D2 puede correr en paralelo, porque no toca esa pantalla.

## Frontend

### Configuración

- `package.json`: `@rnmapbox/maps` (última versión revisada: 10.3.17, con Mapbox Maps SDK 11.33).
- `app.config.ts`: plugin `@rnmapbox/maps` con `RNMapboxMapsVersion`. Junto al de `react-native-maps`, que sigue para "Explorar rutas" y el detalle.
- `.env.local` (ignorado por git): `EXPO_PUBLIC_MAPBOX_TOKEN`. El build no pide token de descarga (T3).
- Requiere un development build nuevo (`expo prebuild --clean` y `expo run:android`).

### Pantallas y navegación

**`pages/activity/activityPage.tsx`.** Antes de iniciar no cambia. Durante la grabación:

- Arriba, `RecordingMap` con `flex: 1` (CA-6). La alerta activa y "Cancelar alerta" van encima del mapa (T1).
- Debajo, el panel con las métricas, la hora de regreso y los avisos, en un `ScrollView` de 280 dp como máximo (T1), para que el mapa conserve espacio con letra grande.
- Abajo, los controles actuales, sin cambios.
- Los chips de tipo no se muestran mientras se graba: ya están deshabilitados y el tipo sale en el título.
- `RecordingMap` solo se monta con `status === 'recording'` (CA-8, RN-1).

**`components/map/RecordingMap.tsx`.** Componente nuevo, envuelto en `MapErrorBoundary`.

- `Mapbox.MapView`, `Camera`, `ShapeSource` y `LineLayer` para el trazo, y `SymbolLayer` con `iconOcclusionOpacity` para la posición, para que siga visible detrás de una loma (T9). **No** se usa `UserLocation` ni `followUserLocation`, porque abrirían otra escucha del GPS.
- La cámara se mueve por código con cada punto: centro, rumbo (D6), inclinación y zoom. Mientras `siguiendo` es falso, no se mueve (CA-13).
- 3D: `RasterDemSource` (`mapbox.mapbox-terrain-dem-v1`, `tileSize` 514) y `Terrain` con exageración 1.5, e inclinación de 55° (T9). 2D: sin `Terrain` e inclinación 0 (CA-11). Zoom 14 (T9). El trazo y la posición usan un color claro en modo oscuro. El cambio conserva posición, trazo y `siguiendo` (CA-10). La vista vive en el estado del componente y empieza en 3D (CA-12).
- Controles sobre el mapa (48 dp y etiqueta de accesibilidad, RN-8): `MapViewToggle` para la vista 3D/2D, e `IconButton` para volver a mi posición. Este último solo aparece si `siguiendo` es falso (CA-14).
- El logo y la atribución de Mapbox se conservan, porque sus términos los piden, y se colocan donde no tapen los controles.
- Sin puntos todavía: encuadre de `BAJA_CALIFORNIA_REGION` (spec 006) sin marcador, con el aviso de CA-5.

**`components/map/MapErrorBoundary.tsx`.** Atrapa un error de render del mapa y muestra el aviso "Mapa no disponible", sin afectar al resto de la pantalla (CA-17, RN-2).

**Sin conexión (CA-15, CA-16).** La falta de red se detecta con `expo-network`, porque una zona ya vista carga de la caché sin error (T4). Sin red se muestra el aviso y se conserva el estilo si ya cargó. Si el estilo falla (`onMapLoadingError`), el `MapView` cambia a un estilo local mínimo con `styleJSON`, solo con un fondo del color del tema, sobre el que se siguen dibujando el trazo y la posición. Al volver la red, regresa al estilo normal.

### Animaciones (fase C)

**Tokens.** `lib/theme/motion.ts`, sin imports de React Native: `motion.press`, `motion.release`, `motion.content` y `motion.screen`, todos de 300 ms o menos (RN-5). Se exponen en `Theme`, como el resto del sistema de diseño (spec 009, CA-10).

**`hooks/theme/useReducedMotion.ts`.** Lee `AccessibilityInfo.isReduceMotionEnabled` y escucha `reduceMotionChanged`. También expone `getReducedMotion()` para las opciones de navegación, que no pueden usar hooks. Con la opción activa, las duraciones son 0 y no hay desplazamiento (CA-27).

**Toques (CA-20 a CA-22).** `components/ui/PressableScale.tsx` envuelve `Pressable`: escala a 0.97 y anima la capa de presionado, con `useNativeDriver`, usando `onPressIn` y `onPressOut`. `onPress` no se toca, así que la acción no espera a la animación, y un `Pressable` deshabilitado no recibe esos eventos. La escala no cambia el área de toque. Se migran los ocho componentes con elementos táctiles: `BaseBtn`, `Card`, `Chip`, `IconButton`, `SosButton`, `TabBar`, la fila de `activityHistoryPage` y `MapViewToggle`, que se creó en T11.

**Pantallas (CA-23).** `RootStack` lleva `animation: 'slide_from_right'` en `screenOptions`. Es una transición nativa, y la vuelta con el botón o con el gesto del sistema va en sentido contrario.

**Pestañas (CA-24).** `HomeTabs` usa la opción `animation: 'fade'` de `bottom-tabs`, o `'none'` con movimiento reducido. En `TabBar`, el indicador de la pestaña activa aparece y desaparece animado.

**Contenido (CA-25).** `components/ui/Appear.tsx` hace la entrada (opacidad y 8 dp de desplazamiento) y retrasa el desmontaje para la salida. Se usa en `Notice`, en `Card` y en las filas de las listas, sin efecto escalonado, para respetar RN-5. En `Chip`, el fondo seleccionado es una capa que cambia de opacidad.

**"¿Estás bien?" (CA-26).** `AreYouOkModal` ya entra con `animationType="slide"` y sus botones funcionan desde el primer momento. Solo se agrega `animationType="none"` con movimiento reducido.

### Hooks / estado / almacenamiento local

- `hooks/activity/activityMap.hook.ts` — `useActivityMap(activityLocalId, recording)`. Separado de `useActivityTracker` para que un fallo del mapa no toque la grabación (RN-2). Carga los puntos con `getActivityPoints`, se suscribe a `onGrabacion` (ya admite varios oyentes) y vuelve a leer SQLite cuando `AppState` pasa a `active` (CA-7). Devuelve el trazo, la posición y el rumbo.
- `hooks/map/useMapConnection.ts` — estado de la red con `expo-network`, para CA-15 y CA-16.
- `lib/map/track.ts` — lógica pura: convierte puntos en un trazo GeoJSON. Descarta los imprecisos y, tras un salto de ubicación, empieza un segmento nuevo, para no dibujar una línea por donde no se pasó (RN-3).
- `lib/map/heading.ts` — lógica pura: rumbo entre posiciones (D6).
- `lib/map/liveMap.ts` — lógica pura: une trazo y rumbo, y evita contar dos veces un punto al releer SQLite (T8).
- `lib/metrics/distance.ts` — se exportan las reglas de punto impreciso y de salto, para que el trazo y la distancia usen las mismas (RN-3). La distancia no cambia.
- Cambios a SQLite: ninguno.

## Decisiones

| # | Decisión | Alternativas consideradas | Motivo |
|---|---|---|---|
| D1 | Mapa de grabación con Mapbox, mediante `@rnmapbox/maps`. Nueva dependencia del stack (constitución v1.8) | Google Immersive Maps (Maps 3D SDK); Google Photorealistic 3D Tiles; `react-native-maps` inclinado; MapLibre | Es la única opción revisada que da relieve, modo oscuro, paquete para React Native y plugin de Expo. Immersive Maps cubre México, pero no tiene paquete directo (habría que escribir un módulo nativo), y su documentación no confirma modo oscuro ni uso sin conexión. 3D Tiles exige integrar un visor. `react-native-maps` no da relieve (CA-1). En MapLibre no pude confirmar el relieve en móvil. |
| D2 | Prueba técnica antes de programar: rama desechable con mapa, relieve, cámara, estilo oscuro y estilo local, en el emulador con la zona de la Sierra de Juárez | Implementar directamente | Hay puntos sin confirmar en la documentación: compatibilidad con RN 0.86, Expo 57 y la nueva arquitectura, y los detalles marcados en "Riesgos". Si falla, se vuelve a este plan antes de seguir. |
| D3 | `react-native-maps` se queda en "Explorar rutas" y el detalle | Migrar todos los mapas a Mapbox | La spec deja esas pantallas fuera. Migrarlas arriesga casos ya verificados de las specs 006 y 007. |
| D4 | Token público de Mapbox en `EXPO_PUBLIC_MAPBOX_TOKEN`, nunca en el repositorio. El build no pide token de descarga (T3) | Escribir el token en `app.json` | Constitución 3.6. El token público está pensado para ir en la app; el secreto no debe ir en ella. |
| D5 | Telemetría de Mapbox apagada al arrancar | Dejar el valor por defecto | La spec solo admite que el proveedor reciba la zona visible. Se confirma en la prueba técnica. |
| D6 | Rumbo calculado a partir de los puntos guardados, con al menos 10 m entre las posiciones comparadas, y conservando el último al detenerse | Brújula del teléfono; rumbo que reporta el GPS | Es lógica pura y comprobable con Vitest. Cumple CA-3 ("dirección en la que avanzo") y no agrega sensores ni consumo. La brújula muestra hacia dónde apunta el teléfono, no hacia dónde se avanza. |
| D7 | Outdoors v12 en modo claro, y Dark v11 con `HillshadeLayer` en modo oscuro 3D, según `theme.scheme` (resultado de T4 y T11) | Standard con preset de día y de noche; Dark v11 solo | En la Sierra de Juárez, Standard casi no muestra el relieve de noche y Dark solo no lo muestra. Outdoors agrega curvas de nivel, útiles en la sierra (CA-1, CA-9). |
| D8 | Animaciones con `Animated` de React Native y opciones de React Navigation | `react-native-reanimated` | La constitución pide lo más simple (7.2). Estas animaciones son de opacidad y escala, y corren en el hilo nativo sin otra dependencia. |
| D9 | Sin mapas descargados en esta spec; sin red se dibuja el trazo sobre un fondo liso | Descargar la zona al iniciar | La spec lo deja para 011-estabilidad. Mapbox tiene paquetes sin conexión, lo que deja lista esa opción. |

## Verificación

| CA | Cómo se verifica |
|---|---|
| CA-3 (cálculo del rumbo) | Vitest en `lib/map/heading.test.ts` |
| CA-4 y RN-3 (trazo y filtrado) | Vitest en `lib/map/track.test.ts` |
| RN-5 (máximo de 300 ms) | Vitest sobre `lib/theme/motion.ts`; caso manual para las transiciones nativas |
| CA-19 | Revisión documentada del archivo de Figma y aprobación en el historial |
| CA-1 a CA-18 | Casos manuales en el emulador con `adb emu geo fix` y modo avión. CA-1 y CA-9 se repiten en un teléfono real si el emulador no dibuja bien el relieve |
| CA-20 a CA-26 | Casos manuales en el emulador |
| CA-27 | Caso manual con `transition_animation_scale`, `animator_duration_scale` y `window_animation_scale` en 0, como hace "Quitar animaciones". React Native solo lee el primero (T18) |
| CA-28 | Repetir los casos manuales de las specs 001 a 009 |
| Batería | Se mide en 011-estabilidad (spec, requisitos no funcionales) |

## Riesgos

- **R1 — Compatibilidad.** Resuelto: compila y corre con RN 0.86, Expo 57 y la nueva arquitectura (T3 y T4). La documentación pide RN 0.79 o más y Expo 47 o más, pero sus versiones de desarrollo son RN 0.81 y Expo 54; la app usa RN 0.86, Expo 57 y la nueva arquitectura. El soporte de Fabric se deduce de las notas de versión, no está declarado. Si no compila, D2 lo detecta antes de tocar la app. La salida sería un módulo nativo para Immersive Maps, con más trabajo y revisando CA-9.
- **R2 — Puntos sin confirmar en la documentación.** Resuelto en T4: datos de relieve, estilo local, detección de gestos y telemetría. El preset de noche de Standard se descartó (D7).
- **R3 — Actualización cada 10 s.** Con el permiso en segundo plano, la tarea pide un punto cada 10 s (`INTERVALO_MS`, spec 008), así que el marcador avanza a saltos, sobre todo en bicicleta. RN-1 impide cambiar esa frecuencia. La cámara se mueve con una transición suave y se revisa en el emulador si el resultado es aceptable.
- **R4 — Duración de las transiciones nativas.** En Android, la duración del stack nativo puede no ser configurable y superar los 300 ms de RN-5. Se mide en la fase C. Si no se cumple, se elige otra transición o se anota la diferencia para que el usuario decida.
- **R5 — Fallo nativo del mapa.** `MapErrorBoundary` solo atrapa errores de JavaScript. Si el SDK cierra la app, los puntos ya están en SQLite y la actividad se recupera como en la spec 003 (CA-10), pero esa grabación termina. Se vigila en la prueba de campo de la 011.
- **R6 — Actividades largas.** El trazo se reenvía completo con cada punto. Unas horas de actividad son miles de puntos, y se espera que no sea un problema. Si la pantalla se traba, se simplifica el trazo dibujado, sin tocar lo guardado.
- **R7 — Cuenta de Mapbox.** El usuario debe crear la cuenta y el token antes de D2. El plan gratuito cubre 25,000 usuarios activos al mes, así que el costo esperado es $0; falta confirmar si pide tarjeta.
- **R8 — Calidad del relieve.** El relieve se ve bien en la sierra en el emulador (T4). Falta confirmar el rendimiento en un teléfono real. Con el mapa girado, una loma puede tapar parte del trazo; es normal en 3D y el 2D lo evita.
