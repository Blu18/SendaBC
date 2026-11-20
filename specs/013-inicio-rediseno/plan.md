# 013 — Plan técnico

Spec: [spec.md](spec.md)

## Resumen

Se trabaja en cuatro fases, en este orden:

- **Fase A, Figma.** La propuesta D · A + C ([lienzo](https://claude.ai/artifact/9JEBgHotaEnwPYLK5HvDeh)) se pasa al archivo [SendaBC — Diseño](https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX), en modo claro y oscuro y con sus estados. El usuario la aprueba antes de programar Inicio (CA-26).
- **Fase B, backend.** `GET /routes/nearby` acepta un `limit` opcional. Se agrega `GET /routes/popular`. No hay migraciones.
- **Fase C, mapa de rutas.** Explorar rutas y el detalle de ruta cambian `react-native-maps` (Google) por `@rnmapbox/maps`, con el estilo y la detección de red del mapa de la grabación. Las zonas descargadas se ven sin red porque el SDK usa sus paquetes cuando el estilo coincide (CA-34). Al final se quita `react-native-maps` del proyecto (CA-33).
- **Fase D, Inicio.** Se reescribe `mainPage.tsx` con las secciones de la propuesta D. Mis actividades y el total de 7 días se leen de SQLite. Las rutas cercanas y populares vienen de la API, sin guardarse en el teléfono. "Cerrar sesión" pasa al perfil.

## Verificación contra la constitución

- [x] **Art. 1 La spec primero:** spec aprobada el 2026-11-20. Este plan se revisa antes de implementar.
- [x] **Art. 2 Offline-first:** Inicio solo lee SQLite para la acción de empezar, Mis actividades, el total de 7 días y las actividades sin subir (CA-21). Nada de Inicio cambia el estado de una actividad (RN-1). Las rutas de Inicio no escriben en la caché de rutas sin conexión de la 011, para no reemplazar la última búsqueda de Explorar (011, RN-14; D6).
- [x] **Art. 3 Seguridad y privacidad:** los dos endpoints usan `JwtAuthGuard` y toman el usuario del token (3.3). `popular` devuelve el número de favoritas, nunca quién las guardó (RN-8). La ubicación de Inicio solo se lee si el permiso ya está concedido; no se pide (CA-11, 3.5). Se usa como centro de la consulta y no se guarda. Las miniaturas piden a Mapbox solo una imagen del área. El recorrido del usuario se dibuja en el teléfono y no se envía (D3). La telemetría de Mapbox sigue apagada.
- [x] **Art. 4 Contratos de API:** `limit` se valida con class-validator en `NearbyQueryDto`. `popular` no recibe parámetros. Los errores son los mismos de siempre: `400`, `401` y `503`, con mensajes en español. Los dos endpoints se documentan abajo.
- [x] **Art. 5 Datos:** sin cambios en Prisma ni en SQLite. Mapbox usa `[longitud, latitud]` (5.2). La conversión vive en `lib/map/` y `lib/routes/geo.ts`.
- [x] **Art. 6 Verificación:** backend con Vitest y e2e con supertest. La lógica pura del frontend (totales, miniaturas, encuadres) con Vitest, y pantallas y dispositivo con casos manuales. Ver "Verificación". La colección de Postman se actualiza (6.3).
- [x] **Art. 7 Simplicidad y stack:** se agrega `react-native-svg` (D2) y se quita `react-native-maps` (D1). Esto requiere la constitución v1.10.
- [x] **Art. 8 Ritmo:** rama `013-inicio-rediseno`, que sale de `master`.

## Backend

### Endpoints

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/routes/nearby` (cambia) | JWT | Query actual (`lat`, `lng`, `radiusKm`, `type?`) más `limit?`: entero de 1 a 50, por defecto 50 | `200 NearbyRoute[]`, sin cambios en la forma | `400` (`"El límite debe estar entre 1 y 50"`), `401`, `503` |
| GET | `/routes/popular` (nuevo) | JWT | — | `200 PopularRoute[]`, como máximo 5 | `401`, `503` |

`PopularRoute`:

```json
{
  "id": "uuid",
  "name": "La Bufadora — Punta Banda",
  "type": "HIKING",
  "difficulty": "MODERATE",
  "region": "Ensenada",
  "distanceMeters": 7300,
  "elevationGainMeters": 410,
  "favoritesCount": 128,
  "isMine": false
}
```

- Solo entran rutas `PUBLISHED` con al menos una favorita (RN-5, CA-15). Si ninguna tiene favoritas, la respuesta es `[]` y la app oculta la sección.
- Orden: `favoritesCount` de mayor a menor y, si empatan, `createdAt` de la ruta de más reciente a más antigua (CA-14). La ruta se crea ya publicada, así que `createdAt` es la fecha en que se publicó.
- `favoritesCount` cuenta las filas de `route_favorites`. La llave primaria `(userId, routeId)` garantiza que cada cuenta cuenta una sola vez (RN-6). Al borrar una cuenta se borran sus favoritas en cascada.

### Módulos / archivos

- `backend/src/route/dto/nearby-query.dto.ts`: `limit` con `@IsOptional`, `@Type(() => Number)`, `@IsInt`, `@Min(1)` y `@Max(MAX_NEARBY_ROUTES)`.
- `backend/src/route/route.service.ts`:
  - `nearby` usa `LIMIT ${query.limit ?? MAX_NEARBY_ROUTES}`.
  - `popular(userId)` hace una consulta con `JOIN route_favorites`, `GROUP BY r.id`, `ORDER BY COUNT(*) DESC, r."createdAt" DESC` y `LIMIT 5` (constante `MAX_POPULAR_ROUTES`). El índice `route_favorites_routeId` ya existe.
- `backend/src/route/route.controller.ts`: `@Get('popular')`, declarado antes de `@Get(':id')` para que `popular` no se lea como un id.
- Pruebas: `route.service.spec.ts`, `nearby-query.dto.spec.ts` y `backend/test/route.e2e-spec.ts`.
- `backend/postman/SendaBC.postman_collection.json`: "Rutas populares" y "Rutas cercanas (limit)".

### Cambios de esquema (Prisma)

Ninguno.

## Prototipo en Figma (fase A)

En [SendaBC — Diseño](https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX) se agrega la pantalla Inicio, en modo claro y oscuro, con estas variantes (CA-26):

- Completa, como la propuesta D.
- Sin actividades, sin actividades en los últimos 7 días, sin rutas cerca y sin populares.
- Sin conexión, con las miniaturas sin fondo y las secciones de rutas con su aviso.
- Sin permiso de ubicación y sin contactos de emergencia.
- El perfil con "Cerrar sesión".

Se usan las variables y componentes de la 009. La aprobación se anota en el historial de la spec antes de programar `mainPage` (fase D). Las fases B y C pueden avanzar mientras tanto.

## Frontend

### Configuración

- `package.json`: se agrega `react-native-svg` con `npx expo install` (D2) y se quita `react-native-maps` (D1).
- `app.config.ts`: se quita el plugin de `react-native-maps` y la variable `GOOGLE_MAPS_ANDROID_API_KEY`, también de `.env.local` y del README del frontend.
- Requiere un development build nuevo (`expo prebuild --clean` y `expo run:android`), compilado desde la ruta corta `C:\dev\sbc`.

### Mapa de rutas (fase C)

- `components/map/RouteMap.tsx` (nuevo): `Mapbox.MapView` + `Camera` con `mapStyle(theme.scheme)`. Si no hay red (`useMapConnection`) y no carga el estilo, se usa `localMapStyle`, igual que en la grabación. El componente expone `fitBounds` y `centerOn` por ref, y `onCenterChanged` (desde `onMapIdle`). Va dentro de `MapErrorBoundary`.
- `pages/routes/exploreRoutesPage.tsx`:
  - Recorridos y marcadores en un `ShapeSource` de GeoJSON con `LineLayer` y `CircleLayer`. Tocar la capa (`onPress` del source con `hitbox` de 48 dp) llama a `seleccionar(id)`. Tocar el mapa vacío quita la selección (CA-8 de la 006).
  - La selección es un segundo `ShapeSource` encima, en el color `data`.
  - Se quita el truco de agregar solo al final, que era propio de `react-native-maps` en Android.
  - La posición del usuario es un `CircleLayer` con la ubicación que la página ya obtiene. No se usa `LocationPuck`, para no abrir otra escucha del GPS (D4).
  - "Buscar en esta zona", radio, tipo, sin permiso (todo Baja California) y sin conexión siguen igual. Solo cambia de dónde sale el centro del mapa (CA-31).
- `pages/routes/routeDetailPage.tsx`: el mismo `RouteMap`, con el recorrido completo y los puntos de inicio y final, encuadrado con `fitBounds` y margen (CA-32). Esto incluye las rutas guardadas sin conexión de la 011.
- `lib/routes/geo.ts`: `pathToCoordinates`, `regionForPath` y `regionAround` se reemplazan por `boundsForPath(path, start)` y `boundsAround(center, km)`, que devuelven `{ ne, sw }` en `[lng, lat]`. `BAJA_CALIFORNIA_REGION` pasa a `BAJA_CALIFORNIA_BOUNDS`, que también usan `RecordingMap` y `pickZonePage`. Se actualizan sus pruebas.
- Zonas descargadas: no hay código nuevo. Las zonas de la 011 se descargan con `ZONE_STYLES`, el mismo `styleURL` que usará `RouteMap`, y el SDK las usa sin red (CA-34). Se comprueba en dispositivo (M-casos). Se anota en el historial de la 011, RN-8.

### Pantallas y navegación (fase D)

- `pages/main/mainPage.tsx`, en el orden de la propuesta D:
  1. `ScreenHeader` con "Hola, {nombre}" y el avatar. Si el perfil falla, "Hola" y el avatar genérico (CA-23).
  2. `WeekSummary`: la distancia en grande con `typography.metric`, y abajo actividades, duración y elevación ganada (CA-6).
  3. `NearbyRoutesSection`: carrusel horizontal de hasta 5 tarjetas con miniatura. Cada tarjeta lleva nombre, tipo, dificultad, distancia y qué tan lejos está el inicio, y abre `RouteDetail`. "Ver mapa" abre la pestaña Rutas (CA-9 a CA-12, CA-16). Muestra un aviso cuando no hay permiso, no hay rutas o no hay conexión.
  4. `RecentActivitiesSection`: las 3 más recientes con miniatura, tipo, fecha, distancia y duración. Abren `ActivitySummary` con `origin: 'history'`, y "Ver todas" abre la pestaña Actividades (CA-3 a CA-5, CA-7).
  5. `PopularRoutesSection`: lista numerada con el número de favoritas. Se oculta si la respuesta viene vacía (CA-13 a CA-15).
  6. "Listo para salir": `SafetyCard` como hoy (CA-18), "N actividades sin subir" solo si hay alguna (CA-19) y "Mapas sin conexión" hacia `OfflineZones` (CA-20).
  7. Botón fijo "Empezar actividad", fuera del `ScrollView` y encima de la barra de pestañas. Navega a `Activity` (CA-1, CA-2).
- Componentes nuevos en `components/home/`: `WeekSummary`, `ActivityThumbnail`, `RouteCard` y `PopularRouteRow`. Las secciones usan `Appear` y respetan el movimiento reducido.
- `components/map/TrackThumbnail.tsx` (nuevo, D3): muestra un `Image` de la Static Images API de Mapbox (solo el área, por centro y zoom, en el estilo del tema) y encima un `Svg` + `Path` con el recorrido proyectado en el teléfono. Sin red, o si la imagen falla, queda el fondo liso `surface` con el recorrido (CA-8). Lleva `accessibilityLabel` con el tipo y la distancia (CA-28).
- `pages/account/profilePage.tsx`: botón "Cerrar sesión" al final, con el aviso de pendientes (CA-24, CA-25). La lógica sale de `mainPage` a `hooks/auth/useLogout.ts`.

### Hooks / estado / almacenamiento local

- `lib/db/activities.ts`:
  - `listRecentActivities(userId, limit)`: terminadas, `ORDER BY startedAt DESC LIMIT ?`.
  - `summarizeSince(userId, desdeIso)`: `COUNT`, `SUM(distanceMeters)`, `SUM(durationSeconds)` y `SUM(elevationGainMeters)` de las terminadas con `startedAt >= ?` (RN-2, RN-3). Se prueban en `activities.test.ts`.
- `lib/home/summary.ts` (puro): `inicioDeUltimos7Dias(ahora)` (RN-4) y el formato de la franja de totales con los formateadores de la 004.
- `lib/map/thumbnail.ts` (puro): encuadre en Web Mercator (centro y zoom que contienen el recorrido con margen), proyección a coordenadas del `Svg`, reducción a ≤ 200 puntos y la URL de la imagen estática. Se prueba con Vitest.
- `hooks/home/useHomeActivities.ts`: recientes, puntos de cada una (`getActivityPoints`), totales y pendientes. Recarga con `useFocusEffect`, como el historial.
- `hooks/home/useHomeRoutes.ts`:
  - `useNearbyHome()` lee el permiso con `getForegroundPermissionsAsync` y no lo pide. Con permiso, toma la posición como Explorar (`getLastKnownPositionAsync` o `getCurrentPositionAsync`) y consulta `nearby` con `radiusKm=25` y `limit=5`. Query key `['routes', 'home-nearby', userId]`.
  - `usePopularRoutes()`, con query key `['routes', 'popular', userId]`.
  - Ninguno escribe en `routeCache` (D6). Como sus keys empiezan con `['routes']`, `useRouteMutations` ya los invalida al guardar o quitar una favorita (CA-17). Se repiten al volver la red, como las demás consultas (011, F7; CA-22).
- `lib/routes/api.ts`: `fetchPopularRoutes` y el parámetro `limit` en `fetchNearbyRoutes`.
- Cambios a SQLite: ninguno.

## Decisiones

| # | Decisión | Alternativas consideradas | Motivo |
|---|---|---|---|
| D1 | Explorar y el detalle usan `@rnmapbox/maps` y se quita `react-native-maps` | Mantener Google en esas pantallas y Mapbox en la grabación | Lo pide la spec (HU-9, CA-33). Un solo proveedor deja un estilo, un token y un plugin nativo menos. Además, las zonas descargadas sirven sin red en esas pantallas (CA-34). |
| D2 | Se agrega `react-native-svg` (paquete de Expo, incluido en el SDK 57) | Dibujar el recorrido con `View` rotadas; un `MapView` de Mapbox por miniatura | Las miniaturas necesitan una línea con curvas sobre cualquier fondo, también sin red (CA-8). Seis `MapView` en una lista consumen memoria y batería. Las `View` rotadas no dan uniones limpias. Se agrega al stack en la constitución v1.10. |
| D3 | La miniatura es una imagen estática de Mapbox (solo el área) con el recorrido dibujado encima en el teléfono | Pedir la imagen con el recorrido incluido (overlay `path-` en la URL); sin fondo de mapa | Mandar el recorrido en la URL entregaría a Mapbox el trayecto de cada actividad del usuario (constitución 3.5). Pidiendo solo centro y zoom, Mapbox recibe lo mismo que con un mapa normal. El caché de imágenes de Android la reutiliza sin red. Si no está, se dibuja sin fondo (CA-8). |
| D4 | La posición del usuario en Explorar es una capa propia con la ubicación que ya obtiene la página | `Mapbox.LocationPuck` / `UserLocation` | El puck abre su propia escucha del GPS, y la 010 lo evitó por batería y por 3.5. Explorar ya obtiene una posición para buscar. |
| D5 | `limit` opcional en `nearby` en vez de un endpoint nuevo para Inicio | `GET /routes/nearby/home`; recortar a 5 en la app | Mismas reglas que Explorar (CA-9), sin duplicar la consulta y sin descargar 50 recorridos para mostrar 5. |
| D6 | Las rutas de Inicio no se guardan en la caché sin conexión | Guardarlas como búsqueda de Explorar | La 011 guarda solo la última búsqueda (RN-14). Si Inicio la reemplazara, Explorar perdería lo que el usuario consultó. La spec pide que estas secciones indiquen que falta conexión (CA-22). |
| D7 | El total de 7 días se suma en SQLite con las métricas guardadas | Sumar en JS sobre `listFinishedActivities` | Una consulta con `SUM` cumple el límite de 1 s con 200 actividades sin leer todas las filas (RNF de rendimiento). Las métricas no se recalculan (RN-3). |

## Verificación

| CA | Cómo |
|---|---|
| CA-9 a CA-17 (backend) | Vitest (`route.service.spec`, `nearby-query.dto.spec`) y e2e de `limit` y `popular`: orden, empate, solo `PUBLISHED`, `[]` sin favoritas y sin datos de quién guardó. Postman. |
| CA-3, CA-6, RN-2 a RN-4 | Vitest: `activities.test.ts` (`listRecentActivities` y `summarizeSince`) y `lib/home/summary.test.ts`. |
| CA-8, D3 | Vitest: `lib/map/thumbnail.test.ts` (encuadre, proyección, reducción y URL sin el recorrido). |
| CA-30 a CA-32 | Vitest de `geo.ts` (`boundsForPath` y `boundsAround`) y casos manuales que repiten M1 a M8 de la 006 y los de la 007 con el mapa nuevo. |
| CA-1 a CA-29, CA-33, CA-34 | Casos manuales en `tasks.md`, en el emulador y en el S9+: Inicio completo, vacío, sin red, sin permiso y con letra grande; lector de pantalla; modo oscuro; perfil y cierre de sesión; Explorar y el detalle sin red dentro de una zona descargada; `grep` de `react-native-maps` sin resultados. |

## Riesgos

- **R1, selección por toque en Mapbox:** tocar líneas delgadas puede ser difícil. Se mitiga con `hitbox` de 48 dp en el `ShapeSource` y probando en el teléfono real (CA-8 de la 006).
- **R2, imagen estática sin red:** el caché de imágenes puede descartarse. Por eso el respaldo de CA-8 siempre existe y la imagen nunca bloquea el render.
- **R3, cuota de la Static Images API:** cada Inicio pide hasta 8 imágenes (3 actividades y 5 rutas). El plan gratuito de Mapbox alcanza de sobra para la demo. Las URL son estables (el mismo recorrido da la misma imagen), así que el caché las reutiliza.
- **R4, development build nuevo:** quitar `react-native-maps` y agregar `react-native-svg` cambian el código nativo. Hay que recompilar desde `C:\dev\sbc` (ruta corta) antes de las pruebas en teléfonos.
- **R5, tiempo antes de la 012:** si la fase C se complica, Inicio (fase D) no depende de ella, salvo por el estilo de las miniaturas. Las fases pueden cerrar por separado.
