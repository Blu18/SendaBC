# 005 — Plan técnico

Estado: **Aprobado** (2026-10-09)

Spec: [spec.md](spec.md)

## Resumen

**Backend:** un módulo nuevo, `activity`, con tres endpoints protegidos con JWT:
- subida en lote con resultado por actividad, idempotente por `clientGeneratedId`;
- lista de mis actividades;
- detalle con puntos, para recuperar.

Los puntos y el recorrido se guardan como geometrías PostGIS (SRID 4326) con SQL crudo, porque Prisma no escribe columnas `Unsupported`. Una migración agrega la fuente de la elevación y fija el tipo de las geometrías.

**Frontend:** un motor de sincronización en `lib/sync/`:
- busca las actividades pendientes del usuario de la sesión y las sube en lotes;
- marca cada una según la respuesta;
- reintenta con espera creciente;
- descarga las actividades del servidor que falten en el teléfono.

Se dispara al terminar una actividad, al abrir la app o volver a ella, al recuperar la conexión (`expo-network`) y al deslizar en "Mis actividades". Avisa a las pantallas cuando cambia algo, para que el historial se actualice solo.

## Verificación contra la constitución

- [x] **Art. 2.1 Offline-first:** grabar y consultar no dependen de la sincronización; el motor corre aparte y nunca bloquea la UI (CA-4).
- [x] **Art. 2.2:** `clientGeneratedId` es la llave de idempotencia (CA-10, CA-22).
- [x] **Art. 2.3:** el teléfono solo pasa `PENDING_SYNC` → `SYNCED` con la confirmación del servidor (CA-13). Las recuperadas entran como `SYNCED`. "No se pudo subir" es una columna aparte (`sync_error`), no un estado.
- [x] **Art. 2.4:** sincronizar nunca borra datos locales; los errores solo marcan.
- [x] **Art. 3.3:** `JwtAuthGuard` en todo el controlador; el dueño sale de `req.user.id`. El body no tiene `userId` y, si llega, se descarta (CA-17).
- [x] **Art. 3.6:** sin secretos nuevos.
- [x] **Art. 4.1:** DTOs con class-validator. En la subida en lote, cada actividad se valida por separado para que una inválida no tumbe el lote (CA-11).
- [x] **Art. 4.2 / 4.3:** `400`, `401`, `404`, `413`; los motivos de rechazo van en español.
- [x] **Art. 4.4:** endpoints documentados abajo.
- [x] **Art. 5.1:** migración de Prisma `20261008000000_activity_sync`.
- [x] **Art. 5.2:** las columnas `geometry` pasan a `geometry(Point, 4326)` y `geometry(LineString, 4326)`, con `ST_MakePoint(longitud, latitud)`.
- [x] **Art. 5.3:** SQLite **v4**.
- [x] **Art. 5.4:** metros, segundos, ISO 8601 / `timestamptz`.
- [x] **Art. 6.1:** Vitest en el backend (validación, servicio, controlador) y en la lógica pura del frontend (payload, lotes, espera creciente); manual para la red y las pantallas. **Art. 6.3:** colección de Postman.
- [x] **Art. 7.1:** `expo-network` es nuevo (D2).

## Backend

### Endpoints

Todos con `JwtAuthGuard`. Sin token válido → `401` y no se guarda nada.

| Método | Ruta | Request | Response | Errores |
|---|---|---|---|---|
| POST | `/activities/sync` | `{ activities: ActivityUpload[] }`, de 1 a 5 actividades | `200 { results: SyncResult[] }`, un resultado por actividad y en el mismo orden | `400` (body sin el arreglo, vacío o con más de 5), `401`, `413` (más de 5 MB) |
| GET | `/activities` | — | `200 ActivitySummary[]`: mis actividades, la más reciente primero | `401` |
| GET | `/activities/:id` | — | `200 ActivityDetail` | `401`, `404` (no existe o es de otro usuario: no se distingue) |

```ts
// Request: una actividad terminada
ActivityUpload = {
  clientGeneratedId: string;          // UUID v4
  type: 'HIKING' | 'TRAIL_RUNNING' | 'CYCLING';
  startedAt: string; endedAt: string; // ISO 8601, endedAt > startedAt
  distanceMeters: number; durationSeconds: number;
  elevationGainMeters: number; elevationLossMeters: number;   // todas >= 0
  elevationSource: 'BAROMETER' | 'GPS';
  points: { sequence: number; latitude: number; longitude: number;
            altitude: number | null; accuracy: number | null; recordedAt: string }[];
}

// Response por actividad
SyncResult =
  | { clientGeneratedId; status: 'CREATED' | 'ALREADY_EXISTS'; id: string }   // id del servidor
  | { clientGeneratedId; status: 'REJECTED'; errors: string[] }               // motivos en español

ActivitySummary = { id, clientGeneratedId, type, startedAt, endedAt, distanceMeters,
                    durationSeconds, elevationGainMeters, elevationLossMeters,
                    elevationSource, pointCount }
ActivityDetail  = ActivitySummary & { points: ActivityUpload['points'] }
```

**Reglas de la subida** (`ActivityService.syncBatch`):
1. Cada actividad se valida con `class-validator` (`validate(plainToInstance(ActivityUploadDto, item))`) más las reglas de RN-5 que el decorador no cubre: `endedAt > startedAt`, secuencias sin repetir. Si falla → `REJECTED` con los mensajes.
2. Si ya existe una actividad con ese `clientGeneratedId`:
   - del mismo usuario → `ALREADY_EXISTS` con su `id`; no se modifica (RN-2);
   - de otro usuario → `REJECTED` ("Identificador de actividad inválido"), sin revelar que existe.
3. Si no existe, en una transacción interactiva (`prisma.$transaction`):
   - `prisma.activity.create` con status `SYNCED`, el `userId` del token, las métricas y `elevationSource`;
   - inserción de todos los puntos con un solo `INSERT … SELECT FROM unnest(...)` (`$executeRaw` con arreglos), con `location = ST_SetSRID(ST_MakePoint(lon, lat), 4326)`;
   - si hay 2 puntos o más: `UPDATE activities SET path = (SELECT ST_MakeLine(location ORDER BY sequence) …)` (CA-6).
4. Si dos envíos simultáneos chocan con la restricción única (`P2002`) → se trata como `ALREADY_EXISTS`.
5. Un error inesperado (p. ej. la base no responde) no se convierte en `REJECTED`, porque no es culpa de los datos: se relanza, todo el request responde `500` y el cliente reintenta el lote completo más tarde. Es seguro, porque las actividades que ya se guardaron vuelven como `ALREADY_EXISTS`.

**Lectura:**
- `GET /activities` usa Prisma con `_count.points`.
- `GET /activities/:id` lee los puntos con `$queryRaw` (`ST_Y(location) AS latitude, ST_X(location) AS longitude`), ordenados por `sequence`.

### Archivos

- `backend/src/activity/activity.module.ts`, `activity.controller.ts`, `activity.service.ts`
- `backend/src/activity/dto/activity-upload.dto.ts`, `activity-point.dto.ts`, `sync-request.dto.ts`
- `backend/src/activity/activity-validation.ts`: reglas extra de RN-5, como función pura con pruebas
- `backend/src/app.module.ts`: importar `ActivityModule`
- `backend/src/main.ts`: `app.useBodyParser('json', { limit: '5mb' })`. El límite por defecto de Express (100 kB) no alcanza para una actividad de 3 h (≈ 700 kB).

### Migración Prisma `20261008000000_activity_sync`

```prisma
enum ElevationSource { BAROMETER  GPS }

model Activity {
  // ...
  elevationSource ElevationSource?
  path            Unsupported("geometry(LineString, 4326)")?
}
model ActivityPoint {
  // ...
  location        Unsupported("geometry(Point, 4326)")
}
```

SQL adicional en la migración:
- `ALTER COLUMN ... TYPE geometry(...) USING ST_SetSRID(...)` en `activities.path`, `activity_points.location` y `routes.path` / `routes."startPoint"`, por consistencia. Las tablas están vacías, pero el `USING` lo hace seguro de todos modos.
- Índice GIST en `activities.path` para la spec 006.
- `UNIQUE (activityId, sequence)` en `activity_points`.

## Frontend

### Dependencia

- `expo-network` (`npx expo install expo-network`): estado de la red y aviso cuando cambia (D2).

### Esquema SQLite v4 (`lib/db/sqlite.ts`)

```sql
ALTER TABLE activities ADD COLUMN server_id TEXT;    -- id del servidor (para 007)
ALTER TABLE activities ADD COLUMN sync_error TEXT;   -- NULL = sin error; texto = "No se pudo subir" (CA-11)
CREATE INDEX IF NOT EXISTS idx_activities_sync ON activities(user_id, status);
```

### Datos (`lib/db/activities.ts`)

- El tipo `Activity` suma `serverId` y `syncError`.
- `listUploadable(userId, { includeRejected })`: `status = 'PENDING_SYNC' AND user_id = ? AND distance_meters IS NOT NULL`, y `sync_error IS NULL` salvo en una sincronización manual (CA-3, CA-16, CA-19).
- `markSynced(localId, serverId)`: solo si sigue en `PENDING_SYNC`. Borra `sync_error`.
- `markSyncError(localId, message)`.
- `countPendingUploads(userId)`: para el aviso al cerrar sesión (CA-24).
- `listClientIds()`: los `clientGeneratedId` locales **de cualquier usuario**, para saber qué falta descargar. No se filtra por usuario porque la columna es única en todo el teléfono: guardar uno repetido fallaría.
- `insertDownloadedActivity(detail, userId)`: actividad `SYNCED` con métricas, fuente, `server_id` y todos sus puntos, en una transacción. No tiene lecturas de barómetro (RN-6).

### Lógica pura (`lib/sync/`, con pruebas Vitest)

| Archivo | Contenido |
|---|---|
| `payload.ts` | `toUploadPayload(activity, points)` → `ActivityUpload`; `splitIntoBatches(payloads)`: máximo 5 actividades y unos 4 MB de JSON por lote. Una actividad más grande que el límite va sola. |
| `backoff.ts` | `retryDelayMs(attempt)` = `min(30 s × 2^attempt, 15 min)` → 30 s, 1 min, 2 min, 4 min, 8 min, 15 min, 15 min… (CA-9) |
| `results.ts` | `classifyResult(result)` → `synced` / `rejected`; `classifyFailure(status / error)` → `retry` (red, `5xx`, `413`), `auth` (`401`) |

### Motor (`lib/sync/syncEngine.ts`)

Un objeto único para toda la app, sin React:
- `configure({ token, userId })`: lo llama el proveedor cuando cambia la sesión. Al cerrar sesión, cancela el temporizador.
- `requestSync({ manual })`: si ya hay una sincronización corriendo, la marca para repetirse al terminar en lugar de correr dos a la vez. Sin conexión no hace nada (no gasta batería).
- **Ciclo:**
  1. **Subir:** `listUploadable` → `splitIntoBatches` → `POST /activities/sync`. Por resultado: `markSynced` o `markSyncError`.
  2. **Descargar:** `GET /activities` → los `clientGeneratedId` que faltan en el teléfono → `GET /activities/:id` → `insertDownloadedActivity` (CA-20 a CA-22).
  3. **Si algo falla:**
     - por red, `5xx` o `413`: programa un reintento con `retryDelayMs(intentos)`;
     - con `401`: se detiene sin marcar nada (CA-12). `apiFetch` ya avisa del `401` y `Gate` cierra la sesión (spec 002, T7); al cambiar la sesión, `configure` cancela el temporizador.
  4. Si todo sale bien, el contador de intentos vuelve a 0.
- `subscribe(listener)`: avisa `{ isSyncing, lastError }` y "datos cambiaron" para que las pantallas recarguen (CA-15).
- El temporizador de reintento vive en memoria: al cerrar la app se pierde, pero al abrirla se sincroniza de todos modos (CA-1).

### Proveedor y disparadores (`context/SyncContext.tsx`)

`SyncProvider` va dentro de `AuthProvider` en `App.tsx`:
- Con `token` y `userId` de `useAuth()`, configura el motor y lanza `requestSync()` al iniciar sesión. Esto cubre "al abrir la app" y la recuperación en un teléfono nuevo.
- `Network.addNetworkStateListener`: cuando pasa de sin conexión a con conexión → `requestSync()`.
- `AppState` → `active` (la app vuelve al frente) → `requestSync()`.
- Expone `useSync()` → `{ isSyncing, syncNow() }`. `syncNow()` revisa primero la red y, sin conexión, devuelve `'offline'` (CA-16).

El `Gate` sigue igual. El proveedor espera a que `Gate` termine (`closeOrphanActivities` + `computeMissingMetrics`) para no subir actividades con métricas pendientes.

### Pantallas

- **`useActivityTracker.stop()`:** después de `finalizeMetrics`, llama a `requestSync()` (CA-1, "al terminar").
- **`ActivityHistoryPage`:**
  - insignia de estado por fila: "Pendiente de subir", "Sincronizada" o "No se pudo subir" (CA-14);
  - `FlatList` con `refreshing` / `onRefresh` → `syncNow({ manual: true })`; si devuelve `'offline'`, mensaje "Sin conexión. Se sincronizará cuando vuelva la señal." (CA-16);
  - se suscribe a los avisos del motor para recargar sin salir de la pantalla (CA-15).
- **`ActivitySummaryPage`:** muestra el estado de sincronización (CA-14).
- **`MainPage`:** "Cerrar sesión" consulta `countPendingUploads`. Si es mayor a 0, muestra `Alert` con "Tienes N actividades sin subir. Se subirán cuando vuelvas a iniciar sesión." y los botones "Cancelar" y "Cerrar sesión" (CA-24).

## Decisiones

| # | Decisión | Alternativas consideradas | Motivo |
|---|---|---|---|
| D1 | Lote con resultado **por actividad** (`200` + `results[]`) | Un request por actividad; `400` para todo el lote | CA-11 exige que una inválida no frene a las demás. Lotes de hasta 5 reducen requests sin pasar del límite de tamaño. |
| D2 | **`expo-network`** para detectar la conexión | `@react-native-community/netinfo`; solo reintentar a ciegas | Paquete oficial de Expo, incluido en Expo Go, sin configuración y con `addNetworkStateListener`. Evita reintentos sin red (requisito de batería). **Se agrega a la tabla del stack de la constitución (v1.4).** |
| D3 | Idempotencia con la restricción única de `clientGeneratedId` + captura de `P2002` | Tabla de idempotencia aparte | La columna única ya existe en el esquema y cubre los reenvíos y las carreras. |
| D4 | Puntos y recorrido con SQL crudo (`unnest` + `ST_MakeLine`) en una transacción | Guardar latitud y longitud como `Float` y calcular la geometría después | Prisma no escribe `Unsupported`. Un solo `INSERT` para miles de puntos es rápido, y la 006 ya recibe la geometría lista. |
| D5 | Geometrías tipadas `(Point/LineString, 4326)` e índice GIST | Dejar `geometry` sin tipo | Garantiza la constitución 5.2 en la base y prepara las consultas `ST_DWithin` de la 006. |
| D6 | "No se pudo subir" como columna `sync_error`, no como estado | Nuevo estado `SYNC_ERROR` | RN-3 de la spec: el ciclo de estados no cambia. |
| D7 | Espera creciente en memoria, sin guardar los intentos | Guardar el contador en SQLite | Al abrir la app se sincroniza de inmediato (CA-1), así que no hace falta recordar el contador. |
| D8 | Recuperar con lista ligera + detalle por actividad | Un solo endpoint que devuelva todo con puntos | Solo se descargan los puntos de las actividades que faltan; la lista sirve también como comparación barata. |
| D9 | Ante un `401`, el motor solo se detiene; el cierre de sesión lo hace el manejador global de `apiFetch` (spec 002, T7) | Cerrar la sesión desde el motor | Un solo lugar maneja la sesión expirada para toda la app. |
| D10 | Las peticiones del motor usan el `timeoutMs` de `apiFetch`: 30 s para subir un lote y para el detalle, 10 s para la lista | Sin límite | Sin límite, un backend inalcanzable tarda más de un minuto en fallar y retrasa el reintento. |

## Riesgos

- **Pruebas e2e contra la base:** siguen el patrón de las specs 001 y 002: crean un usuario con correo único y lo borran al final. Las actividades se borran en cascada (`onDelete: Cascade`). Si una prueba se interrumpe, puede quedar un usuario `e2e-…@senda.bc` que hay que borrar a mano.
- **Cambio de tipo de las geometrías:** si alguna tabla ya tuviera datos con otro SRID, `USING ST_SetSRID(...)` los reetiqueta. Revisar antes de `migrate deploy` que estén vacías.
- **Tamaño de las actividades:** una actividad de más de 5 MB (≈ 35 h de grabación) superaría el límite. Es improbable; si pasa, el servidor responde `413` y la actividad queda pendiente.
- **Carga de la semana:** backend nuevo + migración PostGIS + motor + recuperación + pantallas. Si hace falta recortar, lo primero que se puede mover es la recuperación (CA-20 a CA-23).
