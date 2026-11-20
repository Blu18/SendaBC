# 013 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de `frontend/lib/` sin imports de React Native incluyen sus pruebas Vitest (constitución 6.1).

Una tarea detiene el trabajo: T2. `mainPage` (T22) no se programa hasta que el usuario apruebe Inicio en Figma (CA-26). Mientras tanto pueden avanzar el backend (fase B) y el mapa (fase C). Las fases C y D pueden cerrarse por separado (plan, R5).

## Antes de empezar (lo hace el usuario)

- Actualizar el `master` local y crear la rama `013-inicio-rediseno`.
- Tener sesión de Figma conectada al MCP.
- Confirmar que `frontend/.env.local` tiene `EXPO_PUBLIC_MAPBOX_TOKEN` (spec 010). El token público también sirve para la Static Images API.

## Fase A — Prototipo en Figma

- [x] T1 — En "SendaBC — Diseño", agregar Inicio según la propuesta D · A + C, en modo claro y oscuro, con variables y componentes de la 009. Variantes: completa; sin actividades; sin actividades en 7 días; sin rutas cerca; sin populares; sin conexión (miniaturas sin fondo y avisos en las secciones de rutas); sin permiso de ubicación; sin contactos. Agregar el perfil con "Cerrar sesión". (CA-26)

  Hecho (2026-11-20): sección [Inicio (spec 013)](https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX?node-id=57-3359) en la página Pantallas. Tiene 9 marcos por modo (18 en total): las 8 variantes de Inicio y "Perfil — cerrar sesión". Los marcos de Inicio muestran la pantalla completa con desplazamiento, entre 1 362 y 1 780 de alto. Componentes nuevos en Sistema de diseño, sección "Inicio (spec 013)": `Miniatura de recorrido` (Fondo=Mapa y Fondo=Liso), `Resumen de 7 días`, `Tarjeta de actividad reciente`, `Tarjeta de ruta cercana`, `Fila de ruta popular`, `Fila de preparación` y `Barra de empezar`. Todos usan las variables de color, espaciado y radio, y los estilos de texto de la 009. Notas:
  - Los recorridos de las miniaturas son una ilustración: todas las instancias muestran la misma forma.
  - "Sin conexión" también muestra el saludo genérico de CA-23.
  - Los textos de los avisos son propuesta: "Activa tu ubicación para ver rutas cerca", "No hay rutas publicadas cerca de ti", "Las rutas necesitan conexión" y "Sin contactos de emergencia".
- [x] T2 — Presentar el prototipo al usuario y anotar su aprobación en el historial de la spec. (CA-26)

## Fase B — Backend

- [x] T3 — `NearbyQueryDto`: `limit` opcional, entero de 1 a 50 (por defecto 50), con mensaje en español. `RouteService.nearby` lo usa en el `LIMIT`. Pruebas en `nearby-query.dto.spec.ts` y `route.service.spec.ts`. (CA-9)

  Hecho: la regla es un solo `@IsIn` de 1 a 50 con el mensaje "El límite debe ser un entero entre 1 y 50", para que un valor como `cinco` no repita tres mensajes. `MAX_NEARBY_ROUTES` ahora es `MAX_NEARBY_LIMIT`, del DTO.
- [x] T4 — `RouteService.popular(userId)` y `GET /routes/popular`, declarado antes de `GET /routes/:id`. Solo rutas `PUBLISHED` con al menos una favorita, ordenadas por `favoritesCount` y, si empatan, por `createdAt` descendente, como máximo 5 (`MAX_POPULAR_ROUTES`). Devuelve la forma `PopularRoute` del plan, sin datos de quién guardó. Pruebas en `route.service.spec.ts` y `route.controller.spec.ts`. (CA-13, CA-14, CA-15, RN-5, RN-6, RN-8)

  Hecho: `COUNT(*)::int`, porque PostgreSQL devuelve `bigint` y Prisma lo convertiría en `BigInt`, que no se puede serializar a JSON. Las rutas del propio usuario entran, con `isMine`. Las pruebas unitarias revisan la consulta. Que corra bien en PostgreSQL se comprueba en el e2e (T5).
- [x] T5 — E2e en `test/route-home.e2e-spec.ts`:
  - `nearby` con `limit=5` devuelve 5 y `limit=0` o `limit=51` dan `400`;
  - `popular` respeta el orden, el empate, excluye archivadas y sin favoritas, da `[]` sin favoritas y `401` sin token;
  - el número de favoritas cambia al guardar o quitar una favorita. (CA-9, CA-13, CA-14, CA-15, CA-17)

  Hecho (2026-11-20): archivo nuevo `test/route-home.e2e-spec.ts`, con 8 pruebas, contra Supabase. Pasa solo y en la suite completa (`npm run test:e2e`: 8 archivos, 96 pruebas).
  - Como las populares son de todo el estado (RN-6), la base puede tener otras rutas con favoritas. Por eso la prueba lee cuántas tiene la más guardada y crea 3 cuentas más que esa, para que sus rutas queden arriba.
  - "`[]` sin favoritas" no se puede probar contra la base compartida. Se cubre con la prueba unitaria del `JOIN` y aquí con que una ruta sin favoritas no aparece.
- [x] T6 — Colección de Postman: "Rutas populares" y "Rutas cercanas (limit)". Correrla contra el backend local (constitución 6.3). (CA-9, CA-13)

  Hecho (2026-11-20): carpeta "Inicio (spec 013)" después de "Publicar rutas (spec 007)", con 4 peticiones: "Rutas cercanas con límite", "Límite fuera de rango (400)", "Rutas populares" y "Rutas populares sin token (401)". Se corrió la colección completa, en orden, contra la API local con un ejecutor en Node, como en la 007 y la 008, porque `newman` no está instalado: 133 de 141 pruebas pasan y la carpeta nueva pasa entera. Las 8 que fallan son de "Seguridad (spec 008)": el secreto del webhook no coincide y el `.env` no tiene `TELEGRAM_MODE=log`, que esa carpeta necesita. No se forzó, porque en modo real se enviarían mensajes de Telegram. Conviene correrla también en Postman.

## Fase C — Mapa de rutas con Mapbox

- [x] T7 — `lib/routes/geo.ts`: `boundsForPath(path, start)` y `boundsAround(center, km)` en `[lng, lat]`, en lugar de `regionForPath`, `regionAround` y `pathToCoordinates`. `BAJA_CALIFORNIA_BOUNDS` en `constants.ts`; ajustar `RecordingMap` y `pickZonePage`. Actualizar `geo.test.ts`. (CA-31, CA-32)

  Hecho: `boundsForPath`, `boundsAround`, el tipo `Bounds`, `BAJA_CALIFORNIA_BOUNDS` y `BAJA_CALIFORNIA_CENTER`. `RecordingMap` y `pickZonePage` usan el centro nuevo. Cambio de orden: Explorar y el detalle todavía usan `pathToCoordinates`, `regionForPath`, `regionAround` y `BAJA_CALIFORNIA_REGION`, así que se conservan y se quitan en T9 y T10, cuando ya no los use nadie. `boundsForPath` y `boundsAround` reutilizan el cálculo de `regionForPath` y `regionAround`, que en T9 y T10 dejan de exportarse y quedan internas.
- [x] T8 — `components/map/RouteMap.tsx`:
  - `Mapbox.MapView` + `Camera` con `mapStyle(theme.scheme)`;
  - el respaldo `localMapStyle` sin red, con `useMapConnection`;
  - `fitBounds` y `centerOn` por ref, y `onCenterChanged` desde `onMapIdle`;
  - va dentro de `MapErrorBoundary`. (CA-30, CA-34)

  Hecho:
  - El componente expone por ref solo `fitBounds(bounds, padding)`. No hizo falta `centerOn`: Explorar centra con `fitBounds(boundsAround(...))`.
  - Sus props: `initialBounds`, `onCenterChanged` (desde `onMapIdle`), `onPress`, `onReady` (desde `onDidFinishLoadingMap`) y `children` para las capas.
  - Es un mapa plano: sin sombreado, inclinación ni brújula, como la grabación en 2D.
  - No muestra avisos de conexión propios, porque Explorar y el detalle ya tienen los suyos.
  - `MapErrorBoundary` acepta un `notice`, y el mapa de rutas usa `ROUTE_MAP_UNAVAILABLE` en lugar del texto de la grabación.
  - Sin probar todavía en el dispositivo: se comprueba al usarlo en T9 y T10 (M10 a M12).
- [x] T9 — `exploreRoutesPage` con `RouteMap`:
  - recorridos y marcadores en un `ShapeSource` con `LineLayer` y `CircleLayer` (`hitbox` de 48 dp);
  - la selección en un `ShapeSource` aparte, en el color `data`; tocar el mapa vacío la quita;
  - la posición del usuario como capa propia (D4);
  - se quita el truco de agregar solo al final;
  - "Buscar en esta zona", radio, tipo, sin permiso y sin conexión siguen igual. (CA-30, CA-31, CA-34)

  Hecho:
  - Las capas salen de `lib/routes/mapFeatures.ts` (`routeLines`, `routeStarts`, `pointFeature` y `touchedRouteId`), con pruebas en `mapFeatures.test.ts`.
  - Los colores usan el tema, porque el mapa ahora cambia con el modo. Antes eran siempre los del modo claro, porque el mapa de Google no cambiaba.
  - Se conserva el margen de 300 ms entre tocar una ruta y tocar el mapa vacío, por si Mapbox entrega los dos toques.
  - Se quitaron `BAJA_CALIFORNIA_REGION` y la exportación de `regionAround`. `pathToCoordinates` y `regionForPath` siguen hasta T10.
  - Sin probar en el dispositivo (M10). El development build actual ya trae Mapbox (spec 010), así que Explorar se puede probar sin recompilar.
- [x] T10 — `routeDetailPage` con `RouteMap`: el recorrido completo, los puntos de inicio y final, y `fitBounds` con margen. Incluye las rutas guardadas sin conexión (011). (CA-30, CA-32, CA-34)

  Hecho:
  - El mapa del detalle se llama ahora `RouteDetailMap`, para no chocar con `RouteMap`. Dibuja la línea en `data`, el inicio en `primary` y el final en `secondary`, con los colores del tema.
  - El encuadre inicial es `boundsForPath`, que ya trae el margen, así que no se vuelve a encuadrar al cargar. Con Google había que hacerlo en Android (M4 de la 007).
  - Cambios visibles: el final es un círculo y no un cuadrado redondeado, porque `CircleLayer` no hace cuadrados. Ya no sale la etiqueta "Inicio" o "Final" al tocar un marcador; el mapa se describe con su `accessibilityLabel`.
  - Se conserva el alto de 280.
  - Se quitaron `pathToCoordinates` y la exportación de `regionForPath`: ya ningún archivo de código importa `react-native-maps`.
  - Sin probar en el dispositivo (M11, M12).
- [ ] T11 — Quitar `react-native-maps`: dependencia, plugin en `app.config.ts`, `GOOGLE_MAPS_ANDROID_API_KEY` en `.env.local` y en el README del frontend. Comprobar con `grep -r "react-native-maps" frontend --exclude-dir=node_modules` y compilar un development build nuevo desde `C:\dev\sbc`. (CA-33)

  Avance (2026-11-20), código hecho y build pendiente:
  - Se desinstaló `react-native-maps` y se quitaron el plugin de `app.config.ts` y la línea `GOOGLE_MAPS_ANDROID_API_KEY` de `.env.local`. El README del frontend no la mencionaba.
  - El `grep` no encuentra `react-native-maps` fuera de `node_modules`, `.expo` y `android`. `tsc` no da errores y pasan 788 pruebas.
  - Falta el development build: `C:\dev\sbc` tiene cambios sin commit de la 011 sobre `cdb2440` y no había un dispositivo conectado.
- [ ] T12 — Docs: constitución v1.10 (quita `react-native-maps`, agrega `react-native-svg` al stack, con entrada en su historial). Nota en el historial de la 011 (RN-8 ampliada por la 013, CA-34) y de las specs 006 y 007 (el mapa cambia de proveedor; los CA no cambian, RN-9). (CA-33, CA-34)

## Fase D — Inicio

- [ ] T13 — `lib/db/activities.ts`: `listRecentActivities(userId, limit)` y `summarizeSince(userId, desdeIso)` (conteo y sumas de distancia, duración y elevación ganada; solo terminadas y del usuario). Pruebas en `activities.test.ts`: excluye la actividad en grabación y las de otra cuenta, incluye las subidas y las pendientes, y considera el límite de 7 días. (CA-3, CA-6, RN-2, RN-3)
- [ ] T14 — `lib/home/summary.ts`: `inicioDeUltimos7Dias(ahora)` (7 × 24 h) y el formato de la franja de totales con los formateadores de la 004, con totales en cero. Pruebas en `summary.test.ts`. (CA-6, RN-4)
- [ ] T15 — `lib/map/thumbnail.ts`: encuadre Web Mercator (centro y zoom con margen), proyección a coordenadas del `Svg`, reducción a ≤ 200 puntos y URL de la Static Images API **sin** el recorrido. Pruebas en `thumbnail.test.ts`, incluido un recorrido de un solo punto y uno recto. (CA-3, CA-8)
- [ ] T16 — `lib/routes/api.ts`: `fetchPopularRoutes` y el parámetro `limit` en `fetchNearbyRoutes`. Pruebas en `api.test.ts`. (CA-9, CA-13)
- [ ] T17 — Instalar `react-native-svg` con `npx expo install`. `components/map/TrackThumbnail.tsx`: imagen estática del tema y el recorrido en `Svg` encima. Sin red o si la imagen falla, fondo liso `surface` con el recorrido. Lleva `accessibilityLabel`. (CA-3, CA-8, CA-28)
- [ ] T18 — `hooks/home/useHomeActivities.ts`: las 3 recientes con sus puntos, los totales de 7 días y los pendientes, con recarga en `useFocusEffect`. (CA-3, CA-6, CA-7, CA-19, CA-21)
- [ ] T19 — `hooks/home/useHomeRoutes.ts`:
  - `useNearbyHome` lee el permiso sin pedirlo, toma la posición como Explorar y consulta con `radiusKm=25` y `limit=5`;
  - `usePopularRoutes`;
  - keys `['routes', 'home-nearby' | 'popular', userId]`, que no escriben en `routeCache` (D6). (CA-9, CA-11, CA-13, CA-17, CA-22)
- [ ] T20 — `hooks/auth/useLogout.ts` con el aviso de pendientes, sacado de `mainPage`. Botón "Cerrar sesión" al final de `profilePage`. (CA-24, CA-25)
- [ ] T21 — Componentes en `components/home/`:
  - `WeekSummary`;
  - `ActivityCard`, con miniatura, tipo, fecha, distancia y duración;
  - `RouteCard`, para el carrusel de cercanas;
  - `PopularRouteRow`, con número y favoritas.

  Cada uno con nombre accesible. (CA-3, CA-6, CA-9, CA-13, CA-28)
- [ ] T22 — Reescribir `pages/main/mainPage.tsx` según el diseño aprobado. En este orden: saludo y avatar (genéricos si falla el perfil); `WeekSummary`; Cerca de ti, con "Ver mapa" y avisos de sin permiso, sin rutas y sin conexión; Tus actividades, con "Ver todas" y mensaje vacío; Populares, oculta si viene vacía; Listo para salir (`SafetyCard`, pendientes, Mapas sin conexión). Al final, el botón fijo "Empezar actividad" sobre la barra de pestañas. Sin "Cerrar sesión". (CA-1, CA-2, CA-4, CA-5, CA-7, CA-10, CA-11, CA-12, CA-15, CA-16, CA-18, CA-19, CA-20, CA-22, CA-23, CA-24, CA-27)
- [ ] T23 — Revisión de accesibilidad: encabezados de sección, orden de lectura, áreas de toque de 48 dp, contraste AA en los dos modos, movimiento reducido y letra al máximo sin cortes. Corregir lo que salga. (CA-27, CA-28, CA-29)

## Cierre

- [ ] T24 — Development build en el emulador y en el S9+. Correr M1 a M13 y anotar los resultados abajo.
- [ ] T25 — Preguntar al usuario la decisión final de P11 (miniatura sin red) y anotarla en la spec. Actualizar el estado de la spec y `specs/roadmap.md`.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | M1 | Manual | Pendiente |
| CA-2 | M1 | Manual | Pendiente |
| CA-3 | `activities.test.ts` › recientes; `thumbnail.test.ts`; M1 | Automatizada + manual | Pendiente |
| CA-4 | M1 | Manual | Pendiente |
| CA-5 | M1 | Manual | Pendiente |
| CA-6 | `activities.test.ts` › `summarizeSince`; `summary.test.ts`; M1, M2 | Automatizada + manual | Pendiente |
| CA-7 | M2 | Manual | Pendiente |
| CA-8 | `thumbnail.test.ts`; M7 | Automatizada + manual | Pendiente |
| CA-9 | `nearby-query.dto.spec.ts`, `route.service.spec.ts` y `route-home.e2e-spec.ts` › `limit`; M3 | Automatizada + manual | Pendiente |
| CA-10 | M3 | Manual | Pendiente |
| CA-11 | M4 | Manual | Pendiente |
| CA-12 | M3 | Manual | Pendiente |
| CA-13 | `route.service.spec.ts` y `route-home.e2e-spec.ts` › `popular`; M5 | Automatizada + manual | Pendiente |
| CA-14 | `route.service.spec.ts` y `route-home.e2e-spec.ts` › empate | Automatizada | Cumplido (2026-11-20) |
| CA-15 | `route.service.spec.ts` › solo con favoritas; `route-home.e2e-spec.ts` › sin favoritas no aparece; M5 | Automatizada + manual | Pendiente |
| CA-16 | M3, M5 | Manual | Pendiente |
| CA-17 | `route-home.e2e-spec.ts` › el conteo cambia; M5 | Automatizada + manual | Pendiente |
| CA-18 | M6 | Manual | Pendiente |
| CA-19 | M6 | Manual | Pendiente |
| CA-20 | M6 | Manual | Pendiente |
| CA-21 | M7 | Manual | Pendiente |
| CA-22 | M7 | Manual | Pendiente |
| CA-23 | M7 | Manual | Pendiente |
| CA-24 | M8 | Manual | Pendiente |
| CA-25 | M8 | Manual | Pendiente |
| CA-26 | T2: aprobación anotada en el historial de la spec | Manual | Cumplido (2026-11-20) |
| CA-27 | M1, M9 (comparación con Figma en los dos modos) | Manual | Pendiente |
| CA-28 | M9 | Manual | Pendiente |
| CA-29 | M9 | Manual | Pendiente |
| CA-30 | M10, M11 | Manual | Pendiente |
| CA-31 | `geo.test.ts` › `boundsAround`; M10 | Automatizada + manual | Pendiente |
| CA-32 | `geo.test.ts` › `boundsForPath`; M11 | Automatizada + manual | Pendiente |
| CA-33 | M13 | Manual | Pendiente |
| CA-34 | M12 | Manual | Pendiente |

### Casos manuales

Salvo que se indique otra cosa: development build con el backend local, una cuenta con al menos 4 actividades (una de hoy y una de hace más de 7 días), 2 sin subir, contactos de emergencia activos, rutas de ejemplo publicadas cerca de Ensenada, 3 o más con favoritas, y ubicación fijada en Ensenada.

**M1 — Inicio completo**
1. Abrir la app con sesión iniciada en un teléfono de 360 dp de ancho y letra predeterminada.
2. Sin desplazarse, buscar el botón "Empezar actividad" y tocarlo.
3. Volver a Inicio. Revisar los totales de 7 días y compararlos con la suma de esas actividades en el historial.
4. Revisar las 3 actividades recientes y tocar una. Volver y tocar "Ver todas".
- **Esperado:** el botón está visible y fijo sobre la barra de pestañas y abre la grabación sin pasos intermedios. Los totales (actividades, distancia, duración y elevación ganada) no cuentan la actividad de hace más de 7 días. Las 3 recientes van de la más nueva a la más vieja, con miniatura, tipo, fecha, distancia y duración iguales al historial. Al tocar una se abre su resumen, y "Ver todas" abre la pestaña Actividades. La pantalla coincide con Figma.

**M2 — Sin actividades**
1. Con una cuenta sin actividades, abrir Inicio.
2. Con una cuenta cuyas actividades tienen más de 7 días, abrir Inicio.
- **Esperado:** (1) mensaje para empezar la primera en lugar de la lista, y totales en cero con invitación a empezar. (2) Se ven las actividades recientes y los totales en cero.

**M3 — Rutas cerca de mí**
1. Con permiso y red, abrir Inicio en Ensenada.
2. Tocar una ruta del carrusel; volver y tocar "Ver mapa".
3. Fijar la ubicación en el mar frente a Eréndira y volver a abrir Inicio.
- **Esperado:** (1) hasta 5 rutas a 25 km o menos, de la más cercana a la más lejana, cada una con nombre, tipo, distancia, dificultad y qué tan lejos está el inicio. (2) Se abre el detalle de la ruta, y luego la pestaña Rutas. (3) Mensaje de que no hay rutas cerca, con acceso a explorar el mapa.

**M4 — Sin permiso de ubicación**
1. Quitar el permiso de ubicación a la app y abrir Inicio.
- **Esperado:** en lugar de las rutas cercanas se ve un aviso que explica por qué no aparecen y cómo dar el permiso. No aparece el diálogo del sistema. Populares y el resto de Inicio se ven normal.

**M5 — Rutas populares**
1. Abrir Inicio con red y revisar Populares.
2. Tocar una ruta que no esté en la lista, guardarla en favoritas desde su detalle y volver a Inicio. Luego quitarla.
3. Con una base sin favoritas (o quitando todas), abrir Inicio.
- **Esperado:** (1) hasta 5 rutas de todo Baja California, de más a menos favoritas, con nombre, tipo, zona, distancia, dificultad y número de favoritas. (2) Al volver, el número de esa ruta ya cambió, y la lista se reordena si corresponde. (3) La sección Populares no aparece.

**M6 — Listo para salir**
1. Con contactos activos y 2 actividades sin subir, revisar la sección.
2. Desactivar todos los contactos y volver a Inicio.
3. Subir las pendientes (con red) y volver a Inicio.
4. Tocar "Mapas sin conexión".
- **Esperado:** (1) "Avisaremos a …" y "2 actividades sin subir". (2) Un aviso de que no hay contactos, que lleva a configurarlos. (3) Desaparece el aviso de pendientes. (4) Se abre la pantalla de zonas sin conexión. No hay aviso sobre zonas descargadas.

**M7 — Sin conexión**
1. Activar el modo avión (o `adb reverse` sin backend) y abrir Inicio, con el perfil sin caché si es posible.
2. Revisar las miniaturas de una actividad en una zona no descargada que nunca se vio.
3. Quitar el modo avión sin salir de Inicio.
- **Esperado:** (1) el botón, las actividades recientes, los totales y los pendientes aparecen al mismo tiempo que con red. Cerca de ti y Populares indican que se necesita conexión, sin errores en rojo. Si el perfil no está, el saludo y el avatar son genéricos. (2) La miniatura muestra la forma del recorrido sobre fondo liso. (3) Las secciones de rutas se cargan solas.

**M8 — Cerrar sesión desde el perfil**
1. Recorrer Inicio completo.
2. Tocar el avatar, ir al final del perfil y tocar "Cerrar sesión" con 2 actividades sin subir.
3. Confirmar y luego intentar volver atrás.
- **Esperado:** (1) Inicio no tiene "Cerrar sesión". (2) Aparece el aviso "Tienes 2 actividades sin subir…" con "Cancelar" y "Cerrar sesión". (3) Se llega a la bienvenida y atrás no regresa a la app.

**M9 — Accesibilidad y modo oscuro**
1. Con TalkBack, recorrer Inicio de arriba abajo.
2. Poner el tamaño de letra al máximo y abrir Inicio.
3. Cambiar el teléfono a modo oscuro y comparar con Figma.
- **Esperado:** (1) cada sección se anuncia como encabezado, cada elemento tocable tiene nombre (las miniaturas dicen tipo y distancia) y el orden sigue al visual. (2) Ningún texto se corta ni se encima, y el botón sigue a la vista. (3) Coincide con el diseño oscuro y los contrastes cumplen.

**M10 — Explorar rutas con Mapbox**
1. Repetir los casos M1 a M8 de la spec 006 en la pestaña Rutas, en modo claro y oscuro.
2. Tocar varias veces un recorrido delgado y un marcador; tocar el mapa vacío.
- **Esperado:** el mapa tiene el mismo estilo que el de la grabación y todos los casos de la 006 dan el mismo resultado que con Google. La selección responde al primer toque y desaparece al tocar el mapa vacío.

**M11 — Detalle de ruta con Mapbox**
1. Abrir el detalle de una ruta larga y de una corta.
2. Con modo avión, abrir el detalle de una ruta guardada sin conexión (011).
- **Esperado:** (1) el recorrido completo se ve con inicio y final, sin quedar pegado a los bordes. (2) El recorrido guardado se dibuja igual. Fuera de una zona descargada, el fondo es el de la grabación sin red.

**M12 — Zonas descargadas en Explorar y en el detalle**
1. Descargar una zona alrededor de Ensenada desde Mapas sin conexión.
2. Activar el modo avión, abrir la pestaña Rutas y el detalle de una ruta guardada dentro de la zona; luego mover el mapa fuera de la zona.
- **Esperado:** dentro de la zona se ve el fondo del mapa igual que al grabar. Fuera de ella, el mapa sin red se comporta como antes.

**M13 — Sin Google Maps**
1. Correr `grep -r "react-native-maps" frontend --exclude-dir=node_modules` y revisar `app.config.ts` y `.env.local`.
2. Compilar el development build desde `C:\dev\sbc` y recorrer Explorar, el detalle, la grabación y las zonas.
- **Esperado:** el grep no encuentra nada y no queda la clave de Google. El build compila y ninguna pantalla muestra el mapa de Google.

## Commits propuestos

| Commit | Tareas |
|---|---|
| `docs(013): spec, plan y tareas del rediseño de Inicio` | spec, plan y este archivo |
| `feat(013): rutas populares y límite en rutas cercanas` | T3, T4, T16 |
| `test(013): e2e y Postman de rutas populares` | T5, T6 |
| `feat(013): mapa de Explorar y del detalle con Mapbox` | T7 a T10 |
| `chore(013): quitar react-native-maps y constitución v1.10` | T11, T12 |
| `feat(013): datos de Inicio y miniaturas de recorrido` | T13 a T15, T17 a T19 |
| `feat(013): nueva pantalla de Inicio y cerrar sesión en el perfil` | T20 a T23 |
| `docs(013): prototipo de Inicio en Figma` | T1, T2 (anotación en la spec) |
| `test(013): casos manuales y cierre` | T24, T25 |

Cubre lo mínimo de la semana: `feat`, `test` y `chore`/`docs`.

## Pendientes conocidos

Ninguno por ahora.
