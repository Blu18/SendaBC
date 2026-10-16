# 006 — Plan técnico

Estado: **Aprobado** (2026-10-16)

Spec: [spec.md](spec.md)

## Resumen

**Backend:** un módulo nuevo, `route`, con un solo endpoint protegido: `GET /routes/nearby`. Busca en PostGIS las rutas **publicadas** cuyo punto de inicio está dentro del radio (`ST_DWithin` sobre `geography`, en metros), ordenadas por cercanía, como máximo 50. Devuelve un recorrido simplificado para dibujarlo sin descargar todos los puntos.

**Datos:** una migración cambia `routes.startPoint` a `geography(Point, 4326)` con índice GIST, como pide el plan de la semana. Un script de semilla carga y quita las **rutas de ejemplo** de Baja California, creadas por un usuario del sistema "SendaBC".

**Frontend:** `react-native-maps`, que ya está en el stack. Una pantalla nueva, "Explorar rutas", con:
- el mapa con los recorridos y sus marcadores;
- la tarjeta de la ruta seleccionada;
- el filtro por tipo y el selector de radio;
- "Buscar en esta zona" y el botón para volver a centrar.

La distancia hasta el usuario se calcula en el teléfono con `haversineMeters`, que ya existe desde la spec 004.

## Verificación contra la constitución

- [x] **Art. 2.1 Offline-first:** explorar necesita red (spec CA-15), pero no afecta la grabación. Sin conexión no se hace la petición.
- [x] **Art. 3.3:** `JwtAuthGuard`. La marca "Tuya" se calcula con el id del token, no con un parámetro.
- [x] **Art. 3.5 Privacidad:** la ubicación viaja solo como centro de la búsqueda; el servidor no la guarda ni la registra en logs.
- [x] **Art. 3.6:** el usuario del sistema "SendaBC" tiene una contraseña aleatoria que no se guarda en ningún lado, así que nadie puede iniciar sesión con él.
- [x] **Art. 4.1–4.4:** DTO de consulta con class-validator, `400` con mensajes en español, `401` sin token; el endpoint está documentado abajo.
- [x] **Art. 5.1:** migración de Prisma `20261016000000_routes_start_point_geography`.
- [x] **Art. 5.2:** SRID 4326, `ST_MakePoint(longitud, latitud)`. `startPoint` pasa a `geography` para medir en metros; `path` sigue como `geometry(LineString, 4326)` para simplificarlo y dibujarlo.
- [x] **Art. 5.4:** metros y kilómetros según RN-4.
- [x] **Art. 6.1 / 6.3:** Vitest en el backend (DTO, servicio, e2e) y en la lógica pura del frontend; casos manuales para el mapa; requests nuevas en la colección de Postman.
- [x] **Art. 7.1:** `react-native-maps` ya está en el stack. No hay dependencias nuevas.

## Backend

### Endpoint

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/routes/nearby` | JWT | Query: `lat` (−90…90), `lng` (−180…180), `radiusKm` (1…100, por defecto 25), `type` (opcional: `HIKING` \| `TRAIL_RUNNING` \| `CYCLING`) | `200 NearbyRoute[]`: hasta 50, la más cercana primero | `400` parámetros inválidos, `401` |

```ts
NearbyRoute = {
  id: string;
  name: string;
  type: 'HIKING' | 'TRAIL_RUNNING' | 'CYCLING';
  difficulty: 'EASY' | 'MODERATE' | 'HARD' | 'EXTREME' | null;
  distanceMeters: number | null;        // guardado al publicar (RN-3)
  elevationGainMeters: number | null;
  start: { latitude: number; longitude: number };
  distanceFromCenterMeters: number;     // hasta el centro de la búsqueda (RN-1)
  path: [number, number][];             // [longitud, latitud], simplificado
  author: string;                       // displayName del creador: "SendaBC" en las de ejemplo (CA-19)
  isMine: boolean;                      // CA-6
}
```

**Consulta** (`RouteService.nearby`, con `$queryRaw`):

```sql
WITH centro AS (SELECT ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography AS g)
SELECT r.id, r.name, r.type, r.difficulty, r."distanceMeters", r."elevationGainMeters",
       ST_Y(r."startPoint"::geometry) AS lat, ST_X(r."startPoint"::geometry) AS lng,
       ST_Distance(r."startPoint", centro.g) AS "distanceFromCenterMeters",
       ST_AsGeoJSON(ST_Simplify(r.path, 0.00005)) AS path,    -- ~5 m de tolerancia
       u."displayName" AS author, (r."createdByUserId" = $userId) AS "isMine"
FROM routes r JOIN users u ON u.id = r."createdByUserId", centro
WHERE r.status = 'PUBLISHED'
  AND ST_DWithin(r."startPoint", centro.g, $radiusKm * 1000)
  AND ($type IS NULL OR r.type = $type::"ActivityType")
ORDER BY "distanceFromCenterMeters"
LIMIT 50;
```

### Archivos

- `backend/src/route/route.module.ts`, `route.controller.ts`, `route.service.ts`
- `backend/src/route/dto/nearby-query.dto.ts`: `@Type(() => Number)` para los parámetros de la query y `@Min`/`@Max`/`@IsEnum`, con mensajes en español.
- `backend/src/app.module.ts`: importar `RouteModule`.

### Migración Prisma `20261016000000_routes_start_point_geography`

```prisma
model Route {
  // ...
  startPoint Unsupported("geography(Point, 4326)")?
  @@index([startPoint], map: "routes_startPoint_gist_idx", type: Gist)
}
```

```sql
ALTER TABLE routes ALTER COLUMN "startPoint" TYPE geography(Point, 4326) USING "startPoint"::geography;
CREATE INDEX "routes_startPoint_gist_idx" ON routes USING GIST ("startPoint");
```

La tabla está vacía: la publicación llega en la 007. Antes de `migrate deploy` se confirma con una consulta de solo lectura.

### Rutas de ejemplo (CA-18 a CA-20)

- `backend/prisma/seed/rutas-ejemplo.json`: al menos 12 rutas en 4 zonas o más (Ensenada, Tecate, Sierra de Juárez, Sierra de San Pedro Mártir; opcionalmente Valle de Guadalupe y Rosarito), de los tres tipos de actividad. Cada ruta lleva:
  - `id` UUID fijo;
  - nombre, tipo, dificultad, región, descripción y desnivel;
  - recorrido de 10 a 40 puntos `[longitud, latitud]`.

  Los recorridos son **aproximados**: sirven para desarrollar, no para navegar.
- `backend/prisma/seed/rutas-ejemplo.ts`, que se ejecuta con Node 24, que entiende TypeScript sin compilar:
  - `npm run seed:rutas`: crea, si no existe, el usuario del sistema `catalogo@senda.bc` con nombre "SendaBC" y una contraseña aleatoria que no se guarda. Luego hace `INSERT … ON CONFLICT (id) DO UPDATE` de cada ruta: `status = PUBLISHED`, `path` desde las coordenadas, `startPoint` con el primer punto y `distanceMeters = ST_Length(path::geography)`, calculada una sola vez (RN-3). Volver a correrlo no duplica nada (CA-20).
  - `npm run seed:rutas:quitar`: borra solo las rutas de ese usuario y luego al usuario. No toca rutas ni actividades de nadie más (CA-20).

## Frontend

### Dependencia

- `react-native-maps` (`npx expo install react-native-maps`). En Expo Go funciona sin configuración. Para el build de la tienda (spec 010) hará falta la clave `androidGoogleMapsApiKey` en el plugin (ver Riesgos).

### Lógica pura (`lib/routes/`, con pruebas Vitest)

| Archivo | Contenido |
|---|---|
| `constants.ts` | `RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100]`, `DEFAULT_RADIUS_KM = 25`, `MAX_ROUTES = 50`, `BAJA_CALIFORNIA_REGION` (todo el estado, CA-14) |
| `geo.ts` | `pathToCoordinates(path)` de `[lng, lat]` a `{ latitude, longitude }`; `distanceFromUser(route, user)` con `haversineMeters` (CA-7, RN-2); `hasMovedEnough(lastCenter, region, radiusKm)` para mostrar "Buscar en esta zona" cuando el centro se movió más del 20 % del radio (CA-9) |
| `format.ts` | `DIFFICULTY_LABELS` (Fácil, Moderada, Difícil, Extrema); el texto de la tarjeta reusa `formatDistance`, `formatElevation` y `ACTIVITY_TYPE_LABELS` (RN-4) |
| `api.ts` | `fetchNearbyRoutes(token, { center, radiusKm, type })` sobre `apiFetch` con límite de 10 s. Devuelve `{ ok, data }` o `{ ok: false, failure }`, como en `lib/sync/api.ts` |

### Hook `hooks/routes/useNearbyRoutes.ts`

- TanStack Query (datos remotos, igual que el perfil), con clave `['routes', 'nearby', center, radiusKm, type]`. Solo busca cuando se lo piden: al abrir con ubicación, con "Buscar en esta zona", al volver a centrar o al cambiar el radio o el tipo.
- Antes de pedir, revisa la red con `hayConexion`. Sin conexión no hace la petición y devuelve el estado `offline` (CA-15).
- Expone `routes`, `status` (`idle` / `loading` / `success` / `empty` / `offline` / `error`), `search(center)` y `retry()` (CA-13, CA-16).

### Pantalla `pages/routes/exploreRoutesPage.tsx`

- **Al abrir:** pide el permiso de ubicación con `useLocationPermission`.
  - Con permiso: `getCurrentPositionAsync`, centra el mapa y busca (CA-1).
  - Sin permiso: muestra `BAJA_CALIFORNIA_REGION`, no busca y muestra el aviso (CA-14).
- **`MapView`:** un `Polyline` y un `Marker` (punto de inicio) por ruta. La ruta seleccionada se dibuja con más grosor y en el color `data`; las demás, en `primary`. Tocar el mapa vacío quita la selección (CA-2, CA-8).
- **Controles:**
  - arriba, los chips de tipo (CA-12) y de radio (CA-11);
  - el botón "Buscar en esta zona", que aparece cuando `hasMovedEnough` (CA-9);
  - el botón para volver a centrar, solo con permiso (CA-10).
- **Tarjeta inferior:** nombre, tipo, distancia, elevación ganada, dificultad, "Por {author}" y, si hay ubicación, "A X km de ti". Si `isMine`, la insignia "Tuya" (CA-6, CA-7, CA-19).
- **Avisos:** "No hay rutas publicadas cerca de aquí…" (CA-13), sin conexión (CA-15), y error con "Reintentar" (CA-16), con indicador de carga mientras busca.
- **Navegación:** ruta `ExploreRoutes` en `App.tsx` y botón "Explorar rutas" en `MainPage` (CA-1).

## Decisiones

| # | Decisión | Alternativas consideradas | Motivo |
|---|---|---|---|
| D1 | `startPoint` como `geography(Point, 4326)` con índice GIST; `path` sigue como `geometry` | Todo como `geometry` con casts en la consulta; un índice por expresión `(startPoint::geography)` | `ST_DWithin` sobre `geography` mide en metros y usa el índice sin casts. Prisma puede declarar el índice GIST en el schema, pero no un índice por expresión, que una migración futura podría borrar. |
| D2 | Usuario del sistema "SendaBC" como autor de las rutas de ejemplo | Una columna `isSample` en `routes` | No cambia el modelo, el nombre "SendaBC" sale solo del autor (CA-19) y para quitarlas basta filtrar por ese usuario (CA-20). |
| D3 | Recorrido simplificado (`ST_Simplify`, ~5 m) en la respuesta | Devolver todos los puntos; pedir el recorrido aparte al tocar | Dibuja bien a la escala del mapa y cumple "no descargar el recorrido completo" (requisito de datos). El recorrido completo es la vista de detalle de la 007. |
| D4 | Distancia hasta el usuario calculada en el teléfono | Mandar la ubicación del usuario aparte del centro | Tras mover el mapa, el centro ya no es el usuario; calcular en el teléfono evita mandar la ubicación de más (constitución 3.5). |
| D5 | Seed en TypeScript ejecutado con Node 24 | `prisma db seed` con `tsx`; SQL a mano | No agrega dependencias. Puede usar `PrismaClient` y `$executeRaw` igual que el servicio. |
| D6 | Búsqueda bajo demanda, no en cada movimiento del mapa | Buscar en `onRegionChangeComplete` | Menos peticiones y datos móviles; es lo que pide la spec ("Buscar en esta zona", CA-9). |

## Riesgos

- **Clave de Google Maps para la tienda:** Expo Go no la necesita, pero el build de Android de la semana 10 sí (proyecto de Google Cloud, Maps SDK, restricción por paquete y SHA-1). Se anota como tarea de la spec 010.
- **Emulador:** el mapa necesita Google Play Services. Si el AVD no los tiene, el mapa sale en blanco y los casos manuales se hacen en el teléfono.
- **Recorridos aproximados:** las rutas de ejemplo no son trazas GPS reales. Están marcadas como de ejemplo en su descripción y se quitan con `seed:rutas:quitar` antes de producción.
- **Muchas rutas superpuestas:** con 50 recorridos en 100 km el mapa puede verse cargado. No se agrupan marcadores en esta spec; se evalúa en la 009.
