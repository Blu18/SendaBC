# 007 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de backend y de `lib/routes` incluyen sus pruebas Vitest (constitución 6.1).

## Backend

- [x] T1 — Migración `20261020000000_routes_publish`: valor `DELETED` en `RouteStatus` y columna `routes.elevationProfile` (`JSONB`), declarados en `schema.prisma`. Antes de `migrate deploy`, confirmar con una consulta de solo lectura que `routes` solo tiene las rutas de ejemplo; después, que `prisma migrate diff` contra la base queda vacío. (CA-11, CA-25)
- [x] T2 — `src/route/difficulty.ts`: `dificultadDe(type, distanceMeters, elevationGainMeters)` con la tabla de RN-6. Pruebas:
  - los ejemplos de la spec (12 km y 200 m a pie → Moderada; 6 km y 900 m de trail → Difícil; 35 km y 500 m en bici → Moderada);
  - los bordes de cada nivel (8/15/30 km y 300/700/1 500 m a pie; 15/35/75 km y 400/900/1 800 m en bici);
  - el nivel más alto entre distancia y elevación.

  (CA-4)
- [x] T3 — `src/route/elevation-profile.ts`: `perfilDe(puntos)`, con distancia acumulada por haversine, solo los puntos con altitud y muestreo a ≤ 200 puntos. Pruebas:
  - distancias acumuladas conocidas;
  - el primer punto en 0 m y el último en la distancia total;
  - 5 400 puntos se reducen a ≤ 200;
  - salta los puntos sin altitud;
  - sin altitudes devuelve `null`.

  (CA-11)
- [x] T4 — `CreateRouteDto` y `UpdateRouteDto`: `activityId` UUID; `name` de 1 a 40 caracteres sin espacios al inicio y al final; `description` ≤ 200; `region` ≤ 40, y `null`/vacía para borrarla; `status` solo `PUBLISHED` o `ARCHIVED`. El `whitelist` descarta `type`, `difficulty`, `distanceMeters`, `path`, etc. Pruebas de valores válidos, bordes (40/41, 200/201), nombre solo con espacios y estado inválido, con mensajes en español. (CA-5, CA-22)
- [x] T5 — `RouteService.publish(userId, dto)`: actividad del token, mínimo de 1.5 km, una ruta no borrada por actividad (también por el `UNIQUE`), datos tomados de la actividad, `difficulty` con `dificultadDe` y `elevationProfile` con `perfilDe`, en una transacción. Pruebas con Prisma simulado: `404` si es ajena o no existe, `400` si es corta, `409` si ya tiene ruta, y los valores que se insertan. (CA-6, CA-8, CA-9)
- [x] T6 — `RouteService.detail`, `update` y `remove`:
  - visibilidad: `PUBLISHED` siempre; `ARCHIVED` solo para su dueño; `DELETED` nunca;
  - `isMine` e `isFavorite`, y recorrido simplificado a ~2 m;
  - editar nombre, descripción y zona; archivar y volver a publicar;
  - borrado lógico (`DELETED`, `sourceActivityId = NULL`);
  - `403` si la ruta es ajena.

  Pruebas con Prisma simulado de cada regla. (CA-10, CA-12, CA-14, CA-22, CA-23, CA-24, CA-25, CA-26)
- [x] T7 — `RouteService.listMine`, `listFavorites`, `addFavorite` y `removeFavorite`:
  - `listMine`: sin `DELETED`, la más reciente primero;
  - `listFavorites`: con `available` según el estado, la guardada más reciente primero;
  - `addFavorite` y `removeFavorite`: idempotentes, y `addFavorite` responde `404` si la ruta no está disponible.

  Pruebas con Prisma simulado. (CA-15, CA-16, CA-18, CA-19, CA-20, CA-21)
- [x] T8 — `RouteController`: `POST /routes`, `GET /routes/mine`, `GET /routes/favorites`, `GET /routes/:id`, `PATCH /routes/:id`, `DELETE /routes/:id`, `PUT` y `DELETE /routes/:id/favorite`. `mine` y `favorites` van antes de `:id`, y `:id` usa `ParseUUIDPipe` con `404`. Pruebas del controlador: el guard en toda la clase y el usuario del token en cada acción. (CA-26, CA-27)
- [x] T9 — `test/route-publish.e2e-spec.ts` contra la base. Usa dos usuarios de prueba, cada uno con actividades sincronizadas por `POST /activities/sync` (una de 3 km y otra de 1 km), y al final borra sus rutas y luego a los usuarios. Casos:
  - publicar la de 3 km → `201`, aparece en `GET /routes/nearby` y su detalle trae perfil, dificultad e `isMine` (CA-6, CA-11);
  - publicar otra vez → `409`; la de 1 km → `400`; una actividad del otro usuario → `404` (CA-8, CA-9);
  - el otro usuario la guarda en favoritas dos veces → una sola favorita; la quita dos veces → `204` (CA-15, CA-16);
  - la favorita aparece en `GET /routes/favorites` del que la guardó y no en la del dueño (CA-17, CA-20);
  - el otro usuario intenta `PATCH` y `DELETE` → `403`; con la ruta de ejemplo también (CA-26);
  - el dueño edita el nombre → se ve en el detalle y en `nearby`; un nombre de 41 → `400` (CA-22, CA-5);
  - archivar → desaparece de `nearby`, el otro usuario recibe `404` en el detalle y en favoritas ve `available: false`; volver a publicar → reaparece (CA-23, CA-24, CA-14, CA-19);
  - borrar → `204`, desaparece de `nearby` y de `mine`, sigue en favoritas como no disponible, y la actividad se puede publicar de nuevo (CA-25, CA-19, CA-8);
  - sin token → `401` en todos los endpoints nuevos (CA-27).
- [x] T10 — Rutas de ejemplo con perfil y dificultad calculada:
  - `gpx-a-json.ts` agrega `elevationProfile` (con `perfilDe` sobre la traza completa) y `difficulty` (con `dificultadDe`);
  - `rutas-ejemplo.fuentes.json` deja de llevar dificultad;
  - `rutas-ejemplo.ts` guarda el perfil;
  - la prueba del JSON comprueba que toda ruta tiene perfil de 2 a 200 puntos, con distancias crecientes, y que su dificultad coincide con `dificultadDe`.

  Volver a cargar con `seed:rutas` y anotar las rutas cuya dificultad cambió. (CA-11)

  Recargadas el 2026-10-20: las 17 rutas tienen perfil (de 189 a 200 puntos) y cambiaron de dificultad tres:
  - Cañón de Doña Petra – San Antonio de las Minas (senderismo, 17.3 km, 545 m): Moderada → Difícil, por la distancia.
  - El Tajo – Trono Blanco (senderismo, 5.4 km, 269 m): Moderada → Fácil.
  - La Otra Baja 100 (senderismo, 111.0 km, 851 m): Difícil → Extrema, por la distancia.

  Distancia, desnivel, recorrido e ids no cambiaron.
- [x] T11 — Colección de Postman: carpeta "Publicar rutas (spec 007)" con publicar, detalle, editar, archivar, volver a publicar, favorita (guardar y quitar), "Mis rutas", "Mis favoritas" y borrar, más un `409` y un `403`. Validar contra la app local, como en la 006. (Constitución 6.3)

  Validada el 2026-10-20 contra la API local: la colección completa, en orden, pasa 54/54 pruebas (17 peticiones nuevas). Se corrió con un ejecutor en Node que implementa lo que usa la colección (`pm.test`, `pm.expect` con chai, `pm.response`, variables y `{{$guid}}`), porque `newman` no está instalado; conviene correrla también en Postman.

## Frontend

- [x] T12 — Lógica pura en `lib/routes/`, con pruebas Vitest:
  - `difficulty.ts`, con los mismos casos que T2;
  - `publish.ts` (`MIN_PUBLISH_DISTANCE_M`, `validarRuta` y `motivoNoPublicable`): no sincronizada, < 1.5 km, ya tiene ruta, publicable, y los errores por campo;
  - `region.ts` (`zonaDe`): ciudad, luego subregión y luego región, recortada a 40, y vacía sin datos;
  - `profile.ts` (`perfilParaGrafica`): agrupar en N columnas, mínimo y máximo, perfil vacío o `null`.

  (CA-1, CA-2, CA-3, CA-4, CA-5, CA-8, CA-11)
- [x] T13 — `lib/routes/api.ts`: `publishRoute`, `getRoute`, `updateRoute`, `deleteRoute`, `listMyRoutes`, `listFavorites`, `addFavorite` y `removeFavorite`, con límite de 10 s y resultado `{ ok, data }` / `{ ok: false, failure }`. Pruebas con `fetch` simulado: método, ruta, body y token de cada una; `404`, `409`, `400` con errores por campo; sin red y tiempo agotado. (CA-7, CA-13, CA-14)
- [x] T14 — Hooks `hooks/routes/`: `useRouteDetail` (estados `loading`, `success`, `offline`, `error` y `unavailable` ante un `404`), `useMyRoutes`, `useFavorites` y `useRouteMutations`, que al terminar invalidan `['routes']`. (CA-13, CA-14, CA-17)
- [x] T15 — Publicar:
  - `components/routes/RouteForm.tsx`;
  - `pages/routes/publishRoutePage.tsx`: zona propuesta con `reverseGeocodeAsync`, dificultad, tipo, distancia y elevación de solo lectura, aviso de privacidad, errores por campo, y conserva lo escrito si falla;
  - en el resumen de la actividad: "Publicar como ruta", "Ver ruta publicada" o el motivo por el que no se puede.

  (CA-1, CA-2, CA-3, CA-4, CA-5, CA-6, CA-7, CA-8)

  Implementada el 2026-10-20 (`tsc` y bundle de Android sin errores). "Ver ruta publicada" abre el detalle a partir de T16. Faltan los casos manuales M1–M3 en el dispositivo.
- [x] T16 — Detalle:
  - `pages/routes/routeDetailPage.tsx`: mapa con el recorrido completo, inicio y final; datos, autor, descripción, distancia hasta mí, marca "Tuya" o "Por SendaBC";
  - `components/routes/ElevationProfile.tsx`;
  - guardar y quitar de favoritas;
  - avisos de sin conexión con "Reintentar" y de "ya no está disponible";
  - "Ver detalle" en la tarjeta de "Explorar rutas".

  (CA-10, CA-11, CA-12, CA-13, CA-14, CA-15)

  Implementada el 2026-10-20 (`tsc` y bundle de Android sin errores). También conecta "Ver ruta publicada" del resumen (T15). Faltan los casos manuales M4, M5 y M7 en el dispositivo.
- [x] T17 — Acciones del dueño en el detalle (editar, archivar o volver a publicar, y borrar con confirmación) y `pages/routes/editRoutePage.tsx`. (CA-12, CA-22, CA-23, CA-24, CA-25)

  Implementada el 2026-10-20 (`tsc` y bundle de Android sin errores). Falta el caso manual M6 en el dispositivo.
- [x] T18 — `pages/routes/myRoutesPage.tsx` y `pages/routes/favoritesPage.tsx`, con sus listas, estados, la marca "Ya no disponible", quitar de favoritas y los mensajes de lista vacía. Botones "Mis rutas" y "Mis favoritas" en `MainPage`, y las rutas `PublishRoute`, `EditRoute`, `RouteDetail`, `MyRoutes` y `Favorites` en `App.tsx`. (CA-18, CA-19, CA-21, CA-27)

  Implementada el 2026-10-20 (`tsc` y bundle de Android sin errores). Las favoritas se quitan desde la lista con "Quitar" en cada fila, también las que ya no están disponibles (CA-19). Faltan los casos manuales M6–M8 en el dispositivo.

## Documentación

- [x] T19 — Al cerrar: tabla de verificación, estado de la spec y `specs/roadmap.md`.

## Cobertura

Los 27 CA están cubiertos por al menos una tarea.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | `publish.test.ts` › publicable · M1 | Ambas | Verificado (`publish.test.ts`; M1) |
| CA-2 | `publish.test.ts` › no sincronizada · M1 | Ambas | Verificado (`publish.test.ts`; M1) |
| CA-3 | `publish.test.ts` › menos de 1.5 km · `route.service.spec.ts` › `400` · M1 | Ambas | Verificado (`publish.test.ts`, `route.service.spec.ts`; M1) |
| CA-4 | `difficulty.spec.ts` / `difficulty.test.ts` · `region.test.ts` · M2 | Ambas | Verificado (`difficulty.spec.ts` y `difficulty.test.ts` con los mismos 43 casos, `region.test.ts`; M2) |
| CA-5 | `create-route.dto.spec.ts` · `publish.test.ts` › errores · `route-publish.e2e-spec.ts` › nombre de 41 · M2 | Ambas | Verificado (DTO, `publish.test.ts`, e2e; M2) |
| CA-6 | `route.service.spec.ts` › publicar · `route-publish.e2e-spec.ts` › `201` y en `nearby` · M2 | Ambas | Verificado (`route.service.spec.ts`, e2e; M2 con "Tuya" en el catálogo) |
| CA-7 | `api.test.ts` › sin red y `500` · M3 | Ambas | Verificado (`api.test.ts`; M3) |
| CA-8 | `route-publish.e2e-spec.ts` › `409` y publicar de nuevo tras borrar · `publish.test.ts` › ya tiene ruta · M2 | Ambas | Verificado (e2e `409` y publicar tras borrar; M2 y M6) |
| CA-9 | `route.service.spec.ts` · `route-publish.e2e-spec.ts` › actividad ajena `404` | Automatizada | Verificado (`route.service.spec.ts`, e2e) |
| CA-10 | `route.service.spec.ts` › detalle · M4 | Ambas | Verificado (`route.service.spec.ts`; M4) |
| CA-11 | `elevation-profile.spec.ts` · `rutas-ejemplo.spec.ts` › perfil · `profile.test.ts` · M4 | Ambas | Verificado (`elevation-profile.spec.ts`, `rutas-ejemplo.spec.ts`, `profile.test.ts`; M4) |
| CA-12 | `route.service.spec.ts` › `isMine` · M4 y M6 | Ambas | Verificado (`route.service.spec.ts`; M4 "Por SendaBC" y M6 "Tuya" con acciones) |
| CA-13 | `api.test.ts` · M5 | Ambas | Verificado (`api.test.ts`, `status.test.ts`; M5) |
| CA-14 | `route.service.spec.ts` › visibilidad · `route-publish.e2e-spec.ts` › archivada `404` · M7 | Ambas | Verificado (`route.service.spec.ts`, e2e; M7) |
| CA-15 | `route-publish.e2e-spec.ts` › guardar y quitar · M4 | Ambas | Verificado (e2e; M4) |
| CA-16 | `route.service.spec.ts` › idempotente · `route-publish.e2e-spec.ts` › dos veces | Automatizada | Verificado (`route.service.spec.ts` › `skipDuplicates`, e2e dos veces) |
| CA-17 | `route-publish.e2e-spec.ts` › favoritas por cuenta · M8 | Ambas | Verificado (e2e; M8 con otra sesión, sin segundo teléfono) |
| CA-18 | `route.service.spec.ts` › orden de favoritas · M8 | Ambas | Verificado (`route.service.spec.ts` › orden; M8 y mensaje de lista vacía) |
| CA-19 | `route-publish.e2e-spec.ts` › `available: false` tras archivar y borrar · M7 | Ambas | Verificado (e2e `available: false`; M7) |
| CA-20 | `route-publish.e2e-spec.ts` › favoritas del otro usuario | Automatizada | Verificado (e2e) |
| CA-21 | `route.service.spec.ts` › "Mis rutas" · M6 | Ambas | Verificado (`route.service.spec.ts`; M6) |
| CA-22 | `update-route.dto.spec.ts` · `route-publish.e2e-spec.ts` › editar · M6 | Ambas | Verificado (`update-route.dto.spec.ts`, e2e; M6) |
| CA-23 | `route-publish.e2e-spec.ts` › archivar · M6 | Ambas | Verificado (e2e; M6) |
| CA-24 | `route-publish.e2e-spec.ts` › volver a publicar · M6 | Ambas | Verificado (e2e; M6) |
| CA-25 | `route-publish.e2e-spec.ts` › borrar · M6 | Ambas | Verificado (e2e; M6) |
| CA-26 | `route.service.spec.ts` › `403` · `route-publish.e2e-spec.ts` › ajena y de ejemplo | Automatizada | Verificado (`route.service.spec.ts`, e2e con ruta ajena y de ejemplo) |
| CA-27 | `route.controller.spec.ts` › guard · `route-publish.e2e-spec.ts` › `401` | Automatizada | Verificado (`route.controller.spec.ts`, e2e `401` en los 8 endpoints) |
| CA-28 | `recorrido.spec.ts`, `route.service.spec.ts` › ubicación vieja y `frontend/lib/routes/publish.test.ts` | Automatizada | Verificado (2026-11-06). La consulta se comprobó solo con lectura sobre una actividad real: de 148 km a 1.68 km. El e2e de publicar pasa, pero no incluye un punto viejo |

Cierre (2026-10-21): los 27 CA están verificados. Pruebas finales: backend 223/223, e2e 56/56 (6 suites, incluida `route-publish.e2e-spec.ts` con 22 casos), frontend 295/295. Colección de Postman validada en T11 contra la API local, 54/54, con un ejecutor en Node porque `newman` no está instalado (constitución 6.3). Casos manuales M1–M8 en el emulador con el development build de la 006 (ver "Resultado de los casos manuales").

### Casos manuales

En el emulador o el teléfono con el development build (spec 006, D7), el backend corriendo y las rutas de ejemplo cargadas (`npm run seed:rutas`). Hace falta una actividad sincronizada de más de 1.5 km y otra de menos; se pueden grabar en el emulador con una ruta GPX simulada.

**M1 — Cuándo se puede publicar**
1. En la pestaña Actividades, abrir el resumen de una actividad "Pendiente de subir". 2. El de una sincronizada de menos de 1.5 km. 3. El de una sincronizada de 3 km.
- **Esperado:** (1) no hay "Publicar como ruta" y se explica que primero tiene que subirse. (2) se explica que una ruta debe medir al menos 1.5 km. (3) aparece "Publicar como ruta".

**M2 — Publicar**
1. En la de 3 km, tocar "Publicar como ruta". 2. Dejar el nombre vacío y publicar. 3. Escribir 41 caracteres. 4. Escribir un nombre válido, cambiar la zona y publicar. 5. Volver al resumen. 6. Abrir la pestaña Rutas cerca del inicio.
- **Esperado:** (1) formulario con la zona ya llenada, dificultad, tipo, distancia y elevación de solo lectura y el aviso de que se publica completo. (2) y (3) mensaje junto al nombre, no se publica. (4) confirmación. (5) aparece "Ver ruta publicada". (6) la ruta aparece con la marca "Tuya".

**M3 — Publicar sin conexión**
1. Con el formulario lleno, activar el modo avión y publicar. 2. Quitar el modo avión y volver a publicar.
- **Esperado:** (1) mensaje de que hace falta conexión; lo escrito sigue ahí. (2) se publica.

**M4 — Detalle y favorita**
1. En la pestaña Rutas, tocar una ruta de ejemplo y "Ver detalle". 2. Tocar "Guardar en favoritas" y luego "Quitar de favoritas".
- **Esperado:** (1) mapa con el recorrido completo, nombre, tipo, zona, dificultad, distancia, elevación, "Por SendaBC", "A X km de ti" y el perfil de elevación. (2) el botón cambia en cada toque.

**M5 — Detalle sin conexión**
1. Con el modo avión activado, abrir el detalle de una ruta. 2. Quitar el modo avión y tocar "Reintentar".
- **Esperado:** (1) mensaje con "Reintentar", sin carga infinita. (2) aparece el detalle.

**M6 — Mis rutas: editar, archivar, volver a publicar y borrar**
1. Pestaña Rutas → "Mis rutas" (ícono del encabezado). 2. Abrir la ruta publicada en M2 y editar el nombre. 3. Archivarla. 4. Volver a publicarla. 5. Borrarla y confirmar.
- **Esperado:** (1) la lista muestra la ruta como "Publicada". (2) el nombre nuevo se ve en el detalle y en la pestaña Rutas. (3) queda "Archivada" en "Mis rutas" y desaparece del mapa. (4) vuelve al mapa y queda "Publicada". (5) desaparece de "Mis rutas" y del mapa, y en el resumen de la actividad vuelve a aparecer "Publicar como ruta".

**M7 — Favorita que deja de estar disponible**
1. Con la cuenta B, guardar en favoritas una ruta de la cuenta A. 2. Con la cuenta A, archivarla. 3. Con la cuenta B, en la pestaña Rutas, abrir "Mis favoritas" (corazón del encabezado) y tocarla. 4. Quitarla de favoritas.
- **Esperado:** (3) aparece con la marca "Ya no disponible" y al tocarla se ve "Esta ruta ya no está disponible". (4) desaparece de la lista.

**M8 — Mis favoritas en otro teléfono**
1. Con favoritas guardadas, cerrar sesión e iniciarla en otro emulador o teléfono. 2. En la pestaña Rutas, abrir "Mis favoritas" (corazón del encabezado).
- **Esperado:** están las mismas favoritas, la más reciente primero. Sin favoritas, se ve el mensaje que explica cómo guardarlas.

### Resultado de los casos manuales (2026-10-21)

En el emulador `Pixel_10_Pro` con el development build de la 006 (sin cambios nativos en la 007), el backend local y las rutas de ejemplo con perfil. Cuenta A: la de la colección de Postman; cuenta B: una de prueba creada para M7 y borrada al terminar, junto con las rutas y favoritas de prueba.

| Caso | Resultado | Notas |
|---|---|---|
| M1 | Pasa | Pendiente: "primero tiene que subirse"; al sincronizarse (65 m), "al menos 1.5 km" en el mismo resumen; 3.20 km: "Publicar como ruta". |
| M2 | Pasa | Zona propuesta ("Baja California"), dificultad Fácil, aviso de privacidad; errores de nombre vacío y de 41; publicada con "Tuya" en el catálogo y "Ver ruta publicada" en el resumen. |
| M3 | Pasa | Sin conexión, mensaje y lo escrito se conserva; con conexión se publica. En el océano la zona queda vacía (RN-7). |
| M4 | Pasa | Detalle de ruta de ejemplo con mapa, datos, "Por SendaBC", "A 17.60 km de ti" y perfil; favorita alterna en cada toque sin volver a "cargando". |
| M5 | Pasa | Aviso con "Reintentar" sin carga infinita; con conexión aparece el detalle. |
| M6 | Pasa | Editar (catálogo y detalle), archivar (fuera de `nearby`, "Archivada"), volver a publicar y borrar con confirmación, sin el aviso de "no disponible"; la actividad vuelve a ofrecer publicar. |
| M7 | Pasa | Pasos 1 y 2 por la API. B ve "Ya no disponible", al tocarla "Esta ruta ya no está disponible", y la quita de la lista. |
| M8 | Pasa con nota | Las favoritas se ven en una sesión nueva y las guardadas por la API aparecen en la app, la más reciente primero; mensaje de lista vacía. No había un segundo teléfono: se simuló con otra sesión. |

Observaciones (no bloquean ningún CA):
- En el detalle, el mapa de "Cañón de Guadalupe" parecía cortar el extremo del recorrido. Revisado de nuevo, el recorrido sí cabía (unos 150 px de margen por lado); lo que se cortaba eran las etiquetas del mapa. Aun así, el detalle ahora encuadra con `fitToCoordinates` al cargar el mapa, con un margen fijo de 32 pt, en lugar de depender de cómo interpreta Android `initialRegion`. Comprobado en el emulador.
- El eje del perfil marca la distancia medida sobre los puntos (3.25 km) y la ruta, la de la actividad (3.20 km, RN-1).

## Commits propuestos

| # | Commit | Tareas |
|---|---|---|
| 1 | `feat(007): estado DELETED y perfil de elevación en rutas` | T1 |
| 2 | `feat(007): dificultad, perfil y validaciones de rutas` | T2–T4 |
| 3 | `feat(007): publicar, detalle, administrar y favoritas en el backend` | T5–T8 |
| 4 | `test(007): e2e de publicar rutas y colección de Postman` | T9, T11 |
| 5 | `feat(007): rutas de ejemplo con perfil y dificultad calculada` | T10 |
| 6 | `feat(007): lógica, cliente y hooks de publicar rutas` | T12–T14 |
| 7 | `feat(007): publicar una actividad como ruta` | T15 |
| 8 | `feat(007): detalle de ruta, favoritas y Mis rutas` | T16–T18 |
| 9 | `fix(007)`: ajustes de los casos manuales | — |
| 10 | `docs(007): verificación y estado de la spec` | T19 |

Así quedan los tres tipos de la semana: `feat(007)` (1–3 y 5–8), `test/fix(007)` (4 y 9) y `docs(007)` (10).

## Pendientes conocidos

- Correr la colección de Postman una vez en Postman (T11 se validó con un ejecutor en Node).
- M8 se probó con otra sesión en el mismo emulador; falta verlo en un segundo teléfono.
- El eje del perfil marca la distancia medida sobre los puntos y la ruta, la de la actividad (RN-1); con datos reales la diferencia debería ser pequeña. Revisar en la prueba de campo (009).
