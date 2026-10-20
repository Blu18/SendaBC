# 007 — Plan técnico

Estado: **Aprobado** (2026-10-20)

Spec: [spec.md](spec.md)

## Resumen

**Backend:** el módulo `route` de la spec 006 crece con ocho endpoints protegidos:
- publicar una actividad como ruta;
- ver el detalle;
- editar, archivar, volver a publicar y borrar;
- "Mis rutas" y "Mis favoritas";
- guardar y quitar favoritas.

Al publicar, el servidor toma de la actividad el tipo, la distancia, la elevación ganada y el recorrido (RN-1), calcula la dificultad (RN-6) y arma el perfil de elevación con la altitud GPS de los puntos (RN-8). El perfil se guarda en la ruta para no recalcularlo en cada detalle. Borrar es lógico (estado `DELETED`): así las favoritas de los demás pueden mostrar "Ya no disponible" (CA-19) y la actividad queda libre para publicarse de nuevo (RN-2).

**Datos:** una migración agrega el estado `DELETED` y la columna del perfil. Las rutas de ejemplo se regeneran con su perfil (de las altitudes del GPX) y con la dificultad calculada por la misma regla.

**Frontend:** cinco pantallas nuevas:
- publicar;
- detalle, con mapa del recorrido completo y perfil;
- editar;
- "Mis rutas";
- "Mis favoritas".

Además, un botón en el resumen de la actividad, "Ver detalle" en la tarjeta del catálogo y dos botones en la pantalla principal. La app calcula la dificultad con la misma regla que el servidor, para mostrarla en el formulario antes de publicar, y propone la zona con `reverseGeocodeAsync` de `expo-location`. El perfil se dibuja con vistas de React Native, sin una librería de gráficas.

## Verificación contra la constitución

- [x] **Art. 1 La spec primero:** spec aprobada el 2026-10-20. RN-8 se corrigió al escribir este plan: en el servidor solo existe la altitud GPS de cada punto. La corrección está anotada en el historial de la spec.
- [x] **Art. 2 Offline-first:** publicar, el detalle, favoritas y "Mis rutas" necesitan red, como dice la spec. Ninguna de estas acciones toca la grabación ni la cola de sincronización. Sin conexión, la app no hace la petición y muestra el aviso (CA-7, CA-13). Solo se puede publicar una actividad `SYNCED` (CA-2), así que publicar nunca adelanta ni altera la sincronización (2.3, 2.4).
- [x] **Art. 3.2 / 3.3 Seguridad:** todos los endpoints usan `JwtAuthGuard`. El dueño sale del token:
  - para publicar, la actividad debe ser del usuario del token;
  - para editar, archivar o borrar, la ruta debe ser suya;
  - las favoritas son siempre las del token.

  Las respuestas muestran el `displayName` del autor, nunca su correo (requisitos no funcionales de la spec).
- [x] **Art. 3.5 Ubicación:** la zona se deduce del **inicio de la ruta**, no de la ubicación del usuario. Para eso se usa la geocodificación inversa del sistema (`reverseGeocodeAsync`), que en Android consulta el servicio de Google. Se envían las coordenadas de un recorrido que de todos modos va a ser público, y no se guarda nada más.
- [x] **Art. 4.1–4.4 Contratos:** cada body se valida con un DTO de class-validator y mensajes en español. Códigos:
  - `400` validación, incluido el mínimo de 1.5 km;
  - `401` sin token;
  - `403` acción sobre una ruta ajena;
  - `404` no existe o no está disponible;
  - `409` la actividad ya tiene una ruta.

  Los endpoints están documentados abajo.
- [x] **Art. 5.1 Esquema:** migración `20261020000000_routes_publish`.
- [x] **Art. 5.2 Geodatos:** `routes.path` sigue como `geometry(LineString, 4326)`, copiado de `activities.path`, y `startPoint` como `geography(Point, 4326)` (spec 006, D1).
- [x] **Art. 5.4 Unidades:** el perfil va en metros (distancia acumulada y altitud) y las fechas en ISO 8601.
- [x] **Art. 6.1 / 6.3 Verificación:**
  - Vitest en el backend: DTOs, dificultad, perfil, servicio, controlador y e2e.
  - Vitest en la lógica pura del frontend: dificultad, validación, perfil, cliente de la API.
  - Casos manuales para las pantallas.
  - Requests nuevas en la colección de Postman.
- [x] **Art. 7.1 Stack:** sin dependencias nuevas. La geocodificación es de `expo-location` y el perfil se dibuja con `View` (D4).

## Backend

### Endpoints

Todos con `JwtAuthGuard`. `RouteDetail`, `MyRoute` y `FavoriteRoute` se definen abajo.

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| POST | `/routes` | JWT | `{ activityId, name, description?, region? }` | `201 RouteDetail` | `400` validación, actividad de menos de 1.5 km o sin recorrido (menos de 2 puntos) · `404` actividad inexistente o ajena · `409` la actividad ya tiene una ruta publicada o archivada |
| GET | `/routes/:id` | JWT | — | `200 RouteDetail` | `404` "Esta ruta ya no está disponible" (no existe, borrada, o archivada y ajena) |
| PATCH | `/routes/:id` | JWT (dueño) | `{ name?, description?, region?, status?: 'PUBLISHED' \| 'ARCHIVED' }` | `200 RouteDetail` | `400` · `403` ruta ajena (incluidas las de ejemplo) · `404` |
| DELETE | `/routes/:id` | JWT (dueño) | — | `204` | `403` · `404` |
| GET | `/routes/mine` | JWT | — | `200 MyRoute[]`, la más reciente primero | — |
| GET | `/routes/favorites` | JWT | — | `200 FavoriteRoute[]`, la guardada más reciente primero | — |
| PUT | `/routes/:id/favorite` | JWT | — | `204` (idempotente, CA-16) | `404` ruta no disponible |
| DELETE | `/routes/:id/favorite` | JWT | — | `204` (idempotente; funciona aunque la ruta ya no esté disponible, CA-19) | — |

`GET /routes/nearby` (spec 006) no cambia: sigue mostrando solo `PUBLISHED`, así que las archivadas y las borradas desaparecen del catálogo (CA-23, CA-25).

```ts
RouteDetail = {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  type: 'HIKING' | 'TRAIL_RUNNING' | 'CYCLING';
  difficulty: 'EASY' | 'MODERATE' | 'HARD' | 'EXTREME';
  distanceMeters: number;
  elevationGainMeters: number;
  start: { latitude: number; longitude: number };
  path: [number, number][];                 // [lng, lat], simplificado a ~2 m (D3)
  elevationProfile: [number, number][] | null; // [distancia acumulada m, altitud m], ≤ 200 puntos
  author: string;                           // displayName
  isMine: boolean;
  isFavorite: boolean;
  status: 'PUBLISHED' | 'ARCHIVED';
  sourceActivityId: string | null;         // solo para el dueño; null para los demás
  publishedAt: string;                      // createdAt, ISO 8601
}
MyRoute = { id; name; type; distanceMeters; status: 'PUBLISHED' | 'ARCHIVED'; sourceActivityId; publishedAt }
FavoriteRoute = { id; name; type; distanceMeters; elevationGainMeters; available: boolean; savedAt }
```

**Reglas del servidor:**
- **Publicar (`POST /routes`):** en una transacción, busca la actividad del usuario del token (`404` si no existe o es ajena). Rechaza con `400` si `distanceMeters < 1500` (RN-5) o si la actividad no tiene recorrido y con `409` si ya tiene una ruta no borrada (RN-2). Inserta con SQL:
  - `path = activities.path`;
  - `startPoint = ST_StartPoint(path)::geography`;
  - `type`, `distanceMeters` y `elevationGainMeters` de la actividad;
  - `difficulty = dificultadDe(type, distancia, elevación)` (RN-6);
  - `elevationProfile = perfilDe(puntos)` (D2);
  - `status = PUBLISHED`.

  Una carrera entre dos publicaciones de la misma actividad la frena el `UNIQUE` de `sourceActivityId`, que también responde `409`.
- **Detalle (`GET /routes/:id`):** visible si `PUBLISHED`, o si `ARCHIVED` y es del usuario del token. `DELETED` nunca se muestra.
- **Editar o archivar (`PATCH`):** valida con los mismos límites que al publicar (RN-4, RN-7). `status` solo puede alternar entre `PUBLISHED` y `ARCHIVED` (CA-23, CA-24). No permite cambiar el tipo, la dificultad, la distancia, la elevación ni el recorrido (RN-1): el DTO no los declara y el `whitelist` los descarta.
- **Borrar (`DELETE`):** borrado lógico, `status = DELETED` y `sourceActivityId = NULL`. Las favoritas se conservan y la actividad queda libre para publicarse de nuevo (CA-25, RN-2).
- **Favoritas (`GET /routes/favorites`):** `available = status = PUBLISHED, o (ARCHIVED y es mía)`. Las de rutas borradas siguen en la lista con `available: false` (CA-19).

### Módulos / archivos

- `backend/src/route/route.controller.ts`: los endpoints nuevos. `mine` y `favorites` se declaran antes de `:id`, y `:id` usa `ParseUUIDPipe` con un `404`.
- `backend/src/route/route.service.ts`: `publish`, `detail`, `update`, `remove`, `listMine`, `listFavorites`, `addFavorite`, `removeFavorite`.
- `backend/src/route/dto/create-route.dto.ts` y `update-route.dto.ts`: `name` sin espacios al inicio y al final, de 1 a 40 caracteres; `description` de hasta 200 y `region` de hasta 40; en las dos, `null` o una cadena vacía (o solo con espacios) la borran; `status` con `@IsIn(['PUBLISHED', 'ARCHIVED'])`.
- `backend/src/route/difficulty.ts`: `dificultadDe(type, distanceMeters, elevationGainMeters)` con la tabla de RN-6. La función es pura y la usan el servicio y el seed.
- `backend/src/route/elevation-profile.ts`: `perfilDe(puntos)`. Lleva la distancia acumulada con haversine sobre los puntos en orden, se queda con los que tienen altitud y muestrea a 200 puntos como máximo por distancia. Sin altitudes devuelve `null`.
- `backend/prisma/seed/gpx-a-json.ts`: agrega `elevationProfile` (con `perfilDe` sobre la traza GPX completa) y calcula `difficulty` con `dificultadDe`. `rutas-ejemplo.fuentes.json` ya no lleva dificultad.
- `backend/prisma/seed/rutas-ejemplo.ts`: guarda `elevationProfile`.
- `backend/test/route-publish.e2e-spec.ts`: e2e del ciclo completo (ver tareas).

### Cambios de esquema (Prisma)

Migración: `20261020000000_routes_publish`.

```prisma
enum RouteStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  DELETED   // nuevo: borrado lógico (CA-25)
}

model Route {
  // ...
  elevationProfile Json?   // [[distancia m, altitud m], ...], ≤ 200 puntos (RN-8)
}
```

```sql
ALTER TYPE "RouteStatus" ADD VALUE 'DELETED';
ALTER TABLE "routes" ADD COLUMN "elevationProfile" JSONB;
```

Las rutas existentes son solo las de ejemplo y se regeneran con `seed:rutas` después de la migración. `Activity.isPublished`, que viene del modelo de la semana 1 y no se usa, se deja sin tocar: saber si una actividad tiene ruta se deduce de `routes.sourceActivityId`.

## Frontend

### Lógica pura (`lib/routes/`, con pruebas Vitest)

| Archivo | Contenido |
|---|---|
| `difficulty.ts` | `dificultadDe(type, distanceMeters, elevationGainMeters)`: la misma tabla de RN-6 que el backend (D1). Las pruebas usan los mismos casos en ambos lados, incluidos los ejemplos de la spec |
| `publish.ts` | `MIN_PUBLISH_DISTANCE_M = 1500`; `validarRuta({ name, description, region })` devuelve errores por campo en español (RN-4, RN-7); `motivoNoPublicable(actividad, rutaExistente)` dice si se puede publicar o por qué no: no sincronizada, menos de 1.5 km o ya tiene ruta (CA-1 a CA-3, CA-8) |
| `profile.ts` | `perfilParaGrafica(perfil, columnas)`: agrupa el perfil en N columnas con su altitud máxima, mínima y normalizada, para dibujarlo con `View` (D4) |
| `region.ts` | `zonaDe(direccion)`: de la respuesta de `reverseGeocodeAsync`, usa `city`, luego `subregion` y luego `region`, recortado a 40 caracteres; sin dato, `''` (RN-7) |
| `api.ts` (se extiende) | `publishRoute`, `getRoute`, `updateRoute`, `deleteRoute`, `listMyRoutes`, `listFavorites`, `addFavorite`, `removeFavorite`: mismo patrón `{ ok, data }` / `{ ok: false, failure }` con límite de 10 s |

### Hooks (`hooks/routes/`)

- `useRouteDetail(id)`: query `['routes', 'detail', id]`; revisa la red con `hayConexion` como `useNearbyRoutes` (CA-13). Un `404` se traduce en el estado `unavailable` (CA-14).
- `useMyRoutes()` y `useFavorites()`: queries `['routes', 'mine']` y `['routes', 'favorites']`.
- `useRouteMutations()`: publicar, editar, archivar, volver a publicar, borrar y favorita. Al terminar invalidan `['routes']`, así que el catálogo, el detalle y las listas se refrescan juntos.

### Pantallas y navegación

- `pages/routes/publishRoutePage.tsx` (`PublishRoute`, parámetro `localId`): formulario con nombre, descripción y zona. La zona se propone al abrir con `reverseGeocodeAsync` sobre el inicio del recorrido. La pantalla muestra la dificultad calculada, el tipo, la distancia y la elevación como solo lectura, y el aviso de privacidad. Si falla, conserva lo escrito y permite reintentar (CA-3 a CA-7).
- `pages/routes/editRoutePage.tsx` (`EditRoute`, `id`): reutiliza el formulario (`components/routes/RouteForm.tsx`) con nombre, descripción y zona (CA-22).
- `pages/routes/routeDetailPage.tsx` (`RouteDetail`, `id`), con:
  - mapa con el recorrido completo, inicio y final;
  - datos de la ruta y perfil de elevación (`components/routes/ElevationProfile.tsx`);
  - "Guardar en favoritas" o "Quitar de favoritas";
  - si es mía: editar, archivar o volver a publicar, y borrar con confirmación (`Alert`).

  Muestra los avisos de "sin conexión" con "Reintentar" y de "ya no está disponible" (CA-10 a CA-15, CA-23 a CA-25). El mapa sigue la regla de la 006: no inserta elementos en medio.
- `pages/routes/myRoutesPage.tsx` (`MyRoutes`): lista con su estado y el mensaje de lista vacía (CA-21).
- `pages/routes/favoritesPage.tsx` (`Favorites`): lista con la marca "Ya no disponible" y la opción de quitar (CA-18, CA-19).
- `pages/activity/activitySummaryPage.tsx`: botón "Publicar como ruta" o "Ver ruta publicada", o el motivo por el que no se puede (CA-1 a CA-3, CA-8). Para saber si la actividad ya tiene ruta, la pantalla busca su `serverId` en `useMyRoutes()` por `sourceActivityId`.
- `pages/routes/exploreRoutesPage.tsx`: botón "Ver detalle" en la tarjeta (CA-10).
- `pages/main/mainPage.tsx`: botones "Mis rutas" y "Mis favoritas" (P8).
- `App.tsx`: rutas `PublishRoute`, `EditRoute`, `RouteDetail`, `MyRoutes` y `Favorites`.
- Cambios a SQLite: ninguno. Todo lo de esta spec vive en el servidor.

## Decisiones

| # | Decisión | Alternativas consideradas | Motivo |
|---|---|---|---|
| D1 | La regla de dificultad está duplicada: una función pura en el backend y otra en el frontend, con los mismos casos de prueba | Un endpoint de vista previa; calcularla solo en el servidor y no mostrarla antes de publicar | El formulario debe mostrarla antes de publicar (CA-4). La regla es una tabla de 8 números; dos copias probadas con los mismos casos son más simples que una petición extra. El servidor es el que manda: la calcula de nuevo al guardar. |
| D2 | El perfil se calcula al publicar y se guarda en `routes.elevationProfile` (≤ 200 puntos) | Calcularlo en cada detalle con los puntos de la actividad; guardar el recorrido como `LineStringZ` | Leer 5 400 puntos en cada detalle iría contra los 2 s (requisitos no funcionales). Además, las rutas de ejemplo no tienen actividad y su perfil sale del GPX. 200 puntos se dibujan bien en el ancho de un teléfono. |
| D3 | El detalle devuelve el recorrido simplificado a ~2 m (`ST_Simplify` 0.00002) | El recorrido completo; el mismo de ~5 m del catálogo | A escala de calle, 2 m no se notan y una ruta de 3 h baja de ~5 400 a unos cientos de puntos (requisitos de datos y rendimiento). |
| D4 | El perfil se dibuja con columnas de `View` (una por grupo de puntos) | `react-native-svg` u otra librería de gráficas | No agrega dependencias (constitución 7.1). Para "altitud contra distancia" bastan columnas con su altura; se puede cambiar a SVG en la 009 si hace falta. |
| D5 | Borrado lógico: `DELETED` y `sourceActivityId = NULL` | Borrar la fila (las favoritas se borran en cascada); una columna `deletedAt` | CA-19 pide que la favorita siga en la lista como "Ya no disponible", y RN-2 pide que la actividad quede libre. Un valor más del enum ya existente es el cambio más chico. |
| D6 | La zona se deduce en el teléfono con `reverseGeocodeAsync` sobre el inicio de la ruta | Elegir la zona de la ruta de ejemplo más cercana; un servicio de geocodificación en el backend | Ya está en `expo-location` (en el stack) y da nombres reales ("Ensenada", "Tecate"). Publicar ya necesita red, así que no pierde nada sin conexión. Si no responde, el campo queda vacío (RN-7). |
| D7 | Saber si una actividad tiene ruta se resuelve con `GET /routes/mine` (`sourceActivityId`) | Un campo nuevo en `GET /activities`; guardarlo en SQLite | No cambia la API de la 005 ni el esquema local, y la misma query sirve para "Mis rutas" (CA-21). |

## Riesgos

- **Perfil ruidoso:** la altitud GPS puede variar decenas de metros entre puntos. El perfil se muestra tal cual (muestreado), sin suavizar. Si se ve mal en la prueba de campo, se suaviza en la 009.
- **Actividad sin altitudes:** si ningún punto trajo altitud, el perfil queda `null`. La spec dice que todas las rutas tienen perfil (CA-11), así que en ese caso raro el detalle muestra "Esta ruta no tiene datos de elevación". Lo aclararemos en la spec si aparece en la prueba.
- **Dificultad de las rutas de ejemplo:** al aplicar RN-6 cambian algunas que se pusieron a mano en la 006 (por ejemplo, La Otra Baja 100 pasa a Extrema por sus 111 km). Es lo que pide RN-6.
- **Geocodificación:** depende de Google Play Services; en el emulador puede no responder. En ese caso el campo queda vacío y se escribe a mano.
- **Mapa en Android:** el detalle usa `react-native-maps` con la misma limitación de la 006 (no insertar elementos en medio de la lista). Como el detalle tiene elementos fijos, el riesgo es bajo.

## Historial

- 2026-10-20 — Al implementar T6: `RouteDetail.sourceActivityId` solo se llena para el dueño (para los demás es `null`), porque es un dato de su actividad que nadie más necesita. Para editar o borrar, una ruta que el usuario no puede ver (archivada y ajena, o borrada) responde `404` y una que ve pero no es suya, `403`.
- 2026-10-20 — Al implementar T5: `POST /routes` también responde `400` si la actividad tiene menos de 2 puntos, porque sin `activities.path` la ruta no tendría recorrido ni inicio (RN-1). `RouteService.publish` devuelve el id y el controlador responde con el detalle (T8).
- 2026-10-20 — Al implementar T4: `null` o una cadena vacía también borran la descripción, no solo la zona. La descripción es opcional y sin esto no habría forma de quitarla al editar (CA-22).
- 2026-10-20 — Aprobado por el usuario.
- 2026-10-20 — Creación.
