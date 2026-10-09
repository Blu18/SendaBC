# 005 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de backend y de `lib/sync` incluyen sus pruebas Vitest (constitución 6.1).

## Backend

- [x] T1 — Migración `20261008000000_activity_sync`: enum `ElevationSource` y `Activity.elevationSource`; geometrías `geometry(Point, 4326)` / `geometry(LineString, 4326)` en `activities`, `activity_points` y `routes` (con `USING ST_SetSRID`); índice GIST en `activities.path`; `UNIQUE (activityId, sequence)`. Actualizar `schema.prisma`. Antes de `migrate deploy`, confirmar que `activities`, `activity_points` y `routes` están vacías. (CA-5, CA-6)
  - Aplicada en Supabase el 2026-10-09 con las tablas vacías. El índice GIST se declara en `schema.prisma` (`@@index([path], type: Gist)`) para que Prisma no lo borre en migraciones futuras; el cambio de tipo de las geometrías es SQL a mano porque Prisma no lo genera para columnas `Unsupported`. Corrige además una diferencia previa: `0_init` creaba `geometry` sin SRID y la base ya tenía 4326.
- [x] T2 — DTOs `ActivityPointDto`, `ActivityUploadDto` (con `elevationSource`, sin `userId`) y `SyncRequestDto` (de 1 a 5 actividades), y `activity-validation.ts` con las reglas de RN-5 que no cubren los decoradores (`endedAt >= startedAt`, secuencias sin repetir). Pruebas: actividad válida; fin anterior al inicio (y fin = inicio aceptado); latitud 91; longitud −181; secuencia repetida; métrica negativa; fuente inválida; mensajes en español. (CA-11, RN-5)
  - `validarActividad()` en `backend/src/activity/activity-validation.ts` devuelve los errores en español con el número de punto ("Punto 2: La latitud debe estar entre -90 y 90"), sin repetidos y como máximo 10. `SyncRequestDto` solo valida la forma del lote, sin `@ValidateNested`, para que una actividad inválida no rechace a las demás. Se agregó `reflect-metadata` a `setupFiles` de Vitest, porque `@Type` lo necesita fuera de NestJS.
- [x] T3 — `ActivityService.syncBatch(userId, items)`: validación por actividad; `ALREADY_EXISTS` si el `clientGeneratedId` es del mismo usuario y `REJECTED` si es de otro; transacción con `activity.create` (status `SYNCED`, `userId` del token), `INSERT … unnest` de puntos y `ST_MakeLine` para el recorrido con 2 o más puntos; `P2002` → `ALREADY_EXISTS`; errores inesperados se relanzan. Pruebas con Prisma simulado: lote mixto válido + inválido; reenvío; carrera `P2002`; `clientGeneratedId` ajeno; actividad con 0 puntos sin recorrido; el `userId` del body se ignora. (CA-5, CA-6, CA-10, CA-11, CA-18)
  - 11 pruebas con Prisma simulado. Además se comprobó el SQL crudo contra Supabase en una transacción revertida: 5 400 puntos en ~2.2 s, recorrido `ST_LineString` SRID 4326 con 5 400 vértices, nulos de altitud y precisión respetados, orden latitud/longitud correcto y reenvío → `ALREADY_EXISTS`. La transacción usa un límite de 30 s (el de Prisma por defecto es 5 s).
- [x] T4 — `ActivityService.list(userId)` (con `_count.points`, la más reciente primero) y `getDetail(userId, id)` (puntos con `ST_Y` / `ST_X`, ordenados por `sequence`; `404` si no existe o es de otro usuario). Pruebas con Prisma simulado. (CA-20, CA-21)
  - Solo devuelve actividades `SYNCED`. 4 pruebas con Prisma simulado. Ida y vuelta verificada contra Supabase (transacción revertida): el resumen coincide exacto con lo enviado y el detalle pedido por otro usuario responde 404. Las coordenadas leídas pueden diferir en el dígito 15 (≈ 10⁻¹⁴ grados), porque la conexión de Supabase convierte `float8` a texto con 15 dígitos significativos; el valor guardado es exacto.
- [x] T5 — `ActivityController` (`POST /activities/sync`, `GET /activities`, `GET /activities/:id`) con `JwtAuthGuard`, `ActivityModule`, registro en `AppModule` y `app.useBodyParser('json', { limit: '5mb' })` en `main.ts`. (CA-7, CA-18)
  - El límite de 5 MB vive en `configurarHttp()` (`backend/src/configurar-http.ts`), que usan `main.ts` y las e2e: las e2e no pasan por `main.ts`. Un id que no es UUID responde 404, igual que una actividad ajena. Prueba de humo con la app completa, sin escrituras: 401 sin token, 1.5 MB pasa el parser, 6 MB → 413, 404 para un id inválido o ajeno, 400 para un lote vacío.
- [x] T6 — `test/activity.e2e-spec.ts` contra la base, con un usuario de prueba que se borra al final (llamar a `configurarHttp(app)` antes de `app.init()`):
  - lote con una actividad válida y una inválida → `CREATED` + `REJECTED`;
  - reenvío → `ALREADY_EXISTS` con el mismo `id`;
  - actividad de 5 400 puntos → `CREATED`;
  - en la base, `ST_GeometryType(path) = 'ST_LineString'`, `ST_SRID(path) = 4326` y el número de puntos coincide;
  - `GET /activities` y `GET /activities/:id` devuelven las mismas métricas, fuente y puntos enviados; Las coordenadas se comparan con tolerancia (`toBeCloseTo(x, 9)`), ver la nota de T4;
  - sin token → `401`;
  - un `userId` en el body no cambia el dueño;
  - el detalle de una actividad de otro usuario → `404`.

  (CA-5, CA-6, CA-7, CA-10, CA-11, CA-18, CA-20, CA-21)
  - 10 pruebas en `backend/test/activity.e2e-spec.ts`; los usuarios se crean con `POST /user` + `POST /auth/login`. Se agregó un caso: otra cuenta no puede reusar mi `clientGeneratedId` → `REJECTED`. Suite e2e completa: 26 pruebas; la base queda sin usuarios `e2e-`, actividades ni puntos.
- [x] T7 — Colección de Postman en `backend/postman/SendaBC.postman_collection.json` con login, `POST /activities/sync`, `GET /activities` y `GET /activities/:id` (el token se guarda en una variable de la colección). (Constitución 6.3)
  - 9 peticiones con pruebas de Postman: registro, login (guarda el token), subir lote, reenviar (`ALREADY_EXISTS`), lote inválido (`REJECTED`), lista, detalle, id inválido (404) y sin token (401). Validada el 2026-10-09 ejecutando sus propios scripts de prueba contra la app local: 17/17 verificaciones en verde.

## Frontend — datos

- [x] T8 — Instalar `expo-network` (`npx expo install expo-network`). (D2)
  - Versión `~57.0.2`. No necesita plugin en `app.json`. Expone `getNetworkStateAsync`, `addNetworkStateListener` y `useNetworkState`. El lockfile solo agrega `expo-network`, sin dependencias transitivas.
- [x] T9 — Migración SQLite **v4**: `server_id`, `sync_error` e índice `idx_activities_sync (user_id, status)`.
  - Probada con `node:sqlite` usando el SQL extraído de `sqlite.ts`: instalación nueva → v4; teléfono en v3 con una actividad → v4 conservándola (`server_id` y `sync_error` en NULL); reapertura sin cambios.
- [x] T10 — En `lib/db/activities.ts`: `serverId` y `syncError` en `Activity`; `listUploadable(userId, { includeRejected })`, `markSynced`, `markSyncError`, `countPendingUploads`, `listClientIds`, `insertDownloadedActivity` (transacción, `SYNCED`, sin lecturas de barómetro). (CA-3, CA-13, CA-17, CA-19, CA-21, CA-22, CA-24, RN-6)
  - `listClientIds()` no filtra por usuario: la columna es única en todo el teléfono (plan actualizado). Para probar las consultas reales sin el teléfono, los pasos de migración se movieron de `sqlite.ts` a `lib/db/schema.ts` (sin cambio de comportamiento: probado desde v0, v1, v2 y v3 hasta v4) y `lib/db/testing.ts` ofrece una base en memoria con `node:sqlite` y la interfaz de `expo-sqlite` que usa `lib/db`. 10 pruebas en `lib/db/activities.test.ts`.

## Frontend — sincronización

- [x] T11 — `lib/sync/payload.ts`: `toUploadPayload` y `splitIntoBatches` (máximo 5 actividades y ~4 MB por lote; una actividad más grande va sola). Pruebas: el payload trae métricas, fuente y puntos, y no trae `userId`, `localId` ni lecturas de barómetro; 12 actividades → lotes de 5, 5 y 2; una actividad de 5 400 puntos pesa menos de 1 MB. (CA-2, CA-5, CA-7, CA-8)
  - 9 pruebas. Una actividad de 5 400 puntos con coordenadas a precisión completa pesa ~926 KB: cumple, pero cerca de 1 MB. Si hiciera falta, se puede redondear a 7 decimales (~1 cm) sin perder precisión útil.
- [x] T12 — `lib/sync/backoff.ts` (`retryDelayMs`) y `lib/sync/results.ts` (`classifyResult`, `classifyFailure`). Pruebas: secuencia 30 s, 1 min, 2 min, 4 min, 8 min, 15 min, 15 min; `CREATED` / `ALREADY_EXISTS` → `synced`; `REJECTED` → `rejected`; red, `5xx` y `413` → `retry`; `401` → `auth`. (CA-9, CA-10, CA-11, CA-12)
  - Además `classifyBatchResponse`: empareja los resultados por `clientGeneratedId` (no por orden) y deja pendiente cualquier actividad sin resultado reconocible (CA-13). Un 4xx inesperado (400, 404, 429) también se reintenta, para no perder nunca una actividad. 19 pruebas.
- [ ] T13 — `lib/sync/api.ts`: `uploadBatch`, `listRemoteActivities`, `getRemoteActivity` sobre `apiFetch` con `timeoutMs` (30 s / 10 s / 30 s, D10).
- [ ] T14 — `lib/sync/syncEngine.ts`: `configure`, `requestSync({ manual })` (una sola sincronización a la vez; si llega otra petición, se repite al terminar), ciclo subir → descargar, temporizador de reintento, `subscribe`. Pruebas con `lib/db`, `lib/sync/api` y `expo-network` simulados:
  - solo sube lo que devuelve `listUploadable` del usuario configurado;
  - marca `synced` / `rejected` según cada resultado;
  - un fallo de red programa el reintento con `retryDelayMs` y no marca nada;
  - un `401` se detiene sin marcar ni programar reintentos;
  - el modo manual incluye las rechazadas;
  - descarga solo los `clientGeneratedId` que faltan;
  - sin conexión no hace peticiones;
  - dos `requestSync` seguidos no corren en paralelo.

  (CA-2, CA-3, CA-9, CA-11, CA-12, CA-13, CA-15, CA-16, CA-17, CA-19, CA-20, CA-22)

## Frontend — integración y pantallas

- [ ] T15 — `context/SyncContext.tsx` (`SyncProvider` dentro de `AuthProvider`, después de que `Gate` termina): `configure` al cambiar la sesión; `requestSync` al iniciar sesión o abrir la app, al pasar de sin conexión a con conexión (`addNetworkStateListener`) y al volver la app al frente (`AppState`). `useSync()` → `{ isSyncing, syncNow }`; `syncNow` devuelve `'offline'` sin conexión. (CA-1, CA-4, CA-9, CA-16, CA-20)
- [ ] T16 — `useActivityTracker.stop()`: llamar a `requestSync()` después de `finalizeMetrics`. (CA-1)
- [ ] T17 — `ActivityHistoryPage`: insignia de estado por fila; deslizar hacia abajo → `syncNow({ manual: true })` con indicador, y mensaje "Sin conexión. Se sincronizará cuando vuelva la señal." si devuelve `'offline'`; recarga la lista al recibir avisos del motor. (CA-14, CA-15, CA-16)
- [ ] T18 — `ActivitySummaryPage`: mostrar el estado de sincronización. (CA-14, CA-21)
- [ ] T19 — `MainPage`: antes de cerrar sesión, `countPendingUploads(userId)`; si es mayor a 0, `Alert` "Tienes N actividades sin subir. Se subirán cuando vuelvas a iniciar sesión." con "Cancelar" y "Cerrar sesión". (CA-24)

## Documentación

- [ ] T20 — Al cerrar la semana: actualizar el estado de la spec, la tabla de verificación y `specs/roadmap.md`.

## Cobertura

Los 24 CA están cubiertos por al menos una tarea.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | `syncEngine.test.ts` (ciclo de subida) · M1 · M2 | Ambas | Pendiente |
| CA-2 | `payload.test.ts` › lotes · `syncEngine.test.ts` · M2 | Ambas | Pendiente |
| CA-3 | `syncEngine.test.ts` › solo `listUploadable` · revisión de la consulta (`status = 'PENDING_SYNC' AND distance_meters IS NOT NULL`) | Automatizada | Pendiente |
| CA-4 | M3 | Manual | Pendiente |
| CA-5 | `activity.service.spec.ts` · `activity.e2e-spec.ts` › detalle = lo enviado · M1 | Ambas | Pendiente |
| CA-6 | `activity.e2e-spec.ts` › `ST_LineString`, SRID 4326 | Automatizada | Pendiente |
| CA-7 | `activity.e2e-spec.ts` › 5 400 puntos · `payload.test.ts` › < 1 MB | Automatizada | Pendiente |
| CA-8 | `payload.test.ts` › sin lecturas de barómetro | Automatizada | Pendiente |
| CA-9 | `backoff.test.ts` · `syncEngine.test.ts` › reintento · M4 | Ambas | Pendiente |
| CA-10 | `activity.service.spec.ts` › reenvío y `P2002` · `activity.e2e-spec.ts` › `ALREADY_EXISTS` | Automatizada | Pendiente |
| CA-11 | `activity-validation.spec.ts` · `activity.service.spec.ts` › lote mixto · `activity.e2e-spec.ts` · `syncEngine.test.ts` › `rejected` | Automatizada | Pendiente |
| CA-12 | `syncEngine.test.ts` › `401` · M7 | Ambas | Pendiente |
| CA-13 | `syncEngine.test.ts` › solo marca con confirmación · M4 | Ambas | Pendiente |
| CA-14 | M1 · M2 | Manual | Pendiente |
| CA-15 | M2 | Manual | Pendiente |
| CA-16 | `syncEngine.test.ts` › modo manual · M5 | Ambas | Pendiente |
| CA-17 | `syncEngine.test.ts` › solo el usuario configurado · M9 | Ambas | Pendiente |
| CA-18 | `activity.service.spec.ts` · `activity.e2e-spec.ts` › `401`, `userId` ignorado, `404` ajeno | Automatizada | Pendiente |
| CA-19 | `syncEngine.test.ts` (usa `listUploadable`, que exige `user_id = ?`) · revisión de la consulta | Automatizada | Pendiente |
| CA-20 | `activity.e2e-spec.ts` › lista · `syncEngine.test.ts` › descarga · M8 | Ambas | Pendiente |
| CA-21 | `activity.e2e-spec.ts` › detalle · M8 | Ambas | Pendiente |
| CA-22 | `syncEngine.test.ts` › solo descarga las que faltan · M8 | Ambas | Pendiente |
| CA-23 | M8 | Manual | Pendiente |
| CA-24 | M9 · M10 | Manual | Pendiente |

Además: colección de Postman (T7) ejecutada contra el backend local antes de cerrar la spec (constitución 6.3). Ejecutada el 2026-10-09: 17/17 en verde.

### Casos manuales

Con el backend corriendo y una cuenta de prueba. Pueden hacerse en el emulador salvo que se indique otra cosa.

**M1 — Subida al terminar**
1. Con conexión, grabar una actividad corta y detenerla.
2. En el resumen, esperar unos segundos.
3. Consultar `GET /activities` en Postman con el token de esa cuenta.
- **Esperado:** el resumen pasa de "Pendiente de subir" a "Sincronizada". La actividad aparece en Postman con la misma distancia, duración, elevaciones, fuente y número de puntos que el resumen.

**M2 — Varias actividades sin señal**
1. Activar modo avión. Grabar 3 actividades cortas.
2. Abrir "Mis actividades": las 3 dicen "Pendiente de subir".
3. Sin salir de la lista, desactivar el modo avión.
- **Esperado:** en menos de 1 minuto, sin tocar nada, las 3 cambian a "Sincronizada" en la misma pantalla.

**M3 — No bloquea**
1. Con 3 o más actividades pendientes, recuperar la conexión e inmediatamente tocar "Nueva actividad" → "Iniciar".
- **Esperado:** la grabación arranca normalmente mientras las otras se suben.

**M4 — Servidor caído**
1. Detener el backend. Grabar y detener una actividad con conexión.
2. Esperar 1 minuto: sigue "Pendiente de subir".
3. Volver a levantar el backend.
- **Esperado:** en el siguiente reintento (máximo ~2 minutos), o al deslizar en la lista, pasa a "Sincronizada". En ningún momento aparece como sincronizada mientras el backend está caído.

**M5 — Sincronizar deslizando**
1. Con una actividad pendiente y conexión, deslizar hacia abajo en "Mis actividades".
2. Activar modo avión y volver a deslizar.
- **Esperado:** (1) aparece el indicador y la actividad pasa a "Sincronizada". (2) el indicador desaparece y se muestra "Sin conexión. Se sincronizará cuando vuelva la señal.".

**M6 — Actividad rechazada**
Cubierto por pruebas automáticas (T3, T6, T14): desde la app no se puede generar una actividad inválida sin modificar la base local. Si se quiere comprobar la insignia: en el emulador, cambiar a mano `endedAt` de una actividad pendiente a una fecha anterior a `startedAt` y deslizar.
- **Esperado:** la actividad dice "No se pudo subir" y las demás se suben.

**M7 — Sesión expirada**
1. Con `JWT_EXPIRE_IN=30s` en el backend, iniciar sesión.
2. Activar modo avión, grabar y detener una actividad. Esperar 1 minuto.
3. Desactivar el modo avión.
4. Volver a iniciar sesión.
- **Esperado:** (3) la app cierra la sesión (spec 002) y la actividad no se marca como sincronizada. (4) la actividad se sube y pasa a "Sincronizada".

**M8 — Recuperar actividades**
1. Con una cuenta que tenga 2 o más actividades sincronizadas, borrar los datos de la app (o usar otro emulador) e iniciar sesión.
2. Abrir "Mis actividades" y el resumen de una de ellas.
3. Deslizar hacia abajo.
4. Activar modo avión, cerrar y abrir la app, y volver a la lista.
- **Esperado:** (2) aparecen las actividades como "Sincronizada" y el resumen coincide con el original (tipo, fecha, duración, distancia, elevaciones, ritmo o velocidad, puntos y fuente). (3) no se duplican. (4) siguen visibles sin conexión.

**M9 — Otro usuario y aviso al cerrar sesión**
1. Con la cuenta A, en modo avión, grabar 2 actividades.
2. Presionar "Cerrar sesión".
3. Presionar "Cerrar sesión" en el aviso. Desactivar el modo avión e iniciar sesión con la cuenta B.
4. Consultar `GET /activities` con el token de B y con el de A.
5. Cerrar sesión de B e iniciar sesión con A.
- **Esperado:** (2) aviso "Tienes 2 actividades sin subir…", con "Cancelar" y "Cerrar sesión". (4) ni B ni A tienen las actividades en el servidor. (5) las 2 actividades de A se suben y quedan "Sincronizada".

**M10 — Cerrar sesión sin pendientes**
1. Con todas las actividades sincronizadas, presionar "Cerrar sesión".
- **Esperado:** cierra la sesión sin aviso.

## Commits propuestos

| # | Commit | Tareas |
|---|---|---|
| 1 | `feat(005): migración PostGIS y fuente de elevación en actividades` | T1 |
| 2 | `feat(005): endpoints de subida, lista y detalle de actividades` | T2–T5 |
| 3 | `test(005): e2e de sincronización y colección de Postman` | T6–T7 |
| 4 | `feat(005): esquema SQLite v4 y consultas de sincronización` | T8–T10 |
| 5 | `feat(005): motor de sincronización con reintentos y recuperación` | T11–T14 |
| 6 | `feat(005): disparadores, estados de sincronización y aviso al cerrar sesión` | T15–T19 |
| 7 | `fix(005)`: ajustes encontrados en los casos manuales | — |
| 8 | `docs(005): verificación y estado de la spec` | T20 |

## Pendientes conocidos

Ninguno por ahora.
