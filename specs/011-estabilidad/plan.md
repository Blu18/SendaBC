# 011 — Plan técnico

Spec: [spec.md](spec.md)

## Resumen

La spec junta trabajo de cinco tipos. Se hace en este orden, porque la prueba de campo tiene que cubrir lo nuevo (RN-6):

- **Fase 0, preparación.** Prueba técnica de los mapas descargados, instalación en los dos teléfonos y túnel. Va primero porque es lo que más puede fallar y lo que decide si los mapas se quedan.
- **Fase 1, funciones.** Botones flotantes, cuenta y perfil, umbrales, consulta de rutas sin conexión y zonas descargadas.
- **Fase 2, bugs.** Correcciones de CA-13 a CA-18, con la regla de reproducir antes de cambiar código (RN-3).
- **Fase 3, pruebas.** Suite e2e estable y lógica pura sin prueba.
- **Fase 4, prueba de campo.** En el S9+ y el Nothing Phone 2, con el backend de la computadora por el túnel.
- **Fase 5, regresión y cierre.** Casos pendientes de las specs anteriores, Postman y estados.

No hace falta ninguna dependencia nueva: las zonas usan `@rnmapbox/maps`, lo guardado usa `expo-sqlite` y los avatares usan `@expo/vector-icons`. Hay una migración de Prisma, la versión 6 de SQLite y cuatro endpoints nuevos.

## Verificación contra la constitución

- [x] **Art. 1 La spec primero:** spec aprobada el 2026-11-06. Antes de programar cada cambio se corrige la spec anterior que contradiga (ver "Specs y constitución por corregir").
- [x] **Art. 2 Offline-first:** grabar no depende de nada nuevo. Los umbrales se guardan en el teléfono y se copian a la sesión local al iniciar. Los estados de la actividad no cambian; recalcular la distancia no la mueve de estado (RN-11). Lo único que borra datos sin sincronizar es que el usuario borre su cuenta, con aviso (CA-46, RN-1).
- [x] **Art. 3 Seguridad y privacidad:** los endpoints nuevos usan `JwtAuthGuard` y el id del token, en `/user/me` (3.3). La respuesta nunca incluye `passwordHash` (3.2). El hash sigue en el trigger, que ya cubre `UPDATE` (3.1, D5). Elegir una zona no usa la ubicación (3.5). El token del túnel y los del bot van en variables de entorno (3.6).
- [x] **Art. 4 Contratos de API:** DTOs con `class-validator` y mensajes en español. Endpoints documentados abajo. Se agrega `503` para la base no disponible, por lo que 4.2 necesita actualizarse (D9).
- [x] **Art. 5 Datos:** migración de Prisma con nombre y versión 6 de SQLite con paso nuevo en `schema.ts`. El recálculo de distancias es un script versionado, no una edición a mano (D7). Unidades sin cambios: metros y milisegundos convertidos solo en pantalla.
- [x] **Art. 6 Verificación:** ver la tabla "Verificación".
- [x] **Art. 7 Simplicidad y stack:** sin dependencias nuevas. Los avatares son íconos que ya existen (D4).
- [x] **Art. 8 Ritmo:** rama `011-estabilidad`, que sale de `master` después de fusionar la 010, o de `010-mapa-3d-animaciones` si esa fusión aún no ocurre.

## Backend

### Endpoints

Todos usan JWT y el id del token. Los errores `400` llevan el detalle por campo del `ValidationPipe`.

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| PATCH | `/user/me` | JWT | `{ displayName?: string, avatarId?: string \| null }` | `200` usuario sin `passwordHash` | `400`, `401` |
| PATCH | `/user/me/email` | JWT | `{ email: string, password: string }` | `200` usuario sin `passwordHash` | `400`, `401`, `403` contraseña incorrecta, `409` "Ya existe un usuario con ese email" |
| PATCH | `/user/me/password` | JWT | `{ currentPassword: string, newPassword: string }` (mínimo 8) | `204` | `400`, `401`, `403` contraseña incorrecta |
| DELETE | `/user/me` | JWT | `{ password: string }` | `204` | `400`, `401`, `403` contraseña incorrecta, `409` hay una alerta activa |

Cambios en endpoints que ya existen:

- `GET /user/profile`, `POST /user`: la respuesta lleva `avatarId` en lugar de `avatarUrl`.
- `POST /routes`: el recorrido y el perfil se calculan sin saltos (CA-15, CA-16).
- `GET /routes/nearby` y `GET /routes/:id`: `author` es "Cuenta eliminada" si la ruta no tiene autor (RN-16).
- **Todos:** un token de una cuenta borrada responde `401` (CA-49). Si el servidor no alcanza la base, responde `503` con mensaje en español (CA-14).

### Módulos / archivos

**Cuenta (CA-41 a CA-49)**

- `backend/src/user/dto/`: `update-profile.dto.ts`, `update-email.dto.ts`, `update-password.dto.ts` y `delete-account.dto.ts`, con los mensajes del registro. El nombre usa la regla de 5 caracteres sin espacios de los extremos (spec 001, RN-4).
- `backend/src/user/avatars.ts`: `AVATAR_IDS`, para validar con `@IsIn`. Son 8, elegidos por el usuario (2026-11-07): `montana`, `pino`, `cactus`, `sol`, `ola`, `senderismo`, `trail` y `bici`. En el frontend usan los íconos `image-filter-hdr`, `pine-tree`, `cactus`, `white-balance-sunny`, `waves`, `hiking`, `run` y `bike` de MaterialCommunityIcons (D4).
- `backend/src/user/user.service.ts`: `updateProfile`, `updateEmail`, `updatePassword` y `deleteAccount`. La contraseña se compara con `bcrypt`, como en `AuthService`.
- `backend/src/user/user.controller.ts`: las cuatro rutas, declaradas con el usuario del token.
- `deleteAccount`, en una transacción:
  1. Si la cuenta tiene una alerta `ACTIVE`, responde `409`.
  2. Sus rutas `ARCHIVED` y `DRAFT` pasan a `DELETED`, porque nadie más las ve. Sus rutas `PUBLISHED` se quedan.
  3. Borra al usuario. Las actividades, puntos, favoritas, contactos, sesiones, alertas y dispositivos se borran en cascada. Las rutas conservadas quedan sin autor y sin `sourceActivityId` por el `SET NULL` de la migración.
- `backend/src/auth/strategies/jwt.strategies.ts`: `validate` comprueba que el usuario existe y responde `401` si no (D6).

**Rutas sin autor y saltos (CA-15, CA-16, CA-48)**

- `backend/src/route/route.service.ts`:
  - `LEFT JOIN users` en la búsqueda y el detalle, con `COALESCE(u."displayName", 'Cuenta eliminada')`.
  - `isMine` con `IS NOT DISTINCT FROM`, porque un `createdByUserId` nulo daría `NULL`, no `false`.
  - Al publicar, `ST_MakeLine` usa `sequence = ANY(...)` con los puntos que quedan, no `sequence >=`.
- `backend/src/route/recorrido.ts`: `sinSaltos(puntos)` (D8), que corre después de `sinPuntosViejos`. `perfilDe` recibe el resultado, así que CA-16 no necesita otro cambio.

**Errores (CA-14)**

- `backend/src/prisma-disponibilidad.filter.ts`: filtro global que convierte los errores de conexión de Prisma y del adaptador (`DatabaseNotReachable`, `P1001`) en `503` con "El servicio no está disponible. Inténtalo de nuevo en unos minutos.". Se registra en `main.ts` y en las e2e.

**Recálculo (CA-17)**

- `backend/src/activity/distancia.ts`: copia de `computeDistance` del frontend, con los mismos casos de prueba (D7).
- `backend/prisma/scripts/recalcular-distancias.ts`, con `npm run datos:recalcular-distancias`: por defecto solo informa; con `--aplicar` guarda. Por cada actividad con puntos viejos (`sinPuntosViejos`), recalcula su distancia y la de su ruta, si existe. La dificultad de esa ruta se vuelve a calcular con `dificultadDe`, porque depende de la distancia (spec 007, RN-6).

**Pruebas**

- `backend/vitest.config.e2e.ts`: `fileParallelism: false` (CA-22, D10).

### Cambios de esquema (Prisma)

Migración: `20261107000000_cuenta_y_rutas_sin_autor`.

- `users`: `avatarUrl` se renombra a `avatarId`. Nadie la usa aún y ya no guardará una URL.
- `routes.createdByUserId`: pasa a opcional, con `ON DELETE SET NULL`.
- `routes.sourceActivityId`: `ON DELETE SET NULL`. Sin esto, la cascada de actividades choca con las rutas conservadas.

## Frontend

### Configuración

- Sin paquetes nuevos. Requiere un build nuevo para los dos teléfonos (`minSdk` 24; el S9+ tiene Android 10).
- `EXPO_PUBLIC_BACKEND_IP`: la URL fija del túnel, solo en el build de campo.
- `EXPO_PUBLIC_BATTERY_TEST=1`: solo en el build de campo (RN-7). La 012 no la define, y su lista de verificación debe comprobarlo.

### Pantallas y navegación

**Grabación (CA-30, CA-35 a CA-40)**

- `pages/activity/activityPage.tsx`:
  - Mientras se graba, el mapa y los botones van en un contenedor. Los botones quedan **fuera** de `MapErrorBoundary`, así que sobreviven a un fallo del mapa (CA-37). El contenedor conserva su alto en ese caso.
  - La barra `actions` solo se muestra antes de iniciar y con `stopFailed` (CA-40). El panel de métricas usa ese espacio.
- `components/safety/SosButton.tsx`: círculo de 48 dp, igual que el botón 3D/2D, abajo a la derecha, con `onLongPress` de 2 s igual que hoy. `onPress` muestra la instrucción durante 3 s en un aviso sobre el mapa (CA-38). Se quita el texto fijo de abajo. `accessibilityLabel` "Pedir ayuda" y el `accessibilityHint` actual.
- `components/activity/StopButton.tsx`: píldora con ícono y "Detener", de 48 dp de alto, abajo al centro. `accessibilityLabel` "Detener actividad". Usa `handleStop` sin cambios.
- `components/map/RecordingMap.tsx`: `bottomNotice` sube por encima de "Detener" y "Pedir ayuda". La alerta y los avisos de arriba no cambian. El logo se queda abajo a la izquierda (CA-36).
- Colores de `surface` y `alert` con `shadows.floating`, como los controles del mapa actuales (CA-39).

**Cuenta y perfil (CA-41 a CA-49)**

- `pages/account/profilePage.tsx`: nombre, avatar, y acceso a correo, contraseña y borrar cuenta. Se abre desde `mainPage`, que también muestra el avatar.
- `pages/account/changeEmailPage.tsx`, `changePasswordPage.tsx` y `deleteAccountPage.tsx`. La última explica qué se borra, cuántas actividades faltan por subir y que las rutas publicadas siguen sin autor. Si hay una actividad en `RECORDING` o una alerta local activa, no deja continuar (CA-47).

**Umbrales (CA-50 a CA-52)**

- `components/safety/InactivitySettings.tsx`: dos grupos de `Chip` en la pestaña Seguridad.

**Rutas sin conexión (CA-53 a CA-60)**

- `exploreRoutesPage`, `routeDetailPage` y `favoritesPage`: con datos guardados, muestran un `Notice` con "Datos guardados" y la fecha, en lugar del aviso de sin conexión. En el detalle, sin fondo de mapa, el `Polyline` se sigue dibujando (CA-55).

**Zonas (CA-20, CA-21, CA-31 a CA-34)**

- `pages/map/offlineZonesPage.tsx`: lista con tamaño, avance, reintentar y borrar. Se abre desde `mainPage`.
- `pages/map/pickZonePage.tsx`: mapa de Mapbox con un marco fijo en el centro. El usuario mueve y acerca el mapa, y ve el tamaño aproximado antes de confirmar. No usa la ubicación (spec 010, CA-8).

**Opción de prueba (CA-8, RN-7)**

- `components/map/MapViewToggle.tsx`: con `EXPO_PUBLIC_BATTERY_TEST=1`, agrega "Sin mapa", que desmonta el mapa y deja los botones.

### Hooks / estado / almacenamiento local

**SQLite, versión 6** (`lib/db/schema.ts`):

```sql
CREATE TABLE app_settings (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE route_cache (
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,          -- 'nearby', 'detail' o 'favorites'
  cache_key TEXT NOT NULL,     -- id de la ruta; 'last' en los otros dos
  payload TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  PRIMARY KEY (user_id, kind, cache_key)
);

ALTER TABLE safety_sessions ADD COLUMN quiet_ms INTEGER;
ALTER TABLE safety_sessions ADD COLUMN response_ms INTEGER;
```

**Cuenta**

- `lib/account/api.ts`, `lib/account/avatars.ts` (id, ícono y color) y `hooks/account/useAccount.ts`. Sin conexión no hacen la petición (CA-45).
- `lib/db/account.ts`: `deleteLocalAccount(userId)` borra en una transacción las actividades, la bandeja, los contactos, `app_settings` y `route_cache` de esa cuenta. Después se llama a `logout` (CA-46).
- En otro teléfono, el `401` de la cuenta borrada cierra la sesión con el manejador que ya existe. Los datos locales se quedan sin uso: las consultas filtran por `user_id` y nadie más los ve (CA-49).

**Umbrales**

- `lib/safety/thresholds.ts` (lógica pura): opciones de RN-9, lectura segura y `umbralesDeSesion(sesion, base)`. Una sesión sin valores usa los por defecto.
- `createSessionActions.iniciar` copia la elección a `quiet_ms` y `response_ms` (CA-51).
- `lib/safety/recording.ts`, `areYouOk.ts` y `hooks/safety/useAreYouOk.ts` usan los de la sesión en lugar de `UMBRALES_APP`. `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES` sigue mandando en desarrollo.

**Rutas sin conexión**

- `lib/db/routeCache.ts`: guardar, leer, borrar por ruta y recortar. Conserva las favoritas y las últimas 30 rutas abiertas.
- `lib/routes/status.ts`: nuevos resultados `{ offline: true, saved }` y estado `saved`, con sus pruebas.
- `useNearbyRoutes`, `useRouteDetail` y `useRouteLists`: al responder bien, guardan. Sin red, o si la petición no llega al servidor, leen lo guardado (D3). Un `404` borra la ruta guardada (CA-59).
- `useFavorites`: al refrescar, descarga el detalle de las favoritas que falten, para cumplir CA-55 con una favorita que nunca se abrió.
- "Mis rutas" y las mutaciones no cambian: ya piden conexión (CA-58).

**Zonas**

- `lib/map/offlineZones.ts` (lógica pura): marco a límites, conteo de mosaicos, tamaño aproximado y tope de RN-8.
- `lib/map/offlinePacks.ts`: envoltura de `Mapbox.offlineManager`.
- `hooks/map/useOfflineZones.ts`: lista, avance, reintento y borrado. Los paquetes son del teléfono, no de la cuenta (D2).

**Recálculo**

- `lib/metrics/oldPoints.ts`: copia de `sinPuntosViejos`.
- `lib/db/activityMetrics.ts`: `recalcularDistanciasViejas()` corre una vez al arrancar, marcada en `app_settings`, y guarda solo la distancia, sin tocar el estado (RN-11).

**Bugs del frontend**

- `lib/db/sqlite.ts`: `PRAGMA busy_timeout = 5000`, también en la conexión de las transacciones exclusivas (R2).
- `lib/routes/status.ts`: `mensajeDeFallo` muestra el mensaje del `503` (CA-14).

## Prueba de campo (fase 4)

Los pasos exactos van en `tasks.md`. Reparto:

| Qué | Teléfono | CA |
|---|---|---|
| Actividad real de al menos 30 min, con pantalla bloqueada una parte | Los dos a la vez | CA-1, CA-3, CA-7 |
| Distancia y elevación contra una app de GPS de referencia | S9+ con barómetro; Nothing Phone 2 con GPS y la app de referencia | CA-2, RN-10 |
| Batería: sin mapa, 2D y 3D, 30 min cada una, mismo recorrido | S9+ | CA-8 |
| Barómetro y quieto | S9+ | 004 M3, M5 |
| Elevación con GPS | Nothing Phone 2 | 004 M4 |
| Zona descargada en modo avión | Los dos | CA-20, CA-21 |
| Alerta real por Telegram | Uno de los dos | CA-9, CA-10, CA-11 |
| Publicar la actividad y revisar perfil | Cualquiera | CA-5 |

- **Batería:** brillo fijo, pantalla encendida y misma carga inicial aproximada. Se lee `Charge counter` de `dumpsys battery` al inicio y al final, porque el porcentaje es poco preciso en 30 minutos. Se usa el S9+ porque, al ser el más lento, es el peor caso para el 3D.
- **Backend:** la computadora se queda encendida, con `TELEGRAM_MODE=polling`, sin suspensión. El modo polling no necesita webhook.
- **Bicicleta (CA-4):** recorrido simulado a unos 20 km/h en el emulador o con ubicación simulada, no en campo.

## Decisiones

| # | Decisión | Alternativas consideradas | Motivo |
|---|---|---|---|
| D1 | Túnel con dominio fijo, como ngrok | Túnel con URL que cambia en cada arranque; adelantar el despliegue | El usuario eligió túnel. `EXPO_PUBLIC_BACKEND_IP` se fija al compilar: con URL cambiante habría que recompilar cada vez. Es una herramienta de la computadora, no una dependencia del proyecto. Requiere que el usuario cree la cuenta. |
| D2 | Zonas por teléfono, sin ligarlas a la cuenta | Paquetes por usuario | Son datos públicos del mapa y ocupan espacio: duplicarlos no aporta nada. Se conservan al cerrar sesión y al borrar la cuenta. |
| D3 | La consulta sin conexión también se usa si la petición no llega al servidor | Solo con `hayConexion` falso | En la sierra el teléfono puede creer que tiene red, y el túnel puede caerse. Un `5xx` sigue siendo error. |
| D4 | Avatares como íconos de `@expo/vector-icons` con color, y `avatarId` en la base | Imágenes propias; reutilizar `avatarUrl` | No suma recursos ni peso. La lista de ids se repite en backend y frontend, y una prueba de cada lado fija los mismos valores. |
| D5 | La contraseña nueva se escribe en `passwordHash` y la hashea el trigger | `bcrypt` en NestJS | El trigger ya cubre `BEFORE UPDATE` y solo actúa si el valor cambia. Solo hay que corregir la redacción de 3.1. |
| D6 | `JwtStrategy.validate` consulta si el usuario existe | Lista de tokens revocados; aceptar el token hasta que caduque | Sin esto, un token de una cuenta borrada responde `200` o falla con `500` al subir actividades. Es una consulta por clave primaria en cada petición, aceptable a esta escala. Un cambio de contraseña no cierra las otras sesiones; la spec no lo pide. |
| D7 | Recalcular con el mismo algoritmo en dos lados: script en el servidor y paso único en el teléfono | Endpoint que empuje la distancia al teléfono; restar la distancia del punto viejo | Los dos lados tienen los mismos puntos, así que dan lo mismo sin endpoint nuevo. La distancia usa promedios, así que restar no sería exacto. El costo es copiar un archivo pequeño al backend, fijado con los mismos casos de prueba. |
| D8 | `sinSaltos` recorre los puntos y descarta los que implican más de 50 m/s respecto al último conservado. Si queda menos de la mitad, usa el tramo sin saltos más largo | Guardar `routes.path` como `MultiLineString`; quedarse siempre con el tramo más largo | Un `MultiLineString` tocaría las búsquedas, `ST_StartPoint` y el dibujo en la app. Un GPS que se pierde con tiempo de por medio no supera 50 m/s, así que casi todos los saltos son puntos falsos que se pueden quitar. Las rutas ya publicadas no se tocan: CA-15 aplica al publicar. |
| D9 | `503` para la base no disponible | Mantener `500` y detectarlo en la app | Es el código correcto y deja el mensaje en el servidor, como los demás. Requiere agregarlo a 4.2. |
| D10 | Archivos de e2e en serie | Aislar los datos de cada archivo; base de pruebas propia | Ya se sabe que en serie pasan, y es un cambio de una línea. La causa exacta no se investiga. La suite tarda más, sin efecto en la app. |
| D11 | Contraseña incorrecta responde `403`, no `401` | `401` | `apiFetch` cierra la sesión con cualquier `401` que lleve token. Equivocarse de contraseña no debe sacar al usuario. |
| D12 | Las pantallas nuevas no pasan por Figma; solo se actualiza el marco de grabación | Prototipar todas | Usan los componentes del sistema de diseño de la 009, y falta poco tiempo. El marco de grabación se actualiza porque 009 M1 compara contra Figma. |
| D13 | Zonas con zoom 10 a 13, tope de 900 km² (unos 30 × 30 km, unos 140 MB) y máximo 10 zonas | Zoom 10 a 15; sin tope | Medido en T2: zoom 13 pesa 142 MB y usa 34 paquetes de mosaicos; zoom 15 pesa 152 MB y usa 74. A zoom 14, el de la grabación, se ve bien. Mapbox admite 750 paquetes en total, así que 10 zonas dejan margen (RN-8). |
| D14 | Se descargan los dos estilos, claro y oscuro, y el relieve | Solo el tema actual | El tema sigue al teléfono y puede cambiar en la salida. Medido en T2: el segundo estilo no descarga nada, porque comparte sus mosaicos con el primero. Cada zona son dos paquetes de `createPack` con `tilesets: [TERRAIN_URL]`. |
| D15 | Tamaño aproximado: unos 28 MB más 0.126 MB por km² | Proporcional al área | El tamaño no crece con el área: 100 km² pesan 41 MB y 900 km², 142 MB, porque se descargan paquetes completos. La fórmula sale de esas dos mediciones en la sierra y es solo una aproximación (CA-31). |

## Specs y constitución por corregir

Antes del código de cada fase, con nota en su historial (RN-4):

- **Constitución v1.9:** 3.1, el trigger actúa al insertar o cambiar la contraseña. 4.2, se agrega `503`. Requiere tu aprobación, junto con este plan.
- **006:** CA-15 y RN-3.
- **007:** RN-1, RN-10, el requisito offline, el autor de la ruta y la nota de mapas sin conexión.
- **008:** RN-4, con los valores como opciones.
- **010:** CA-6, hay botones sobre el mapa.
- **001 y 002:** referencias a la edición de perfil, ya cubierta aquí.

## Verificación

| CA | Tipo | Cómo |
|---|---|---|
| CA-1 a CA-3, CA-5 a CA-11 | Manual, teléfono real | Prueba de campo |
| CA-4 | Manual | Recorrido simulado a velocidad de bicicleta |
| CA-12, CA-19, CA-26, CA-28, CA-29 | Manual y documental | Reporte de campo y `tasks.md` |
| CA-13 | Manual y Vitest | 20 repeticiones; prueba de la configuración si se puede aislar |
| CA-14 | Vitest y e2e | Filtro y `mensajeDeFallo`; caso manual con la base inalcanzable |
| CA-15, CA-16 | Vitest y e2e | `sinSaltos`, publicar con salto |
| CA-17 | Vitest y manual | `distancia.ts`, `oldPoints.ts`; script en modo informe y luego `--aplicar` |
| CA-18 | Manual | 20 repeticiones en un teléfono real |
| CA-20, CA-21, CA-32 a CA-34 | Manual | Teléfono real o emulador, en modo avión |
| CA-31 | Vitest y manual | `offlineZones.ts`; selector en pantalla |
| CA-22, CA-25 | Automatizada | Comandos de la suite |
| CA-23, CA-24 | Vitest | Pruebas nuevas; revisión de la lista |
| CA-27 | Postman | Colección con los endpoints nuevos |
| CA-30, CA-35 a CA-40 | Manual | Emulador y teléfono real, claro y oscuro, medir 48 dp |
| CA-41 a CA-44, CA-46 a CA-49 | Vitest, e2e y manual | Servicio, DTOs, e2e de `/user/me`, y pantallas |
| CA-45 | Vitest y manual | Sin red no hay petición |
| CA-50 a CA-52 | Vitest y manual | `thresholds.ts`, procesador con umbrales de sesión |
| CA-53 a CA-60 | Vitest y manual | `routeCache` con `node:sqlite`, `status.ts`; pantallas en modo avión |

**Lista inicial para CA-23.** Se revisa al empezar la fase 3:

- **Con lógica y sin prueba:** `lib/db/activityMetrics.ts`, `lib/safety/areYouOk.ts`, `backend/src/auth/auth.controller.ts`, `backend/src/user/user.controller.ts`.
- **Lo más probable es que no apliquen:** constantes, reexportaciones y envolturas nativas, como `lib/map/camera.ts`, `lib/map/mapbox.ts`, `lib/sensors/barometer.ts` y `lib/safety/notifications.ts`. Se anota el motivo de cada uno.

## Riesgos

- **R1 — Mapas descargados.** El relieve sin red ya se comprobó en T2. Borrar, cerrado en T34: `deletePack` quita la zona de la lista, pero el espacio no se libera al momento y la zona se sigue viendo sin red, aun tras reiniciar. `TileStore.setOption` con `disk-quota` no lo acelera, así que la app no lo usa. Mapbox lo libera con el tiempo: lo de T2 ya no estaba dos días después. CA-33 se cambió con aprobación del usuario. Además, las zonas caducan según Mapbox, sin plazo publicado; `acceptExpired` viene activado, así que una zona vieja se sigue usando.
- **R2 — `database is locked`.** La hipótesis es que `withExclusiveTransactionAsync` abre otra conexión mientras la recuperación de actividades corre al abrir la app, y que SQLite no espera porque no hay `busy_timeout`. No está confirmada: se reproduce primero (RN-3).
- **R3 — CA-14.** En el código actual, un `5xx` al publicar da "No se pudo completar", no el mensaje de internet que se vio en la 010. Hay que reproducirlo para encontrar qué rama lo mostró. Además, el nombre exacto del error del adaptador se confirma al escribir el filtro.
- **R4 — "Pedir ayuda" sin texto.** Un círculo solo con ícono se entiende menos que el botón anterior, y queda cerca de "Detener". Se revisa en la prueba de campo, usando el teléfono con una mano.
- **R5 — Tiempo.** Es la mayor carga de trabajo de todas las specs, con poco margen antes de la 012. Si falta tiempo, el orden de recorte acordado es: zonas descargadas y después consulta sin conexión. La prueba de campo no se recorta.
- **R6 — Túnel y computadora.** Si la computadora se suspende, no salen las alertas ni el aviso por hora de regreso. La grabación no se afecta (RN-12). Conviene probarlo en casa, con datos móviles, antes de salir.
- **R7 — Medir batería.** 30 minutos dan una diferencia pequeña, y el clima y la señal influyen. Si el resultado queda cerca de los límites, se repite la medición.
- **R8 — Ahorro de batería de Samsung y Nothing.** Ambos pueden matar el servicio de ubicación. Si pasa, CA-7 falla con severidad bloqueante y hay que pedir la excepción de batería al usuario, lo que puede requerir cambiar la spec.
- **R9 — Borrar una cuenta es irreversible.** Se cubre con e2e, incluido que la cascada no falle por rutas, alertas o mensajes. Las pruebas usan cuentas de prueba, nunca las del usuario.
