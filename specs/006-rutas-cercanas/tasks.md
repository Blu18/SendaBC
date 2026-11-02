# 006 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de backend y de `lib/routes` incluyen sus pruebas Vitest (constitución 6.1).

## Backend

- [x] T1 — Migración `20261016000000_routes_start_point_geography`: `routes.startPoint` a `geography(Point, 4326)` e índice GIST declarado en `schema.prisma`. Antes de `migrate deploy`, confirmar con una consulta de solo lectura que `routes` está vacía; después, que `prisma migrate diff` contra la base queda vacío. (CA-2, CA-4)
- [x] T2 — `NearbyQueryDto`: `lat` (−90…90), `lng` (−180…180), `radiusKm` (1…100, por defecto 25) y `type` opcional, convertidos de texto a número y con mensajes en español. Pruebas: valores válidos; sin `radiusKm` → 25; `radiusKm` 0 y 101 → `400`; latitud 91; tipo inválido. (CA-11, RN-5)
- [x] T3 — `RouteService.nearby(userId, query)` con la consulta del plan (`ST_DWithin` sobre `geography`, solo `PUBLISHED`, filtro por tipo, orden por cercanía, `LIMIT 50`, `ST_Simplify` del recorrido) y conversión al tipo `NearbyRoute`. Pruebas con `$queryRaw` simulado: conversión del GeoJSON a `[lng, lat][]`, `isMine`, `author`, números y lista vacía. (CA-2, CA-3, CA-5, CA-6, CA-12)
- [x] T4 — `RouteController` (`GET /routes/nearby`) con `JwtAuthGuard`, `RouteModule` y registro en `AppModule`. Pruebas del controlador: guard y uso del usuario del token. (CA-17)
- [x] T5 — `test/route.e2e-spec.ts` contra la base, con dos usuarios de prueba que se borran al final (primero sus rutas, porque la relación con el creador no se borra en cascada). Inserta rutas con SQL alrededor de un centro de prueba:
  - publicada a 3 km, borrador a 3 km y archivada a 3 km → solo la publicada (CA-3);
  - publicada a 40 km → no aparece con 25 km y sí con 50 km; con 100 km sí, con 101 → `400` (CA-4, CA-11, RN-5);
  - 55 publicadas dentro del radio → 50, ordenadas por distancia (CA-5);
  - una del usuario de la sesión → `isMine: true`, las demás `false` (CA-6);
  - de los tres tipos → el filtro devuelve solo el tipo pedido (CA-12);
  - recorrido simplificado con coordenadas `[lng, lat]` válidas y `author` correcto;
  - sin token → `401` (CA-17).

  (CA-2 a CA-6, CA-11, CA-12, CA-17)
  - 8 pruebas; ejecutadas el 2026-10-16 contra la base: 8/8 en verde y la limpieza deja `routes` sin rutas de prueba.
- [x] T6 — Rutas de ejemplo: `backend/prisma/seed/rutas-ejemplo.json` (al menos 12 rutas, 4 zonas o más, los tres tipos, UUID fijos) y `rutas-ejemplo.ts` con `npm run seed:rutas` y `npm run seed:rutas:quitar`, según el plan. Prueba Vitest del JSON: 12 o más rutas, 4 regiones o más, los tres tipos, ids únicos, al menos 10 puntos por ruta y todos dentro de los límites de Baja California. Verificación contra la base: correr `seed:rutas` dos veces no duplica; `seed:rutas:quitar` borra solo esas rutas y al usuario del sistema. (CA-18, CA-19, CA-20)
  - 17 rutas en 6 zonas (Ensenada, Valle de Guadalupe, Tecate, Sierra de Juárez, Sierra de San Pedro Mártir y Rosarito). Prueba: `prisma/seed/rutas-ejemplo.spec.ts` (5/5). Verificado el 2026-10-16 contra la base: dos cargas seguidas dejan 17 rutas; `seed:rutas:quitar` borra las 17 y al usuario "SendaBC" y deja intactas las 22 actividades y los demás usuarios. Quedan cargadas para los casos manuales.
- [x] T6b — Rutas de ejemplo reales (plan D8): `gpx/` en `.gitignore`; `rutas-ejemplo.fuentes.json` con nombre, tipo, región y dificultad por archivo; `gpx-a-json.ts` (Douglas-Peucker ≤ 40 puntos, distancia sobre la traza completa, desnivel con histéresis de 5 m, UUID v5 fijo, `source` con autor y enlace); `rutas-ejemplo.ts` usa la distancia del JSON. Prueba del JSON con los límites corregidos (longitud −117.13…−112.7) y que cada ruta tenga `source`. Corregir `BAJA_CALIFORNIA_REGION` y su prueba. Volver a cargar con `seed:rutas:quitar` + `seed:rutas` y revisar en el mapa que los recorridos siguen senderos. (CA-18, CA-19, CA-20)
  - 2026-10-17, avance: `gpx/` ignorado por git; `rutas-ejemplo.fuentes.json` con 15 trazas de Wikiloc (todas senderismo, según Wikiloc) en 7 zonas; `gpx-a-json.ts` y `npm run seed:rutas:generar` generan 39–40 puntos por ruta; el seed usa la distancia del JSON; límites de Baja California corregidos en la prueba del JSON y en `BAJA_CALIFORNIA_REGION` (frontend 190/190). Rutas recargadas en la base (17 aproximadas borradas, 15 reales cargadas). **Falta:** al menos un GPX real de ciclismo y uno de trail running; hasta entonces falla la prueba de los tres tipos (CA-18).
  - 2026-10-17, cerrada: se agregan una traza de trail running (San Antonio Necua – Sierra Blanca, Valle de Guadalupe) y una de ciclismo de montaña (La Tasajera – La Grulla, San Pedro Mártir), en subcarpetas de `gpx/`. En total, 17 rutas reales en 8 zonas, con los tres tipos. Backend 86/86 (`rutas-ejemplo.spec.ts` 6/6) y e2e de rutas 8/8. Verificado contra la base: `seed:rutas:quitar` + `seed:rutas` dos veces deja 17 rutas sin duplicar (CA-20). Falta revisarlas en el mapa (M1).
- [x] T7 — Colección de Postman: "Rutas cercanas" (`200`), "Radio fuera de rango" (`400`) y "Rutas cercanas sin token" (`401`). Validar con la app local, como en la 005. (Constitución 6.3)
  - Variables `lat` y `lng` (Ensenada) como centro. Validada el 2026-10-16 ejecutando sus propios scripts de prueba contra la app local, con dos rutas temporales (a 3 y 40 km) que se borraron al terminar: 9/9 verificaciones en verde (login incluido); la de 40 km no aparece con 25 km.

## Frontend

- [x] T8 — Instalar `react-native-maps` (`npx expo install react-native-maps`) y confirmar que el mapa se muestra en Expo Go en el emulador.
  - 2026-10-16: instalado `react-native-maps` 1.27.2 (la versión del SDK 57), sin plugin en `app.json`, porque Expo Go no lo necesita; la clave de Google Maps queda para la spec 010. **Falta** confirmar que el mapa se ve en Expo Go en el emulador; se hará con la primera pantalla que use `MapView` (T12, caso M1).
  - 2026-10-16, intento en el emulador (`sdk_gphone16k_x86_64`, Android 17, Google Play Services 26.36, Expo Go 57.0.9, sin cuenta de Google): la pantalla abre, se concede el permiso y se ven los chips y el botón para centrar, pero el mapa sale en blanco y sin rutas. Logcat: `Google Android Maps SDK: Authorization failure` precedido de `Error requesting API token. StatusCode=INVALID_ARGUMENT` en Play Services. Es la autorización de Google Maps con la clave de Expo Go en esa imagen, no el código de la app. **Sigue abierta:** repetir en el teléfono con Expo Go o en un AVD con imagen "Google Play" de una versión estable (Android 15/16) y con cuenta de Google.
- [x] T8b — Development build (plan D7): `npx expo install expo-dev-client`; `android.package` = `com.sendabc.app` en `app.json`; `app.config.ts` con el plugin de `react-native-maps` y `GOOGLE_MAPS_ANDROID_API_KEY`; `/android` en `.gitignore`. El equipo crea la clave (Maps SDK for Android, paquete + SHA-1 de depuración) y la pone en `frontend/.env.local`. `npx expo run:android` en el emulador y confirmar que el mapa muestra calles y las rutas de ejemplo. Cierra T8.
  - 2026-10-16, código listo: `expo-dev-client` ~57.0.20, `android.package` `com.sendabc.app`, `app.config.ts` (verificado con `expo config`) y `/android` en `.gitignore`. `expo prebuild` genera `android/` con `applicationId com.sendabc.app`. SHA-1 de depuración (`android/app/debug.keystore`, el keystore de depuración de la plantilla de React Native): `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`. **Falta:** que el equipo cree la clave y la ponga en `frontend/.env.local`, compilar con `npx expo run:android` (`JAVA_HOME` = JBR de Android Studio) y confirmar el mapa.
  - 2026-10-16, en el emulador: con JDK 21 y desde `C:\dev\SendaBC` (en OneDrive, `ninja` fallaba por rutas de más de 260 caracteres y Gradle no podía borrar sus salidas) el development build compila e instala. La app usa la clave propia con `com.sendabc.app` y el SHA-1 de depuración, pero Google sigue respondiendo `Authorization failure`, precedido de `Error requesting API token. StatusCode=INVALID_ARGUMENT` en Play Services: el mismo síntoma que con la clave de Expo Go. **Pendiente:** revisar la clave en Google Cloud y probar en el teléfono o en un AVD estable con cuenta de Google.
  - 2026-10-17: con una clave nueva (restringida a `com.sendabc.app` + SHA-1 de depuración), prebuild y recompilación, el mapa carga en el emulador: calles de Ensenada, ubicación del usuario y las rutas de ejemplo cercanas con su recorrido y marcador. Los primeros minutos Play Services respondió `StatusCode=UNAVAILABLE` mientras la clave se propagaba. Cierra T8 y T8b. Visto de paso para el `fix(006)`: en Android los marcadores salen verde claro, no en el color `primary`.
- [x] T9 — `lib/routes/constants.ts`, `geo.ts` y `format.ts`: radios, región de Baja California, `pathToCoordinates`, `distanceFromUser`, `hasMovedEnough` y `DIFFICULTY_LABELS`. Pruebas: conversión de coordenadas; distancia conocida entre dos puntos; sin ubicación → `null`; moverse menos o más del 20 % del radio; etiquetas de dificultad. (CA-7, CA-9, CA-11, CA-14)
- [x] T10 — `lib/routes/api.ts`: `fetchNearbyRoutes` sobre `apiFetch`, con límite de 10 s y resultado `{ ok, data }` / `{ ok: false, failure }`. Pruebas con `fetch` simulado: parámetros de la query, token, `401`, `500`, sin red y tiempo agotado. (CA-15, CA-16)
- [x] T11 — `hooks/routes/useNearbyRoutes.ts`: TanStack Query bajo demanda, revisión de red con `hayConexion` y estados `idle` / `loading` / `success` / `empty` / `offline` / `error`, con `search` y `retry`. (CA-13, CA-15, CA-16)
  - El estado se decide con `nearbyStatus` en `lib/routes/status.ts` (lógica pura, con `status.test.ts`); el hook solo lo conecta con TanStack Query y `expo-network`. Además expone `lastSearch` para `hasMovedEnough`. `geo.ts` agrega `regionAround` para encuadrar el radio de búsqueda.
- [x] T12 — `pages/routes/exploreRoutesPage.tsx`: `MapView` con un `Polyline` y un `Marker` por ruta; selección resaltada; tocar el mapa vacío quita la selección; tarjeta con nombre, tipo, distancia, desnivel, dificultad, "Por {author}", "A X km de ti" e insignia "Tuya". (CA-1, CA-2, CA-6, CA-7, CA-8, CA-19)
- [x] T13 — Controles: chips de tipo y de radio (25 km al abrir), botón "Buscar en esta zona" con `hasMovedEnough` y botón para volver a centrar. (CA-9, CA-10, CA-11, CA-12)
- [x] T14 — Permiso y avisos: con permiso, centrar y buscar al abrir; sin permiso, región de Baja California sin buscar, aviso y tarjeta sin distancia; avisos de "sin rutas", "sin conexión" y error con "Reintentar"; indicador de carga. (CA-1, CA-13, CA-14, CA-15, CA-16)
- [x] T15 — Navegación: ruta `ExploreRoutes` en `App.tsx` y botón "Explorar rutas" en `MainPage`. (CA-1, CA-17)
  - T12–T15 implementadas el 2026-10-16: `tsc` sin errores y el bundle de Android compila (`expo export`). Antes de buscar (sin permiso), cambiar radio o tipo solo los elige; después, vuelve a buscar en el centro del mapa. Al cambiar el radio, el mapa se encuadra al nuevo radio. Si no se puede obtener la posición (GPS apagado), se explora como sin permiso. **Pendiente:** los casos manuales M1–M8 en el emulador o el teléfono.

## Documentación

- [x] T16 — Al cerrar: tabla de verificación, estado de la spec y `specs/roadmap.md`.

## Cobertura

Los 20 CA están cubiertos por al menos una tarea.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | M1 | Manual | Verificado (M1, 2026-10-17) |
| CA-2 | `route.e2e-spec.ts` · M1 | Ambas | Verificado (e2e 8/8; M1) |
| CA-3 | `route.e2e-spec.ts` › solo publicadas | Automatizada | Verificado (e2e) |
| CA-4 | `route.e2e-spec.ts` › fuera del radio | Automatizada | Verificado (e2e) |
| CA-5 | `route.e2e-spec.ts` › 55 → 50 ordenadas | Automatizada | Verificado (e2e) |
| CA-6 | `route.service.spec.ts` · `route.e2e-spec.ts` › `isMine` · revisión de la insignia | Automatizada | Verificado (automatizadas; insignia por revisión, ver nota) |
| CA-7 | `geo.test.ts` › distancia hasta el usuario · M2 | Ambas | Verificado (`geo.test.ts`; M2) |
| CA-8 | M2 | Manual | Verificado (M2, tras el `fix(006)`) |
| CA-9 | `geo.test.ts` › `hasMovedEnough` · M3 | Ambas | Verificado (`geo.test.ts`; M3) |
| CA-10 | M3 | Manual | Verificado (M3) |
| CA-11 | `nearby-query.dto.spec.ts` · `route.e2e-spec.ts` › 25/50/100/101 km · M4 | Ambas | Verificado (DTO y e2e; M4) |
| CA-12 | `route.e2e-spec.ts` › filtro por tipo · M5 | Ambas | Verificado (e2e; M5) |
| CA-13 | `status.test.ts` › empty · M6 | Ambas | Verificado (`status.test.ts`; M4 y M6) |
| CA-14 | `constants`/`geo` (región y distancia `null`) · M7 | Ambas | Verificado (`geo.test.ts`; M7) |
| CA-15 | `api.test.ts` › sin red · `status.test.ts` › offline · M8 | Ambas | Verificado (`api.test.ts`, `status.test.ts`; M8 tras el `fix(006)`) |
| CA-16 | `api.test.ts` › `500` · M8 | Ambas | Verificado (`api.test.ts`; M8) |
| CA-17 | `route.controller.spec.ts` › guard · `route.e2e-spec.ts` › `401` | Automatizada | Verificado (controlador y e2e) |
| CA-18 | `rutas-ejemplo.spec.ts` › 12+ rutas, 4+ zonas, 3 tipos · M1 | Ambas | Verificado (`rutas-ejemplo.spec.ts` 6/6: 17 rutas, 8 zonas, 3 tipos; M1) |
| CA-19 | `route.e2e-spec.ts` › `author` · M2 ("Por SendaBC") | Ambas | Verificado (e2e; M2 "Por SendaBC") |
| CA-20 | T6: `seed:rutas` dos veces sin duplicar y `seed:rutas:quitar` sin tocar otros datos | Verificación contra la base | Verificado contra la base (T6 y T6b) |

CA-6 en pantalla (la insignia "Tuya") se ve en la app hasta que la spec 007 permita publicar; aquí se cubre con las pruebas automáticas y la revisión del componente.

Cierre (2026-10-17): los 20 CA están verificados. Pruebas finales: backend 86/86, e2e 34/34 (5 suites), frontend 190/190. Colección de Postman validada en T7 (constitución 6.3). Casos manuales M1–M8 en el emulador con el development build (D7) y las rutas de ejemplo reales (D8).

### Casos manuales

En el emulador (necesita Google Play Services para el mapa) o en el teléfono, con el backend corriendo y las rutas de ejemplo cargadas (`npm run seed:rutas`).

**M1 — Abrir el mapa**
1. Fijar la ubicación del emulador en Ensenada. Tocar la pestaña Rutas.
- **Esperado:** el mapa se centra en Ensenada y muestra las rutas de ejemplo cercanas, cada una con su recorrido y un marcador en su inicio.

**M2 — Tarjeta y selección**
1. Tocar el recorrido de una ruta. 2. Tocar el marcador de otra. 3. Tocar una zona vacía del mapa.
- **Esperado:** (1) la ruta se resalta y aparece su tarjeta con nombre, tipo, distancia, desnivel, dificultad, "Por SendaBC" y "A X km de ti". (2) cambian la selección y la tarjeta. (3) desaparecen la selección y la tarjeta.

**M3 — Otra zona y volver**
1. Mover el mapa hasta Tecate. 2. Tocar "Buscar en esta zona". 3. Tocar el botón para volver a centrar.
- **Esperado:** (1) aparece "Buscar en esta zona". (2) se muestran las rutas de Tecate. (3) el mapa vuelve a Ensenada con sus rutas.

**M4 — Radio**
1. En Ensenada, elegir 5 km. 2. Elegir 100 km. 3. Ir a otra pestaña y volver a Rutas.
- **Esperado:** (1) solo las rutas a menos de 5 km del centro. (2) aparecen también las de zonas más lejanas dentro de 100 km. (3) el radio vuelve a 25 km.

**M5 — Filtro por tipo**
1. Elegir "Ciclismo". 2. Elegir "Todas".
- **Esperado:** (1) solo rutas de ciclismo. (2) vuelven todas.

**M6 — Zona sin rutas**
1. Mover el mapa a una zona sin rutas de ejemplo (p. ej. el desierto de San Felipe) y buscar.
- **Esperado:** "No hay rutas publicadas cerca de aquí. Mueve el mapa o aumenta la distancia de búsqueda."

**M7 — Sin permiso de ubicación**
1. Negar el permiso de ubicación y abrir la pestaña Rutas.
2. Mover el mapa a Ensenada y tocar "Buscar en esta zona". Tocar una ruta.
- **Esperado:** (1) el mapa muestra todo Baja California, sin rutas todavía, con el aviso del permiso y sin botón para volver a centrar. (2) aparecen las rutas; la tarjeta no muestra "A X km de ti".

**M8 — Sin conexión y error del servidor**
1. Activar modo avión y buscar.
2. Quitar el modo avión, detener el backend y buscar. 3. Levantar el backend y tocar "Reintentar".
- **Esperado:** (1) mensaje de que explorar rutas necesita internet, sin carga infinita. (2) indicador de carga y luego el mensaje de error con "Reintentar". (3) aparecen las rutas.

## Commits propuestos

| # | Commit | Tareas |
|---|---|---|
| 1 | `feat(006): startPoint como geography con índice GIST` | T1 |
| 2 | `feat(006): endpoint de rutas cercanas` | T2–T4 |
| 3 | `test(006): e2e de rutas cercanas y colección de Postman` | T5, T7 |
| 4 | `feat(006): rutas de ejemplo de Baja California` | T6 |
| 5 | `chore(006): agregar react-native-maps` | T8 |
| 6 | `feat(006): lógica, cliente y hook de rutas cercanas` | T9–T11 |
| 7 | `feat(006): pantalla Explorar rutas` | T12–T15 |
| 8 | `fix(006)`: ajustes de los casos manuales | — |
| 9 | `docs(006): verificación y estado de la spec` | T16 |

### Resultados de los casos manuales

- **M1 — 2026-10-17, aprobado** (emulador, development build, ubicación fijada en Ensenada): el mapa se centra en Ensenada con 25 km y muestra las rutas de ejemplo cercanas con su recorrido y su marcador de inicio. Al acercar, los recorridos siguen el terreno real (Cañón de Doña Petra hacia Las Lomas, circuito del Bosque de los Attenuatas). Doña Petra y Cerros de Ensenada empiezan casi en el mismo punto y sus marcadores se enciman.
- **M2 — 2026-10-17, parcial:** la tarjeta de Bosque de los Attenuatas muestra nombre, tipo, dificultad, 8.35 km, 550 m, "Por SendaBC" y "A 8.62 km de ti"; tocar el mapa vacío quita la selección y la tarjeta. **Falla:** en el tramo que comparte con Cerros de Ensenada, la ruta seleccionada queda debajo de la otra y parece resaltada solo en parte (CA-8). Probablemente es el mismo problema de recorridos viejos que se ve en M8. Para el `fix(006)`.
- **M3 — 2026-10-17, aprobado:** al mover el mapa a Tecate aparece "Buscar en esta zona"; al tocarlo, aparece El Refugio – Tecate. Volver a centrar regresa a Ensenada con sus rutas.
- **M4 — 2026-10-17, aprobado:** con 5 km no hay rutas (la más cercana empieza a ~5.1 km) y aparece el aviso de CA-13; con 100 km aparecen también las de Tijuana–Rosarito, Tecate, Valle de Guadalupe y Sierra de Juárez; al salir y volver a entrar el radio regresa a 25 km. Al abrir, "Buscando tu ubicación…" tarda más de 10 s en el emulador.
- **M5 — 2026-10-17, aprobado:** "Ciclismo" oculta las de senderismo y, sin rutas de ciclismo cerca de Ensenada, muestra el aviso; "Trail running" con 100 km muestra solo San Antonio Necua; "Todas" las regresa. El botón flotante de herramientas de desarrollo tapa parte del chip "Ciclismo" (solo en el development build).
- **M6 — 2026-10-17, aprobado:** con el mapa sobre el mar frente a Eréndira y 10 km aparece "No hay rutas publicadas cerca de aquí…".
- **M7 — 2026-10-17, aprobado:** al negar el permiso se ve todo Baja California, sin rutas, con el aviso del permiso y sin botón para centrar; al mover a Ensenada y buscar aparecen las rutas y la tarjeta no muestra "A X km de ti".
- **M8 — 2026-10-17, paso 1 con falla:** en modo avión aparece "Explorar rutas necesita conexión a internet…" con "Reintentar" y sin carga infinita, pero **los recorridos de la búsqueda anterior se quedan dibujados** (los marcadores sí desaparecen), contra CA-15. Pasos 2 y 3 hechos después del `fix(006)`: con el backend detenido aparecen "Buscando rutas…" y luego "No se pudieron cargar las rutas…" con "Reintentar" (CA-16); al levantarlo y tocar "Reintentar" aparecen las rutas. **M8 aprobado.**
- **`fix(006)`, segunda vuelta — 2026-10-17:** el primer arreglo (volver a montar los recorridos) aún dejaba trazos huérfanos al hacer una búsqueda nueva con una ruta seleccionada. Causa: `react-native-maps` 1.27 en Android guarda cada elemento nuevo con `features.set(index)` y, al insertar en medio, el elemento reemplazado queda dibujado sin control. Ahora el mapa solo agrega al final: un conjunto fijo por búsqueda y la selección (recorrido grueso y anillo `data`) siempre como últimos elementos. Verificado en el emulador: seleccionar, cambiar de ruta, quitar la selección, cambiar el radio con una ruta seleccionada y buscar en modo avión no deja ningún trazo viejo.
- **`fix(006)` — 2026-10-17, verificado en el emulador:** al seleccionar Doña Petra y luego Bosque de los Attenuatas, la primera vuelve a `primary` y la segunda se resalta completa (CA-8; lo de M2 era una copia vieja de otra ruta). En modo avión ya no queda ningún recorrido dibujado (M8, paso 1, CA-15). Los inicios salen con el verde de la paleta y el seleccionado en `data`. Al abrir, el mapa queda centrado y con rutas en ~6 s. Seleccionar ya no mueve la cámara ni hace aparecer "Buscar en esta zona".

## Pendientes conocidos

- Sin permiso de ubicación, el encuadre de todo Baja California llega hasta Baja California Sur en pantallas verticales. No se corrige: para que quepa el estado completo a lo ancho (CA-14), el mapa tiene que mostrar más latitud.
- El botón flotante de herramientas del development build tapa parte del chip "Ciclismo". Solo pasa en desarrollo.

Corregido en el `fix(006)` (2026-10-17): recorridos viejos (M2, M8), color de los marcadores, ubicación lenta al abrir, cámara que se movía al tocar un marcador y `edgeToEdgeEnabled` obsoleto en `app.json`.
