# 003 — Plan técnico

Spec: [spec.md](spec.md)

## Resumen

Todo ocurre en el frontend. `useActivityTracker` usa `Location.watchPositionAsync` en primer plano y escribe cada punto en SQLite (`expo-sqlite`). Una pantalla dedicada `ActivityPage` usa el hook. Al arrancar la app se cierran las actividades huérfanas.

## Verificación contra la constitución

- [x] Art. 2.1 — Sin red durante la grabación.
- [x] Art. 2.2 — `client_generated_id` con `Crypto.randomUUID()`.
- [x] Art. 2.3 — `RECORDING` → `PENDING_SYNC`.
- [x] Art. 3.5 — Permiso de primer plano con texto de propósito en `app.json`; GPS solo entre iniciar y detener.
- [ ] Art. 5.3 — Agregar `PRAGMA user_version` para versionar el esquema local (este plan añade una columna).

## Backend

Sin cambios. El modelo `Activity` / `ActivityPoint` de Prisma ya existe y se usará en la spec 005.

## Frontend

### Esquema SQLite (`frontend/lib/db/sqlite.ts`)

Versión 1 → 2 (`PRAGMA user_version`):

```sql
-- v1 (existente)
activities(local_id PK, client_generated_id UNIQUE, type, status, startedAt, endedAt)
activity_points(local_id PK, activity_id FK, sequence, latitude, longitude, altitude, accuracy, recordedAt)

-- v2
ALTER TABLE activities ADD COLUMN user_id TEXT;   -- id del usuario de la sesión (RN-4)
```

Funciones nuevas en `frontend/lib/db/activities.ts`:
- `createActivity(userId, type)` → `local_id`
- `insertPoint(activityId, point)`
- `finishActivity(localId, endedAt)`
- `countPoints(localId)`
- `closeOrphanActivities()` — cierra las de `RECORDING` usando el `recordedAt` del último punto (CA-10)

### Sesión

`AuthContext` necesita el id del usuario para RN-4. `POST /auth/login` ya devuelve `{ id, token }`: guardar también `userId` en SecureStore y exponerlo desde `useAuth()`.

### Hook `frontend/hooks/activity/activityTracker.hook.ts`

- Recibe el tipo de actividad en `start(type)`.
- Expone `status`, `pointCount`, `startedAt`, `savedPointCount` y `permissionError`.
- Usa las funciones de `lib/db/activities.ts` en lugar de SQL en línea.
- Al desmontar con grabación activa: quitar la suscripción **y** cerrar la actividad.

### Pantalla `frontend/pages/activity/activityPage.tsx`

- Selector de tipo (Senderismo / Trail running / Ciclismo), deshabilitado mientras graba.
- Cronómetro (a partir de `startedAt`, con `setInterval` de 1 s) y contador de puntos.
- Botón Iniciar / Detener.
- Mensaje de permiso denegado con `Linking.openSettings()` cuando `canAskAgain` es `false`.
- Mensaje "Actividad guardada: N puntos" al detener.
- Se registra en el stack de `App.tsx` como `Activity`; `MainPage` muestra un botón para abrirla en lugar de los controles actuales.

### Arranque

En `App.tsx` (o en `getDb()` después de migrar), llamar `closeOrphanActivities()` una vez.

## Decisiones

| Decisión | Alternativas | Motivo |
|---|---|---|
| `watchPositionAsync` en primer plano | `startLocationUpdatesAsync` + TaskManager (segundo plano) | El plan de la semana 3 pide primer plano; segundo plano exige más permisos y configuración nativa. |
| Cerrar huérfanas automáticamente | Ofrecer reanudar | Más simple y no pierde datos; reanudar puede venir después. |
| `user_id` en la tabla local | Borrar la BD al cerrar sesión | Cerrar sesión sin sincronizar perdería actividades (constitución 2.4). |
| `expo-keep-awake` durante la grabación (`activateKeepAwakeAsync` al iniciar, `deactivateKeepAwake` al detener o desmontar) | Grabación en segundo plano | Evita que el apagado automático corte la captura sin pedir permisos extra. Dependencia nueva, agregada al stack de la constitución. |
| SQL en `lib/db/activities.ts` | SQL dentro del hook | Reutilizable en 004 (resumen) y 005 (cola de sincronización). |

## Riesgos

- Si el usuario bloquea la pantalla manualmente, iOS deja de entregar puntos en primer plano. `expo-keep-awake` solo evita el apagado automático; la solución completa es la grabación en segundo plano (fuera de alcance).
- Mantener la pantalla encendida consume más batería en actividades largas.
- El emulador no da altitud realista; probar en un dispositivo físico.
