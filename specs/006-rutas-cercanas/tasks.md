# 006 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de backend y de `lib/routes` incluyen sus pruebas Vitest (constitución 6.1).

## Backend

- [x] T1 — Migración `20261016000000_routes_start_point_geography`: `routes.startPoint` a `geography(Point, 4326)` e índice GIST declarado en `schema.prisma`. Antes de `migrate deploy`, confirmar con una consulta de solo lectura que `routes` está vacía; después, que `prisma migrate diff` contra la base queda vacío. (CA-2, CA-4)
- [x] T2 — `NearbyQueryDto`: `lat` (−90…90), `lng` (−180…180), `radiusKm` (1…100, por defecto 25) y `type` opcional, convertidos de texto a número y con mensajes en español. Pruebas: valores válidos; sin `radiusKm` → 25; `radiusKm` 0 y 101 → `400`; latitud 91; tipo inválido. (CA-11, RN-5)
- [x] T3 — `RouteService.nearby(userId, query)` con la consulta del plan (`ST_DWithin` sobre `geography`, solo `PUBLISHED`, filtro por tipo, orden por cercanía, `LIMIT 50`, `ST_Simplify` del recorrido) y conversión al tipo `NearbyRoute`. Pruebas con `$queryRaw` simulado: conversión del GeoJSON a `[lng, lat][]`, `isMine`, `author`, números y lista vacía. (CA-2, CA-3, CA-5, CA-6, CA-12)
- [x] T4 — `RouteController` (`GET /routes/nearby`) con `JwtAuthGuard`, `RouteModule` y registro en `AppModule`. Pruebas del controlador: guard y uso del usuario del token. (CA-17)
- [ ] T5 — `test/route.e2e-spec.ts` contra la base, con dos usuarios de prueba que se borran al final (primero sus rutas, porque la relación con el creador no se borra en cascada). Inserta rutas con SQL alrededor de un centro de prueba:
  - publicada a 3 km, borrador a 3 km y archivada a 3 km → solo la publicada (CA-3);
  - publicada a 40 km → no aparece con 25 km y sí con 50 km; con 100 km sí, con 101 → `400` (CA-4, CA-11, RN-5);
  - 55 publicadas dentro del radio → 50, ordenadas por distancia (CA-5);
  - una del usuario de la sesión → `isMine: true`, las demás `false` (CA-6);
  - de los tres tipos → el filtro devuelve solo el tipo pedido (CA-12);
  - recorrido simplificado con coordenadas `[lng, lat]` válidas y `author` correcto;
  - sin token → `401` (CA-17).

  (CA-2 a CA-6, CA-11, CA-12, CA-17)
- [ ] T6 — Rutas de ejemplo: `backend/prisma/seed/rutas-ejemplo.json` (al menos 12 rutas, 4 zonas o más, los tres tipos, UUID fijos) y `rutas-ejemplo.ts` con `npm run seed:rutas` y `npm run seed:rutas:quitar`, según el plan. Prueba Vitest del JSON: 12 o más rutas, 4 regiones o más, los tres tipos, ids únicos, al menos 10 puntos por ruta y todos dentro de los límites de Baja California. Verificación contra la base: correr `seed:rutas` dos veces no duplica; `seed:rutas:quitar` borra solo esas rutas y al usuario del sistema. (CA-18, CA-19, CA-20)
- [ ] T7 — Colección de Postman: "Rutas cercanas" (`200`), "Radio fuera de rango" (`400`) y "Rutas cercanas sin token" (`401`). Validar con la app local, como en la 005. (Constitución 6.3)

## Frontend

- [ ] T8 — Instalar `react-native-maps` (`npx expo install react-native-maps`) y confirmar que el mapa se muestra en Expo Go en el emulador.
- [ ] T9 — `lib/routes/constants.ts`, `geo.ts` y `format.ts`: radios, región de Baja California, `pathToCoordinates`, `distanceFromUser`, `hasMovedEnough` y `DIFFICULTY_LABELS`. Pruebas: conversión de coordenadas; distancia conocida entre dos puntos; sin ubicación → `null`; moverse menos o más del 20 % del radio; etiquetas de dificultad. (CA-7, CA-9, CA-11, CA-14)
- [ ] T10 — `lib/routes/api.ts`: `fetchNearbyRoutes` sobre `apiFetch`, con límite de 10 s y resultado `{ ok, data }` / `{ ok: false, failure }`. Pruebas con `fetch` simulado: parámetros de la query, token, `401`, `500`, sin red y tiempo agotado. (CA-15, CA-16)
- [ ] T11 — `hooks/routes/useNearbyRoutes.ts`: TanStack Query bajo demanda, revisión de red con `hayConexion` y estados `idle` / `loading` / `success` / `empty` / `offline` / `error`, con `search` y `retry`. (CA-13, CA-15, CA-16)
- [ ] T12 — `pages/routes/exploreRoutesPage.tsx`: `MapView` con un `Polyline` y un `Marker` por ruta; selección resaltada; tocar el mapa vacío quita la selección; tarjeta con nombre, tipo, distancia, desnivel, dificultad, "Por {author}", "A X km de ti" e insignia "Tuya". (CA-1, CA-2, CA-6, CA-7, CA-8, CA-19)
- [ ] T13 — Controles: chips de tipo y de radio (25 km al abrir), botón "Buscar en esta zona" con `hasMovedEnough` y botón para volver a centrar. (CA-9, CA-10, CA-11, CA-12)
- [ ] T14 — Permiso y avisos: con permiso, centrar y buscar al abrir; sin permiso, región de Baja California sin buscar, aviso y tarjeta sin distancia; avisos de "sin rutas", "sin conexión" y error con "Reintentar"; indicador de carga. (CA-1, CA-13, CA-14, CA-15, CA-16)
- [ ] T15 — Navegación: ruta `ExploreRoutes` en `App.tsx` y botón "Explorar rutas" en `MainPage`. (CA-1, CA-17)

## Documentación

- [ ] T16 — Al cerrar: tabla de verificación, estado de la spec y `specs/roadmap.md`.

## Cobertura

Los 20 CA están cubiertos por al menos una tarea.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | M1 | Manual | Pendiente |
| CA-2 | `route.e2e-spec.ts` · M1 | Ambas | Pendiente |
| CA-3 | `route.e2e-spec.ts` › solo publicadas | Automatizada | Pendiente |
| CA-4 | `route.e2e-spec.ts` › fuera del radio | Automatizada | Pendiente |
| CA-5 | `route.e2e-spec.ts` › 55 → 50 ordenadas | Automatizada | Pendiente |
| CA-6 | `route.service.spec.ts` · `route.e2e-spec.ts` › `isMine` · revisión de la insignia | Automatizada | Pendiente |
| CA-7 | `geo.test.ts` › distancia hasta el usuario · M2 | Ambas | Pendiente |
| CA-8 | M2 | Manual | Pendiente |
| CA-9 | `geo.test.ts` › `hasMovedEnough` · M3 | Ambas | Pendiente |
| CA-10 | M3 | Manual | Pendiente |
| CA-11 | `nearby-query.dto.spec.ts` · `route.e2e-spec.ts` › 25/50/100/101 km · M4 | Ambas | Pendiente |
| CA-12 | `route.e2e-spec.ts` › filtro por tipo · M5 | Ambas | Pendiente |
| CA-13 | M6 | Manual | Pendiente |
| CA-14 | `constants`/`geo` (región y distancia `null`) · M7 | Ambas | Pendiente |
| CA-15 | `api.test.ts` › sin red · M8 | Ambas | Pendiente |
| CA-16 | `api.test.ts` › `500` · M8 | Ambas | Pendiente |
| CA-17 | `route.controller.spec.ts` › guard · `route.e2e-spec.ts` › `401` | Automatizada | Pendiente |
| CA-18 | `rutas-ejemplo.test.ts` › 12+ rutas, 4+ zonas, 3 tipos · M1 | Ambas | Pendiente |
| CA-19 | `route.e2e-spec.ts` › `author` · M2 ("Por SendaBC") | Ambas | Pendiente |
| CA-20 | T6: `seed:rutas` dos veces sin duplicar y `seed:rutas:quitar` sin tocar otros datos | Verificación contra la base | Pendiente |

CA-6 en pantalla (la insignia "Tuya") se ve en la app hasta que la spec 007 permita publicar; aquí se cubre con las pruebas automáticas y la revisión del componente.

### Casos manuales

En el emulador (necesita Google Play Services para el mapa) o en el teléfono, con el backend corriendo y las rutas de ejemplo cargadas (`npm run seed:rutas`).

**M1 — Abrir el mapa**
1. Fijar la ubicación del emulador en Ensenada. Pantalla principal → "Explorar rutas".
- **Esperado:** el mapa se centra en Ensenada y muestra las rutas de ejemplo cercanas, cada una con su recorrido y un marcador en su inicio.

**M2 — Tarjeta y selección**
1. Tocar el recorrido de una ruta. 2. Tocar el marcador de otra. 3. Tocar una zona vacía del mapa.
- **Esperado:** (1) la ruta se resalta y aparece su tarjeta con nombre, tipo, distancia, desnivel, dificultad, "Por SendaBC" y "A X km de ti". (2) cambian la selección y la tarjeta. (3) desaparecen la selección y la tarjeta.

**M3 — Otra zona y volver**
1. Mover el mapa hasta Tecate. 2. Tocar "Buscar en esta zona". 3. Tocar el botón para volver a centrar.
- **Esperado:** (1) aparece "Buscar en esta zona". (2) se muestran las rutas de Tecate. (3) el mapa vuelve a Ensenada con sus rutas.

**M4 — Radio**
1. En Ensenada, elegir 5 km. 2. Elegir 100 km. 3. Salir y volver a abrir "Explorar rutas".
- **Esperado:** (1) solo las rutas a menos de 5 km del centro. (2) aparecen también las de zonas más lejanas dentro de 100 km. (3) el radio vuelve a 25 km.

**M5 — Filtro por tipo**
1. Elegir "Ciclismo". 2. Elegir "Todas".
- **Esperado:** (1) solo rutas de ciclismo. (2) vuelven todas.

**M6 — Zona sin rutas**
1. Mover el mapa a una zona sin rutas de ejemplo (p. ej. el desierto de San Felipe) y buscar.
- **Esperado:** "No hay rutas publicadas cerca de aquí. Mueve el mapa o aumenta la distancia de búsqueda."

**M7 — Sin permiso de ubicación**
1. Negar el permiso de ubicación y abrir "Explorar rutas".
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

## Pendientes conocidos

Ninguno por ahora.
