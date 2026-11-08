# 011 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de `frontend/lib/` sin imports de React Native incluyen sus pruebas Vitest (constitución 6.1), y las de backend, las suyas.

Dos tareas detienen el trabajo: T2 (si el relieve no funciona sin red, se vuelve a la spec antes de programar las zonas) y T5 (`activityPage` no cambia hasta aprobar el marco de Figma). Las fases 1 a 3 terminan antes de la prueba de campo (RN-6). Si falta tiempo, se recorta primero la fase 1E y después la 1D (plan, R5).

## Antes de empezar (lo hace el usuario)

- Fusionar la 010 en `master`, actualizar el `master` local y crear la rama `011-estabilidad`. Traer a esa rama los cambios de `specs/` que siguen sin commit.
- Crear la cuenta del túnel y su dominio fijo, y guardar el token fuera del repositorio, sin pegarlo en el chat (plan, D1).
- Activar la depuración USB en el Galaxy S9+ y el Nothing Phone 2.
- Tener el bot real de Telegram en `backend/.env` y una persona con Telegram que acepte ser contacto de prueba.
- Instalar en el Nothing Phone 2 una app de GPS de referencia, y elegir un recorrido a pie de al menos 30 minutos que se pueda repetir.

## Fase 0 — Preparación

- [x] T1 — Corregir las specs anteriores, con nota en su historial: 006 (CA-15, RN-3), 007 (RN-1, RN-10, requisito offline, autor, nota de mapas), 008 (RN-4), 010 (CA-6), 001 y 002 (referencias al perfil). (RN-4)
- [x] T2 — Prueba técnica en una rama desechable: descargar una zona nunca vista con los estilos claro y oscuro y el relieve (`tilesets`). En modo avión, confirmar el terreno en 2D y el relieve en 3D. Medir el tamaño real de una zona de 30 × 30 km y revisar los límites de Mapbox. Fijar en el plan zoom, tope y estilos (D13, D14, R1). **Detiene el trabajo si falla.** (CA-20, RN-8)

  Hecho (2026-11-06), en el emulador, con San Pedro Mártir, zona nunca vista por el emulador. Rama y pantalla temporal ya borradas. **Pasa:** el relieve funciona sin red.
  - **Sin red:** con modo avión y sin Wi-Fi ni datos, se vieron 3D claro, 2D claro y 3D oscuro. Tras cerrar y abrir la app sin red, las zonas siguieron y el 3D claro cargó sin errores. El oscuro no se probó tras reiniciar. La primera vez, con la app recién descargada, hubo errores de mosaicos de `composite`, sin efecto visible.
  - **Medidas:**

    | Zona | Zoom | Tamaño | Paquetes |
    |---|---|---|---|
    | 30 × 30 km | 10 a 15 | 152 MB | 74 |
    | 30 × 30 km | 10 a 13 | 142 MB | 34 |
    | 10 × 10 km | 10 a 13 | 41 MB | 10 |

  - **Tiempo:** unos 6 minutos en el emulador con zoom 15. Depende de la red.
  - **Decidido:** zoom 10 a 13, 900 km² como tope y máximo 10 zonas (D13). Los dos estilos, porque el segundo no descargó nada (D14). Fórmula de tamaño en D15.
  - **Mapbox:** 750 paquetes de mosaicos en total, sin tope de bytes, y lo descargado cuenta en la facturación normal por usuarios activos. Los mapas no se pueden incluir en la app: se descargan desde sus servidores.
  - **Hallazgo:** al borrar, la zona sale de la lista pero el disco no baja (R1). Se revisa en T34.
- [ ] T3 — Compilar el build e instalarlo en el S9+ y el Nothing Phone 2. Iniciar sesión, grabar 1 minuto y ver el mapa en cada uno. Confirmar que el S9+ detecta el barómetro y el Nothing Phone 2 no. (CA-1, CA-6)
- [ ] T4 — Levantar el backend con el túnel y `TELEGRAM_MODE=polling`. Probar desde un teléfono con datos móviles, sin Wi-Fi, que inicia sesión y sincroniza. Comprobar que la computadora no se suspende. (RN-12)

## Fase 1A — Botones de la grabación

- [x] T5 — Actualizar en Figma el marco de grabación, en claro y oscuro, con los dos botones flotantes y los avisos. Presentarlo al usuario y anotar su aprobación en el historial de la spec. **Detiene `activityPage`.** (CA-30, CA-35, D12)

  Hecho (2026-11-06): sección "Grabación con botones flotantes (spec 011)" en la página Pantallas, con 6 estados por modo (12 marcos), y componentes `Botón flotante / Pedir ayuda` y `Botón flotante / Detener` en Sistema de diseño. Los marcos de la 010 se conservan. Al revisarlo, el usuario pidió "Pedir ayuda" de 48 dp y abajo a la derecha. Aprobado por el usuario.
- [x] T6 — `SosButton`: círculo de 48 dp, abajo a la derecha, mantener 2 s, toque corto con la instrucción en un aviso de 3 s, y etiqueta para lector de pantalla. (CA-30, CA-38, CA-39)

  Hecho (2026-11-06): `SosButton` es un círculo de `touchMin`, sin texto, con los colores `alert` y `onAlert` y la sombra de los controles del mapa. Un toque corto muestra la instrucción 3 s, en `avisosMapa`, que también se ve si el mapa falla. `tsc` y Vitest pasan (565 pruebas). Sin probar en el emulador: se revisa en T9, ya en su lugar final. Hasta T7 sigue en la barra de abajo.
- [x] T7 — `StopButton` y `activityPage`: contenedor del mapa con los botones fuera de `MapErrorBoundary`, y barra `actions` solo antes de iniciar y con `stopFailed`. (CA-35, CA-37, CA-39, CA-40)

  Hecho (2026-11-06): `components/activity/StopButton.tsx` y contenedor `mapa` en `activityPage`. "Detener" va al centro y "Pedir ayuda" a la derecha, en la misma fila y fuera de `MapErrorBoundary`. La barra `actions` solo se muestra sin grabar, con "Iniciar actividad" o "Volver". `tsc` y Vitest pasan. Sin probar en el emulador: se revisa en T9.
- [x] T8 — `RecordingMap`: `bottomNotice` sube sobre "Detener" y "Pedir ayuda". (CA-36)

  Hecho (2026-11-06): `bottomNotice` queda 8 dp por encima de la fila de botones. Los avisos de arriba no cambian, porque "Pedir ayuda" ya no va ahí. `tsc` pasa. Sin probar en el emulador: se revisa en T9.
- [x] T9 — Correr M1 a M4 y anotar los resultados. (CA-30, CA-35 a CA-40)

  Hecho (2026-11-06) en el emulador `Pixel_8_Pro`, con `TELEGRAM_MODE=log`: no salió ningún mensaje real. Queda sin correr M4 paso 2 (TalkBack).
  - **M1, pasa:** "Iniciar actividad" sigue abajo y sin botones sobre el mapa antes de iniciar. Los dos botones miden 48 dp de alto en la captura (144 px a densidad 3), en claro y en oscuro. Mantener 2 s envía la alerta, "Detener" abre el resumen y, forzando el fallo de `finishActivity`, aparece "Volver" con su aviso.
  - **M2, pasa:** sin encimarse con alerta activa, alerta más "Mapa sin conexión", "Esperando señal GPS" y "Volver a mi posición". "Mapa no disponible" se revisó con el error forzado de M3. El logo sigue visible.
  - **M3, pasa:** con un error forzado en `RecordingMap`, los dos botones siguen y "Pedir ayuda" envió la alerta. "Detener" terminó la actividad con la pregunta de la alerta activa.
  - **M4 paso 1, pasa:** un toque corto muestra la instrucción y no crea alerta. **Paso 2, sin correr:** `uiautomator` no funciona durante la grabación, así que las etiquetas solo se revisaron en el código. Se corre en un teléfono real (T51).
  - **Observación:** al editar `activityTracker.hook.ts` con una actividad en curso, "Detener" dejó de responder. Con la app reiniciada funcionó las dos veces, así que se atribuye a la recarga en caliente de esa prueba. No se confirmó la causa.

## Fase 1B — Cuenta y perfil

### Backend

- [x] T10 — Migración `20261107000000_cuenta_y_rutas_sin_autor`: `avatarUrl` a `avatarId`, `createdByUserId` opcional y `SET NULL` en `routes`. Actualizar los usos de `avatarUrl`. (CA-42, CA-48)

  Hecho (2026-11-07): antes de crearla, una consulta de solo lectura confirmó que ningún usuario tenía `avatarUrl` (0 de 6), así que la columna se renombra sin perder datos. `routes.createdByUserId` y `routes.sourceActivityId` quedan con `ON DELETE SET NULL`. Aplicada en Supabase con `migrate deploy`, y `migrate diff` contra `schema.prisma` sale vacío. `avatarUrl` cambia a `avatarId` en `User` (ya no es `@IsUrl`) y en las pruebas de usuario y del `ValidationPipe`. Las consultas de rutas siguen con `JOIN`: el `LEFT JOIN` es T13. Vitest (390) y e2e (72) pasan.
- [x] T11 — `avatars.ts`, `UpdateProfileDto`, `PATCH /user/me`. (CA-41, CA-42, RN-15)

  Hecho (2026-11-07): el plan no fijaba la lista de avatares; el usuario eligió 8 (`montana`, `pino`, `cactus`, `sol`, `ola`, `senderismo`, `trail`, `bici`) y quedaron en el plan, con nota en el historial de la spec. `UpdateProfileDto` valida el nombre con la regla del registro, rechaza `displayName: null` y acepta `avatarId: null` para quitar el avatar. `updateProfile` solo cambia los campos que vienen. Pruebas en `avatars.spec.ts`, `update-profile.dto.spec.ts` y `user.service.spec.ts`; Vitest pasa (401). Contra el backend local, con la cuenta de M9: `200` con avatar válido y con `null`, `400` con una URL, con un nombre corto y con `null`, y `401` sin token. La cuenta quedó sin avatar, como estaba. El e2e es T16.
- [x] T12 — `PATCH /user/me/email` y `PATCH /user/me/password`, con `403` para la contraseña incorrecta. (CA-43, CA-44, RN-13, D11)

  Hecho (2026-11-07): `UpdateEmailDto` normaliza el correo como el registro, y `UpdatePasswordDto` pide la actual y una nueva de al menos 8. `verificarContrasena` compara con `bcrypt` y responde `403` "La contraseña no es correcta"; si el usuario no existe, `401`. La contraseña nueva se escribe en `passwordHash` y la hashea el trigger (D5). Vitest pasa (413). Contra el backend local, con una cuenta desechable que después se borró: `403` con la contraseña mala sin cambiar nada, `409` con el mensaje del registro para un correo usado, `400` con una nueva corta, y tras cada cambio el login viejo da `401` y el nuevo `200`. El hash guardado empieza con `$2a$`. El e2e es T16.
- [x] T13 — `route.service`: `LEFT JOIN`, autor "Cuenta eliminada" e `isMine` con `IS NOT DISTINCT FROM`. (CA-48, RN-16)

  Hecho (2026-11-07): `nearby` y `detail` usan `LEFT JOIN users` y `COALESCE(u."displayName", 'Cuenta eliminada')`, con la constante `AUTOR_CUENTA_ELIMINADA`. `exigirDueno`, favoritas y "Mis rutas" ya comparan en JS o filtran por el usuario, así que no cambian: una ruta sin autor da `403` al editar o borrar. Pruebas nuevas en `route.service.spec.ts`; Vitest (419) y los e2e de rutas (30) pasan. En Supabase, con una ruta temporal sin autor fuera de Baja California (después borrada): la búsqueda y el detalle dan "Cuenta eliminada", `isMine` falso y sin `sourceActivityId`; `PATCH` y `DELETE` dan `403`, y otro usuario puede guardarla en favoritas.
- [x] T14 — `DELETE /user/me`: `409` con alerta activa, rutas no públicas a `DELETED` y borrado en una transacción. (CA-46, CA-47, CA-48)

  Hecho (2026-11-07): `DeleteAccountDto` pide la contraseña, que se comprueba antes de la transacción (`403`, D11). Dentro, una alerta `ACTIVE` da `409` con `MENSAJE_ALERTA_ACTIVA`, las rutas `ARCHIVED` y `DRAFT` pasan a `DELETED` y después se borra el usuario. Antes, una consulta a la base confirmó que todas las llaves hacia `users` y `activities` son `CASCADE` o `SET NULL`. Las pruebas de los DTOs de cuenta quedan en `dto/account.dto.spec.ts`. Vitest pasa (423). En Supabase, con una cuenta desechable con actividad, ruta publicada desde ella, ruta archivada, sesión con alerta activa y la ruta publicada en favoritas de M9: `403` con la contraseña mala, `400` sin ella y `409` con la alerta activa, sin borrar nada. Con la alerta cancelada, `204`: sin usuario, actividades, sesión ni alerta; la archivada pasa a `DELETED`, la publicada sigue sin autor ni `sourceActivityId`, M9 la ve como "Cuenta eliminada" y sigue en sus favoritas, y el login da `401`. Después se borraron las rutas de prueba. El e2e es T16.
- [x] T15 — `JwtStrategy.validate`: `401` si el usuario no existe. (CA-49, D6)

  Hecho (2026-11-07): `validate` llama a `UserService.exists`, una consulta por clave primaria, y responde `401` si el usuario no existe. Pruebas en `jwt.strategies.spec.ts` y `user.service.spec.ts`; Vitest (427) y todos los e2e (72) pasan. Contra el backend local, con dos cuentas desechables borradas con `DELETE /user/me`: el mismo token daba `200` antes y `401` después en el perfil, las rutas cercanas, los contactos, `PATCH /user/me`, la lista de actividades y `POST /activities/sync`. No quedan cuentas de prueba en la base.
- [x] T16 — e2e en `backend/test/user.e2e-spec.ts`: los cuatro endpoints, una cuenta con ruta, favorita de otro usuario, contactos y sesión, y el token de una cuenta borrada. Usar solo cuentas creadas por la prueba. (CA-41 a CA-44, CA-46 a CA-49, R9)

  Hecho (2026-11-07): nuevo `describe` de 15 pruebas, con tres cuentas creadas por la prueba. Cubre `401` sin token, perfil y avatar (incluido `null`), correo (`403`, `409`, login con el nuevo y no con el anterior), contraseña (`403`, `400`, login y hash bcrypt), y el borrado de una cuenta con actividad, ruta publicada desde ella, ruta archivada, favorita de otro usuario, contacto y sesión con alerta activa: `400`, `403` y `409` sin borrar nada, `204` con la cascada, la archivada en `DELETED`, la publicada sin autor vista como "Cuenta eliminada" en el detalle, la búsqueda y las favoritas, `403` al editarla, y `401` con el token de la cuenta borrada. La actividad, la sesión y la alerta se crean con Prisma y las rutas con SQL en el Pacífico. Toda la suite e2e pasa (87), y al terminar no quedan cuentas ni rutas de prueba. En la tabla de verificación, CA-41 a CA-49 siguen pendientes por la parte de frontend y los casos manuales.

### Frontend

- [x] T17 — `lib/account/api.ts`, `lib/account/avatars.ts` y `hooks/account/useAccount.ts`. Sin red no se hace la petición. (CA-41 a CA-45)

  Hecho (2026-11-07): `avatars.ts` repite los 8 ids del backend, con su ícono de MaterialCommunityIcons, un token del tema como color (`primary`, `secondary` o `data`, así sirve en claro y oscuro) y una etiqueta para el lector de pantalla; sin avatar o con un id desconocido usa `account-outline` en `textMuted`. `api.ts` tiene las cuatro peticiones con el patrón de `lib/routes/api.ts` (nunca lanza, 15 s de límite), `conConexion`, que sin red no hace la petición (CA-45), y `mensajeDeCuenta`, `erroresDeCuenta` y `esContrasenaIncorrecta` para las pantallas. `useAccount` expone las mutaciones `profile`, `email`, `password` y `remove`, e invalida `['profile']` al cambiar el perfil o el correo; borrar la cuenta no borra los datos locales ni cierra la sesión, eso es T21. `tsc` y Vitest pasan (587, 22 nuevas). El hook todavía no lo usa ninguna pantalla: se prueba en T18 y T19.
- [x] T18 — `profilePage` y avatar en `mainPage`. (CA-41, CA-42, CA-45)

  Hecho (2026-11-07): `components/account/Avatar.tsx` (círculo con fondo `background` y borde, donde los colores de los avatares tienen el contraste comprobado), `pages/account/profilePage.tsx` (vista previa, correo, nombre visible y selector de los 8 avatares más "Sin avatar", como botones de radio con etiqueta) y la ruta `Profile`. En Inicio, el avatar de 40 dp, con área de toque de 48, va a la derecha del encabezado y abre el perfil. `lib/account/profile.ts` valida el nombre como el registro y solo envía lo que cambió, con su prueba. `tsc` y Vitest pasan (592). En el emulador, con la cuenta de M9: M5 pasa (nombre de 4 caracteres con error junto al campo y sin guardar; nombre válido y cactus visibles en Inicio; una sesión nueva lee lo mismo del servidor; quitar el avatar devuelve el ícono por defecto). M7, solo para el perfil: con Wi-Fi y datos apagados aparece "Sin conexión", la selección se conserva y el servidor no cambia; al volver la red se guarda. Se revisó en claro y en oscuro. La cuenta de M9 quedó con su nombre y sin avatar. Los accesos a correo, contraseña y borrar cuenta se agregan con sus pantallas (T19, T21). En el build de desarrollo, el botón flotante "Tools" de Expo tapa el avatar hasta que se arrastra.
- [x] T19 — `changeEmailPage` y `changePasswordPage`. (CA-43, CA-44, CA-45)

  Hecho (2026-11-07): las dos pantallas y sus rutas (`ChangeEmail`, `ChangePassword`), con acceso desde la sección "Cuenta" del perfil. `lib/account/credentials.ts` valida con las reglas y mensajes del registro, con su prueba; la contraseña nueva se confirma, como al registrarse. La contraseña incorrecta (`403`) va junto a su campo sin cerrar la sesión (D11), y el correo usado se muestra en un aviso. `tsc` y Vitest pasan (599). En el emulador, con una cuenta desechable, que después se borró con `DELETE /user/me`: M6 pasa completo (contraseña mala y correo existente sin cambios ni cierre de sesión; tras cada cambio, en la app y con la API, solo entran el correo y la contraseña nuevos). M7 pasa para correo y contraseña: con Wi-Fi y datos apagados aparece "Sin conexión" y el servidor no cambia. Falta M7 para borrar la cuenta (T21). Metro debe correr sin `CI=1`: con esa variable no detecta cambios en los archivos.
- [x] T20 — Versión 6 de SQLite: `app_settings`, `route_cache` y columnas de `safety_sessions`, con su prueba de migración. (CA-50, CA-53, constitución 5.3)

  Hecho (2026-11-07): paso 6 en `lib/db/schema.ts`, con el SQL del plan. La elección de los pasos que faltan pasa a `pasosPendientes(version)`, que usan `sqlite.ts` y la prueba. `lib/db/schema.test.ts` migra una base v5 con una actividad y una sesión de seguridad sin perderlas (la sesión queda con `quiet_ms` y `response_ms` nulos), revisa las tablas y columnas nuevas, la llave por cuenta de `app_settings` y `route_cache`, y una base nueva hasta v6. La prueba de v5 en `safety.test.ts` ya no fija `user_version = 5`. `tsc` y Vitest pasan (606). En el emulador, la base de la app pasó de v5 a v6 al abrirla, sin errores y con las tablas y columnas nuevas; no tenía actividades, así que conservar datos se prueba solo en la prueba de migración.
- [x] T21 — `lib/db/account.ts` con `deleteLocalAccount`, y `deleteAccountPage`, con aviso de pendientes y de rutas, y bloqueo durante una actividad o alerta. (CA-46, CA-47, CA-48)

  Hecho (2026-11-07): `lib/db/account.ts` tiene `getEstadoLocalDeCuenta` (grabando, alerta local activa y actividades sin subir) y `deleteLocalAccount`, que borra en una transacción las actividades (con puntos, barómetro, sesión y detector en cascada), sesiones, bandeja, contactos, `app_settings` y `route_cache` de esa cuenta; su prueba revisa que no toca otra cuenta y que un fallo no borra nada. `lib/account/deletion.ts` tiene el bloqueo y los avisos, con su prueba. `deleteAccountPage` (ruta `DeleteAccount`, tarjeta "Borrar cuenta" en el perfil) explica qué se borra, cuántas actividades sin subir se pierden y que las publicadas siguen como "Cuenta eliminada"; pide la contraseña y una confirmación, y al terminar borra lo local, limpia la caché de consultas, cierra la sesión y vuelve al inicio. Al ganar el foco vuelve a leer el estado local y "Mis rutas". `tsc` y Vitest pasan (618). En el emulador, con una cuenta desechable con una ruta publicada (favorita de M9), una archivada y una actividad grabada sin red:
  - **M7 (borrar), pasa:** sin red avisa "1 actividad sin subir" y, al confirmar, "Sin conexión" sin borrar nada.
  - **M9:** paso 1 no se puede alcanzar desde la app, porque salir de la grabación pide terminar la actividad; el bloqueo local queda cubierto por `account.test.ts`. Paso 2 pasa con una alerta `ACTIVE` creada en el servidor (la cuenta no tenía contactos para pedir ayuda desde la app): responde el `409` y la app muestra "No puedes borrar tu cuenta mientras tienes una alerta activa".
  - **M8, pasa:** con la contraseña mala no pasa nada; con la correcta vuelve al inicio y el login da "Credenciales invalidas". Con M9, la ruta se abre desde favoritas como "Por Cuenta eliminada", sin opciones de edición; la archivada quedó `DELETED`. En el teléfono no quedó nada de la cuenta. Después se borraron las dos rutas de prueba y la favorita de M9.
  - Para grabar en el emulador hubo que activar la precisión de ubicación de Google; lo hizo el usuario.
- [x] T22 — Correr M5 a M10 y anotar los resultados. (CA-41 a CA-49)

  Hecho (2026-11-07) en el emulador `Pixel_8_Pro`, con el backend local y `TELEGRAM_MODE=log`. Se usaron la cuenta de M9, que quedó como estaba, y cuentas desechables que se borraron al terminar. El "otro dispositivo" de M5 y M10 fue una sesión nueva contra la API.
  - **M5, pasa** (T18): nombre de 4 caracteres con error junto al campo y sin guardar; nombre válido y avatar visibles en Inicio y leídos igual desde otra sesión; quitar el avatar devuelve el ícono por defecto.
  - **M6, pasa** (T19): contraseña incorrecta y correo existente sin cambios ni cierre de sesión, con "Ya existe un usuario con ese email"; tras cambiar correo y contraseña solo entran los nuevos, en la app y con la API.
  - **M7, pasa** (T18, T19, T21): sin Wi-Fi ni datos, perfil, correo, contraseña y borrar la cuenta muestran "Sin conexión" y el servidor no cambia; al volver la red todo sigue como estaba.
  - **M8, pasa** (T21): el aviso dice qué se borra, "1 actividad sin subir" y que la ruta publicada sigue como "Cuenta eliminada"; con la contraseña incorrecta no pasa nada; con la correcta vuelve al inicio y el login falla; con otra cuenta la ruta se abre desde favoritas sin opciones de edición y la archivada no aparece.
  - **M9, parcial** (T21): paso 1 no se puede alcanzar, porque salir de la grabación pide terminar la actividad; el bloqueo local lo cubren `account.test.ts` y `deletion.test.ts`. Paso 2 pasa con una alerta `ACTIVE` creada en el servidor (la cuenta no tenía contactos): la app explica que hay una alerta activa y no borra. Queda probarlo pidiendo ayuda desde la app en la prueba de campo, con un contacto real.
  - **M10, pasa:** con una cuenta abierta en el emulador y borrada desde otra sesión, al tirar para actualizar en Actividades la app cerró la sesión y volvió al inicio, sin fallar.

## Fase 1C — Umbrales de inactividad

- [x] T23 — `lib/safety/thresholds.ts`: opciones de RN-9, lectura segura y `umbralesDeSesion`. (CA-50, CA-52)

  Hecho (2026-11-07): opciones de RN-9 (5 a 30 min y 1 a 5 min) con 10 y 2 por defecto, tomados de `UMBRALES`. `leerEleccion` lee lo guardado en `app_settings` (clave `umbrales_inactividad`): sin nada, con JSON dañado o con un valor fuera de las opciones usa el de por defecto en ese campo; `guardarEleccion` no guarda valores fuera de las opciones. `aSesion` da los milisegundos que se copian a la sesión (T24). `umbralesDeSesion(sesion, base)` usa los de la sesión; una sesión de antes de v6 o un valor inválido usa la base, y si la base trae los minutos de `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES` mandan esos. La distancia de 30 m no cambia. `tsc` y 11 pruebas Vitest pasan; todavía nadie lo usa (T24, T25).
- [x] T24 — Copiar la elección a la sesión al iniciar, y usarla en `recording.ts`, `areYouOk.ts` y `useAreYouOk`. (CA-51, CA-52)

  Hecho (2026-11-07): `lib/db/settings.ts` lee y guarda `app_settings`, y la elección de umbrales por cuenta, con su prueba. `LocalSafetySession` trae `quietMs` y `responseMs`, y `createSafetySession` los guarda. `sessionActions.iniciar` lee la elección de la cuenta y la copia a la sesión, así que cambiarla después no afecta a la actividad en curso. El procesador de ubicaciones, la notificación de "¿Estás bien?" (`umbralesDeActividad` en `areYouOk.ts`), la cuenta regresiva de `useAreYouOk` y el texto de `AreYouOkModal` usan `umbralesDeSesion`; `UMBRALES_APP` queda solo como base (RN-4 o los minutos de depuración). Pruebas nuevas: con 5 y 1 minutos el procesador pregunta y alerta antes de los 6 minutos, y una sesión de antes de v6 todavía no pregunta. `tsc` y Vitest pasan (637). Se prueba en la app en T26 (M11), con la pantalla de T25 y contactos activos para que se cree la sesión.
- [x] T25 — `InactivitySettings` en la pestaña Seguridad. (CA-50)

  Hecho (2026-11-07): `components/safety/InactivitySettings.tsx`, sección "Si dejo de moverme" antes del aviso del 911 en la pestaña Seguridad (también aparece al abrirla desde la grabación). Explica los 30 m y que los cambios se usan desde la siguiente actividad; las opciones de RN-9 son `Chip` en grupos de radio, y se guardan al tocar con `useInactivitySettings`, sin red. `tsc` y Vitest pasan (637). En el emulador, con la cuenta de M9: muestra 10 y 2 por defecto; con Wi-Fi y datos apagados se eligieron 20 y 5, y siguen elegidos tras cerrar y abrir la app. Después se volvió a 10 y 2. Durante las pruebas de T18 y T19 un toque automático dejó a M9 con el avatar `montana`; se regresó a `null`.
- [x] T26 — Correr M11 y anotar los resultados. (CA-50 a CA-52)

  Hecho (2026-11-07) en el emulador `Pixel_8_Pro`, con `TELEGRAM_MODE=log` y sin `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES`. Dos cuentas desechables (A y B), cada una con un contacto activo creado en la base para que se cree la sesión de seguridad; al terminar se borraron desde "Borrar cuenta" y no quedó nada en el servidor ni en el teléfono. Los umbrales de cada sesión se leyeron de `safety_sessions` en la base del teléfono. Se respondió "Ahora no" a la ubicación en segundo plano: la detección corre con la pantalla encendida.
  - **Paso 1, pasa:** con la cuenta A se eligieron 5 y 1 y siguen elegidos tras cerrar y abrir la app.
  - **Paso 2, pasa:** la actividad empezó a las 22:50:18 y "¿Estás bien?" salió a las 22:55:18, con "Llevas 5 minutos sin moverte. Si no respondes en 1 minuto…" y cuenta regresiva de 1:00. Se respondió "Estoy bien".
  - **Paso 3, no se alcanza desde la app:** durante la grabación no hay forma de llegar a Seguridad, porque salir pide terminar la actividad. Se comprobó lo equivalente: después de elegir 30 y 5, la sesión de la primera actividad seguía con 300 000 y 60 000 ms. El procesador usa los de la sesión (`recording.test.ts`).
  - **Paso 4, pasa:** con Wi-Fi y datos apagados, la siguiente actividad de A guardó 1 800 000 y 300 000 ms (30 y 5).
  - **Paso 5, pasa:** la cuenta B, sin cambios, guardó 600 000 y 120 000 ms (10 y 2).

## Fase 1D — Rutas sin conexión

- [x] T27 — `lib/db/routeCache.ts`: guardar, leer, borrar y recortar, separado por cuenta. (CA-53, CA-55, CA-56, CA-60, RN-14)

  Hecho (2026-11-08): `saveNearby`/`getNearby` (clave `last`, solo la última búsqueda), `saveFavorites`/`getFavorites` (última lista) y `saveRouteDetail`/`getRouteDetail`/`deleteRouteDetail` (por id de ruta, para el `404` de CA-59). Leer devuelve `{ data, savedAt }` para el aviso con fecha, o `null` si no hay nada o el valor está dañado. `saveRouteDetail` recorta con `trimRouteDetails`: conserva las últimas 30 rutas abiertas (`MAX_DETALLES`) y, además, las que están en la lista de favoritas guardada; volver a abrir una ruta la pone al día. Todo filtra por `user_id`; cerrar sesión no borra nada y `deleteLocalAccount` ya borra la tabla. `routeCache.test.ts` (12 pruebas, `node:sqlite`) cubre guardar, reemplazar, valor dañado, recorte con favoritas y separación por cuenta. `tsc` y Vitest pasan (649). Todavía nadie lo usa (T29 a T31).
- [ ] T28 — `lib/routes/status.ts`: resultados y estado `saved`. (CA-53 a CA-57)
- [ ] T29 — `useNearbyRoutes` y `exploreRoutesPage`, incluido abrir sin red con la búsqueda guardada. (CA-53, CA-54, CA-59)
- [ ] T30 — `useRouteDetail` y `routeDetailPage`: guardar, leer, borrar con `404` y aviso. (CA-55, CA-57, CA-59)
- [ ] T31 — `useFavorites` y `favoritesPage`, con descarga del detalle de las favoritas. (CA-55, CA-56, CA-59)
- [ ] T32 — Correr M12 a M16 y anotar los resultados. (CA-53 a CA-60)

## Fase 1E — Zonas descargadas

- [ ] T33 — `lib/map/offlineZones.ts`: límites, conteo de mosaicos, tamaño aproximado y tope. (CA-31, RN-8)
- [ ] T34 — `lib/map/offlinePacks.ts` y `useOfflineZones`: crear, avance, reintentar, listar y borrar. Comprobar primero que una zona borrada deja de verse sin red y si `disk-quota` libera el espacio (plan, R1). (CA-32, CA-33)
- [ ] T35 — `pickZonePage`: marco, tamaño, confirmar o cancelar, rechazo por tope o por tener ya 10 zonas, y sin red. (CA-31, CA-34)
- [ ] T36 — `offlineZonesPage` y acceso desde `mainPage`. (CA-32, CA-33)
- [ ] T37 — Comprobar `RecordingMap` con una zona descargada y sin ella. Correr M17 a M19 y anotar los resultados. (CA-20, CA-21, CA-31 a CA-34)

## Fase 1F — Opción de prueba

- [ ] T38 — "Sin mapa" en `MapViewToggle`, solo con `EXPO_PUBLIC_BATTERY_TEST=1`. Comprobar que sin la variable no aparece. (CA-8, RN-7)

## Fase 2 — Bugs

- [ ] T39 — `database is locked`: reproducirlo primero. Si se reproduce, aplicar `busy_timeout` (plan, R2). Correr M20. Si no se reproduce, se cierra por RN-3. (CA-13)
- [ ] T40 — Filtro de `503`, mensaje en `mensajeDeFallo`, y reproducir qué rama mostró el mensaje de internet (plan, R3). Correr M21. (CA-14, D9)
- [ ] T41 — `sinSaltos` en `recorrido.ts` y publicar con `sequence = ANY(...)`, con e2e en `route-publish.e2e-spec.ts`. Correr M22. (CA-15, CA-16, D8)
- [ ] T42 — `backend/src/activity/distancia.ts`, con los mismos casos que `frontend/lib/metrics/distance.test.ts`, y script `datos:recalcular-distancias`. (CA-17, RN-11, D7)
- [ ] T43 — `lib/metrics/oldPoints.ts` y `recalcularDistanciasViejas`, una sola vez, sin cambiar el estado. (CA-17, RN-11)
- [ ] T44 — Correr el script en modo informe, revisar la lista con el usuario y aplicar. Correr M23. (CA-17)
- [ ] T45 — Correr M24 en un teléfono real. Corregir si se reproduce; si no, cerrar por RN-3. (CA-18)

## Fase 3 — Pruebas

- [ ] T46 — `fileParallelism: false` en `vitest.config.e2e.ts`, y correr la suite 5 veces seguidas. (CA-22, D10)
- [ ] T47 — Revisar la lista de CA-23 del plan. Escribir las pruebas que falten y anotar por qué no aplican las demás. (CA-23)
- [ ] T48 — Revisar que cada bug corregido en la fase 2 tenga una prueba que falle sin la corrección. (CA-24)

## Fase 4 — Prueba de campo

- [ ] T49 — Compilar el build de campo con la URL del túnel y `EXPO_PUBLIC_BATTERY_TEST=1`, e instalarlo en los dos teléfonos. Descargar la zona del recorrido en cada uno. (CA-8, CA-20, RN-7, RN-12)
- [ ] T50 — Ensayo cerca de casa, con datos móviles: 10 minutos grabando en cada teléfono y una alerta de prueba. (R6)
- [ ] T51 — Correr M25, M26, M28 y M29 en la salida, y M4 paso 2 con TalkBack en un teléfono. (CA-1 a CA-3, CA-5 a CA-7, CA-38)
- [ ] T52 — Correr M30, la medición de batería. Si no cumple, ajustar el mapa y volver a medir. (CA-8)
- [ ] T53 — Correr M31 y M32 con el contacto real. (CA-9 a CA-11)
- [ ] T54 — Correr M19 en la zona real, en modo avión. (CA-20, CA-21)
- [ ] T55 — Correr M27, el recorrido simulado a velocidad de bicicleta. (CA-4)
- [ ] T56 — Hacer el reporte en este archivo, con la revisión de M33. Clasificar cada fallo por severidad y decidir con el usuario. (CA-12, CA-19, CA-29, RN-2)
- [ ] T57 — Corregir los fallos bloqueantes y los que el usuario pida, con su prueba si se puede. Repetir el caso que falló. (CA-19, CA-24)

## Fase 5 — Regresión y cierre

- [ ] T58 — Correr M34, los casos pendientes de las specs 005, 007, 008 y 009. 009 M1 lo hace el usuario. (CA-26)
- [ ] T59 — Agregar a la colección de Postman los endpoints nuevos y correrla en Postman. (CA-27)
- [ ] T60 — Correr pruebas unitarias de backend y frontend, e2e y lint. (CA-25)
- [ ] T61 — Ejecutar `/spec-verify`. Actualizar los estados de 004, 009, 010 y 011 y `specs/roadmap.md`. Anotar en la 012 que debe quitar el túnel y comprobar que no define `EXPO_PUBLIC_BATTERY_TEST`. (CA-28, RN-7)

## Cobertura

Los 60 criterios tienen al menos una tarea y una forma de verificarse.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | Caso manual M25 | Manual, teléfono real | Pendiente |
| CA-2 | Caso manual M26 | Manual, teléfono real | Pendiente |
| CA-3 | Caso manual M25 | Manual, teléfono real | Pendiente |
| CA-4 | Caso manual M27 | Manual, simulado | Pendiente |
| CA-5 | Caso manual M28 | Manual, teléfono real | Pendiente |
| CA-6 | Caso manual M29 | Manual, teléfono real | Pendiente |
| CA-7 | Caso manual M25 | Manual, teléfono real | Pendiente |
| CA-8 | Caso manual M30 | Manual, teléfono real | Pendiente |
| CA-9 | Caso manual M31 | Manual, teléfono real | Pendiente |
| CA-10 | Caso manual M32 | Manual, teléfono real | Pendiente |
| CA-11 | Caso manual M32 | Manual, teléfono real | Pendiente |
| CA-12 | Caso manual M33 | Revisión | Pendiente |
| CA-13 | Caso manual M20 | Manual | Pendiente |
| CA-14 | `prisma-disponibilidad.filter.spec.ts`, `frontend/lib/routes/status.test.ts` y caso manual M21 | Automatizada y manual | Pendiente |
| CA-15 | `backend/src/route/recorrido.spec.ts`, `route-publish.e2e-spec.ts` y caso manual M22 | Automatizada y manual | Pendiente |
| CA-16 | `recorrido.spec.ts`, `route-publish.e2e-spec.ts` y caso manual M22 | Automatizada y manual | Pendiente |
| CA-17 | `backend/src/activity/distancia.spec.ts`, `frontend/lib/metrics/oldPoints.test.ts` y caso manual M23 | Automatizada y manual | Pendiente |
| CA-18 | Caso manual M24 | Manual, teléfono real | Pendiente |
| CA-19 | Reporte de campo en este archivo (T56) | Revisión | Pendiente |
| CA-20 | Caso manual M19 | Manual, teléfono real | Pendiente |
| CA-21 | Caso manual M19 | Manual, teléfono real | Pendiente |
| CA-22 | `npm run test:e2e`, 5 veces seguidas | Automatizada | Pendiente |
| CA-23 | Pruebas nuevas y lista revisada en T47 | Automatizada y revisión | Pendiente |
| CA-24 | Revisión de T48 y T57 | Revisión | Pendiente |
| CA-25 | `npm test` y `npm run test:e2e` en backend, Vitest en frontend, y `npm run lint` | Automatizada | Pendiente |
| CA-26 | Caso manual M34 | Manual | Pendiente |
| CA-27 | Caso manual M35 | Postman | Pendiente |
| CA-28 | Revisión de estados en T61 | Revisión | Pendiente |
| CA-29 | Reporte de campo en este archivo (T56) | Revisión | Pendiente |
| CA-30 | Caso manual M1 | Manual | Cumple (emulador) |
| CA-31 | `frontend/lib/map/offlineZones.test.ts` y caso manual M17 | Automatizada y manual | Pendiente |
| CA-32 | Caso manual M17 | Manual | Pendiente |
| CA-33 | Caso manual M18 | Manual | Pendiente |
| CA-34 | Caso manual M17 | Manual | Pendiente |
| CA-35 | Caso manual M1 | Manual | Cumple (emulador) |
| CA-36 | Caso manual M2 | Manual | Cumple (emulador) |
| CA-37 | Caso manual M3 | Manual | Cumple (emulador) |
| CA-38 | Caso manual M4 | Manual | Parcial: falta TalkBack |
| CA-39 | Caso manual M1 | Manual | Cumple (emulador) |
| CA-40 | Caso manual M1 | Manual | Cumple (emulador) |
| CA-41 | `user.service.spec.ts`, `update-profile.dto.spec.ts`, `user.e2e-spec.ts`, `frontend/lib/account/profile.test.ts` y caso manual M5 | Automatizada y manual | Cumple (Vitest, e2e y emulador) |
| CA-42 | `user.e2e-spec.ts`, `frontend/lib/account/avatars.test.ts` y caso manual M5 | Automatizada y manual | Cumple (Vitest, e2e y emulador) |
| CA-43 | `user.service.spec.ts`, `user.e2e-spec.ts` y caso manual M6 | Automatizada y manual | Cumple (Vitest, e2e y emulador) |
| CA-44 | `user.service.spec.ts`, `user.e2e-spec.ts` y caso manual M6 | Automatizada y manual | Cumple (Vitest, e2e y emulador) |
| CA-45 | `frontend/lib/account/api.test.ts` y caso manual M7 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-46 | `user.service.spec.ts`, `user.e2e-spec.ts`, `frontend/lib/db/account.test.ts` y caso manual M8 | Automatizada y manual | Cumple (Vitest, e2e y emulador) |
| CA-47 | `user.service.spec.ts`, `user.e2e-spec.ts`, `frontend/lib/db/account.test.ts`, `frontend/lib/account/deletion.test.ts` y caso manual M9 | Automatizada y manual | Cumple (Vitest, e2e y emulador; M9 paso 1 no se alcanza desde la app) |
| CA-48 | `route.service.spec.ts`, `user.e2e-spec.ts` y caso manual M8 | Automatizada y manual | Cumple (Vitest, e2e y emulador) |
| CA-49 | `user.e2e-spec.ts`, `jwt.strategies.spec.ts` y caso manual M10 | Automatizada y manual | Cumple (Vitest, e2e y emulador) |
| CA-50 | `frontend/lib/safety/thresholds.test.ts`, `frontend/lib/db/settings.test.ts` y caso manual M11 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-51 | `frontend/lib/safety/recording.test.ts`, `sessionActions.test.ts` y caso manual M11 | Automatizada y manual | Cumple (Vitest y emulador; M11 paso 3 no se alcanza desde la app) |
| CA-52 | `thresholds.test.ts`, `recording.test.ts` y caso manual M11 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-53 | `frontend/lib/db/routeCache.test.ts`, `status.test.ts` y caso manual M12 | Automatizada y manual | Pendiente |
| CA-54 | `status.test.ts` y caso manual M12 | Automatizada y manual | Pendiente |
| CA-55 | `routeCache.test.ts`, `status.test.ts` y caso manual M13 | Automatizada y manual | Pendiente |
| CA-56 | `routeCache.test.ts`, `status.test.ts` y caso manual M13 | Automatizada y manual | Pendiente |
| CA-57 | `status.test.ts` y caso manual M13 | Automatizada y manual | Pendiente |
| CA-58 | Caso manual M14 | Manual | Pendiente |
| CA-59 | Caso manual M15 | Manual | Pendiente |
| CA-60 | `routeCache.test.ts` y caso manual M16 | Automatizada y manual | Pendiente |

### Casos manuales

Antes de la fase 4, salvo que digan otra cosa, se pueden correr en el emulador, con las cuentas de prueba.

**M1 — Botones flotantes**
1. Con un contacto activo, abrir "Iniciar actividad". Comprobar que el botón "Iniciar actividad" sigue abajo y no hay botones sobre el mapa.
2. Iniciar y mirar el mapa, en claro y en oscuro.
3. Medir los dos botones con `uiautomator`.
4. Mantener "Pedir ayuda" 2 s y cancelar la alerta.
5. Tocar "Detener".
6. Forzar que la actividad no se pueda cerrar y comprobar "Volver".
- **Esperado:** "Pedir ayuda" es un círculo del tamaño del botón 3D/2D, abajo a la derecha, y "Detener" es más pequeño que el botón anterior, abajo al centro. Ambos miden al menos 48 × 48 dp y se distinguen sobre el mapa. La alerta sale igual que antes, "Detener" lleva al resumen y "Volver" aparece en el paso 6.

**M2 — Avisos sobre el mapa**
1. Grabando, provocar por separado: alerta activa, modo avión, mapa no disponible y espera de GPS.
2. En cada uno, mover el mapa para que aparezca "Volver a mi posición", y cambiar 3D/2D.
- **Esperado:** ningún aviso ni control se encima con los botones flotantes. El logo del mapa sigue visible.

**M3 — Mapa que falla**
1. Grabando, provocar el fallo del mapa, con un token inválido o forzando el error.
2. Tocar "Pedir ayuda" manteniendo 2 s, cancelar y tocar "Detener".
- **Esperado:** los dos botones siguen visibles y funcionan. La actividad se guarda.

**M4 — Toque corto y lector de pantalla**
1. Tocar "Pedir ayuda" una vez, sin mantener.
2. Activar TalkBack y enfocar los dos botones.
- **Esperado:** no se crea ninguna alerta y aparece la instrucción unos 3 s. TalkBack anuncia "Pedir ayuda" con la instrucción, y "Detener actividad".

**M5 — Perfil**
1. Cambiar el nombre por uno de 4 caracteres.
2. Cambiarlo por uno válido y elegir un avatar.
3. Iniciar sesión con esa cuenta en otro dispositivo.
4. Quitar el avatar.
- **Esperado:** (1) error junto al campo, sin guardar. (2) se ve en Inicio. (3) se ve igual. (4) vuelve el ícono por defecto.

**M6 — Correo y contraseña**
1. Cambiar el correo con una contraseña incorrecta y después a uno que ya existe.
2. Cambiarlo a uno nuevo con la contraseña correcta. Cerrar sesión e intentar entrar con el anterior y con el nuevo.
3. Cambiar la contraseña con la actual incorrecta.
4. Cambiarla bien. Intentar entrar con la anterior y con la nueva.
- **Esperado:** (1) no cambia nada, sin cerrar la sesión, y el segundo intento dice "Ya existe un usuario con ese email". (2) solo entra el nuevo. (3) no cambia nada, sin cerrar la sesión. (4) solo entra la nueva.

**M7 — Cuenta sin conexión**
1. En modo avión, intentar cambiar nombre, avatar, correo y contraseña, y borrar la cuenta.
- **Esperado:** la app indica que necesita conexión en cada caso. Al volver la red, todo sigue como estaba.

**M8 — Borrar la cuenta**
1. Con una cuenta de prueba desechable que tenga una ruta publicada, una archivada y una actividad sin subir, abrir "Borrar cuenta".
2. Leer el aviso. Escribir una contraseña incorrecta.
3. Escribir la correcta y confirmar.
4. Intentar iniciar sesión con esa cuenta.
5. Con otra cuenta, buscar la ruta publicada y abrirla. Si era favorita, abrirla desde favoritas.
- **Esperado:** (2) el aviso dice qué se borra, cuántas actividades faltan por subir y que las rutas publicadas siguen sin autor; con la contraseña incorrecta no pasa nada. (3) lleva al inicio. (4) no entra. (5) la ruta se ve con "Cuenta eliminada", sin opciones de edición. La archivada no aparece.

**M9 — No se puede borrar**
1. Con una actividad en curso, intentar borrar la cuenta.
2. Con una alerta activa, intentarlo también.
- **Esperado:** la app no lo permite y explica por qué en los dos casos.

**M10 — Sesión en otro teléfono**
1. Iniciar sesión con una cuenta desechable en dos dispositivos.
2. Borrarla en uno.
3. En el otro, tirar para actualizar.
- **Esperado:** el otro cierra la sesión y vuelve al inicio, sin fallar.

**M11 — Umbrales**
1. En Seguridad, elegir 5 minutos y 1 minuto. Cerrar y volver a abrir la app.
2. Iniciar una actividad y quedarse quieto 5 minutos.
3. Con la actividad en curso, cambiar a 30 y 5. Seguir quieto después de responder.
4. Terminar e iniciar otra, en modo avión.
5. Con una cuenta sin cambios, iniciar una actividad.
- **Esperado:** (1) se conserva. (2) la pregunta sale a los 5 minutos, con 1 minuto de cuenta. (3) la actividad sigue con 5 y 1. (4) usa 30 y 5, sin red. (5) usa 10 y 2.

**M12 — Explorar sin conexión**
1. Con una cuenta que nunca ha buscado en este teléfono, en modo avión, abrir Explorar.
2. Con red, buscar rutas. Cerrar la app.
3. En modo avión, abrir la app y Explorar.
- **Esperado:** (1) mensaje de que necesita internet, sin quedarse cargando. (3) los resultados de la última búsqueda, con "Datos guardados" y su fecha.

**M13 — Detalle y favoritas sin conexión**
1. Con red, abrir una ruta y guardar otra en favoritas sin abrirla. Abrir la lista de favoritas.
2. En modo avión, abrir la ruta ya abierta, la lista de favoritas y la favorita.
3. Abrir una ruta sin datos guardados, desde los resultados de la búsqueda guardada.
- **Esperado:** (2) se ven los datos, el perfil y el recorrido, con el aviso de datos guardados, aunque falte el mapa de fondo. (3) mensaje de que necesita internet, sin quedarse cargando.

**M14 — Acciones sin conexión**
1. En modo avión, en una ruta guardada, tocar la favorita.
2. Intentar publicar una actividad y abrir "Mis rutas".
- **Esperado:** la app indica que necesita conexión y nada cambia al volver la red.

**M15 — Vuelve la conexión**
1. Con una ruta guardada, archivarla o borrarla desde otra cuenta o dispositivo.
2. Volver a tener red en el teléfono y abrir esa ruta, Explorar y favoritas.
- **Esperado:** los datos se actualizan y el aviso desaparece. La ruta ya no se muestra como disponible.

**M16 — Otra cuenta en el mismo teléfono**
1. Con la cuenta A, buscar, abrir rutas y guardar favoritas. Cerrar sesión.
2. Con la cuenta B, en modo avión si ya tiene sesión, o entrar con red y activar modo avión, abrir Explorar y favoritas.
- **Esperado:** la cuenta B no ve nada de la cuenta A.

**M17 — Descargar una zona**
1. Sin red, intentar elegir una zona.
2. Con red, elegir una zona demasiado grande.
3. Elegir una válida, ver su tamaño y cancelar.
4. Elegirla de nuevo y confirmar. Activar modo avión a mitad de la descarga.
5. Volver a tener red y reintentar.
- **Esperado:** (1) lo indica y no empieza. (2) no deja, y explica por qué. (3) no se descarga. (4) se ve el avance y la zona no aparece como lista. (5) termina y queda lista.

**M18 — Lista de zonas**
1. Con dos zonas descargadas, abrir la lista.
2. Borrar una.
3. En modo avión, grabar simulando estar en la zona borrada.
- **Esperado:** (1) cada una dice cuánto ocupa. (2) desaparece. (3) se comporta como una zona sin descargar.

**M19 — Usar una zona sin conexión**
1. Descargar una zona que el teléfono nunca haya visto.
2. En modo avión, grabar en esa zona, en 3D y en 2D, en claro y en oscuro.
3. En modo avión, grabar fuera de la zona.
- **Esperado:** (2) se ve el terreno en 2D y el relieve en 3D, no un fondo azul. (3) la grabación sigue igual, con el comportamiento sin conexión de la spec 010. Para cerrar CA-20 y CA-21 se corre en un teléfono real (T54).

**M20 — Iniciar justo al abrir**
1. Con actividades por recuperar y el dispositivo cargado, cerrar la app, abrirla e iniciar una actividad de inmediato.
2. Detenerla y repetir 20 veces.
- **Esperado:** siempre inicia y nunca aparece `database is locked` en la pantalla ni en los registros.

**M21 — Base no disponible**
1. Con el backend usando una `DATABASE_URL` que no responde, publicar una ruta con el teléfono en línea.
- **Esperado:** la app dice que el servicio no está disponible y que reintente. No menciona internet.

**M22 — Publicar con un salto**
1. Grabar con ubicación simulada un recorrido de más de 1.5 km, con un salto imposible a la mitad.
2. Publicarlo y abrir su detalle.
- **Esperado:** el mapa no dibuja el salto como un tramo recto, y el eje del perfil no suma la distancia del salto.

**M23 — Distancia recalculada**
1. Antes de aplicar el script, anotar la distancia de una actividad afectada en el teléfono y en el servidor.
2. Aplicar el script y abrir la app actualizada.
3. Reiniciar la app y correr de nuevo el script en modo informe.
- **Esperado:** el teléfono y el servidor muestran la misma distancia, y la ruta publicada desde ella también, si existe. La actividad sigue "Sincronizada". El paso 3 no cambia nada.

**M24 — Cambiar de ruta en el mapa**
1. En un teléfono real, con varias rutas en Explorar, seleccionar una y tocar el marcador de otra.
2. Repetir 20 veces, con distintas esperas.
- **Esperado:** siempre se selecciona la que se tocó. Si no se reproduce ningún fallo, se anotan los 20 intentos y se cierra por RN-3.

**M25 — Actividad real**
1. Con los teléfonos en otro lugar antes de la salida, llegar al inicio del recorrido.
2. Iniciar una actividad en los dos teléfonos, con el ahorro de batería normal.
3. Bloquear la pantalla al menos 30 minutos.
4. Detener y revisar resúmenes y puntos.
- **Esperado:** sin cierres. Los dos tienen puntos durante todo el recorrido, incluido el tiempo bloqueado, y su resumen completo. El recorrido no incluye la ubicación vieja.

**M26 — Precisión**
1. Grabar el mismo recorrido con el S9+, el Nothing Phone 2 y la app de referencia.
2. Comparar distancia y elevación ganada.
3. Anotar la altitud del S9+ al inicio y al final de un punto fijo, para ver la variación por clima.
- **Esperado:** dentro de RN-10: distancia ±5 %, barómetro ±15 % o ±15 m, GPS ±30 % o ±30 m.

**M27 — Velocidad de bicicleta**
1. Reproducir un recorrido simulado a unos 20 km/h durante al menos 5 minutos.
2. Mirar el avance del mapa en 3D y en 2D.
- **Esperado:** el usuario anota si es aceptable. Queda escrito que no se probó en una bicicleta real.

**M28 — Publicar la actividad de campo**
1. Publicar la actividad de M25 y abrir su detalle.
- **Esperado:** la distancia del perfil y la de la ruta difieren poco, y el perfil se lee sin picos falsos. Si se ve mal, se registra el fallo.

**M29 — Casos pendientes de la 004**
1. Correr 004 M3 y M5 en el S9+, al aire libre.
2. Correr 004 M4 en el Nothing Phone 2.
- **Esperado:** lo que pide cada caso, con lecturas reales. Si el Nothing Phone 2 dice que usó barómetro, se corrige la spec y se anota.

**M30 — Batería**
1. En el S9+, con brillo fijo, pantalla encendida y carga parecida al empezar, leer `Charge counter` con `adb shell dumpsys battery`.
2. Grabar 30 minutos con "Sin mapa". Leerlo de nuevo.
3. Repetir el mismo recorrido en 2D y en 3D.
4. Calcular el consumo por hora.
- **Esperado:** 3D no supera a "Sin mapa" en más de 30 %, ni 2D en más de 15 %. Si queda cerca del límite, se repite la medición.

**M31 — Telegram real**
1. Correr 008 M1, M2 y M3 con un teléfono real, un contacto real y el modo real del bot.
- **Esperado:** lo que pide cada caso, con mensajes reales.

**M32 — "¿Estás bien?" en el teléfono**
1. Con `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES=1` o el umbral más corto, esperar la pregunta.
2. Comprobar sonido y vibración.
3. Tocar "Estoy bien" en cuanto aparezca. Repetir 10 veces.
- **Esperado:** suena y vibra. El toque nunca se pierde y nunca sale una alerta.

**M33 — Revisión de valores por defecto**
1. Con lo visto en la salida, revisar con el usuario los 30 m, los 10 minutos y los 2 minutos.
- **Esperado:** queda anotado si se conservan o cambian. Si cambian, primero se actualiza la spec 008.

**M34 — Regresión pendiente**
1. Correr 005 M3 y comprobar si las pendientes suben durante la grabación.
2. Correr 007 M1 con el resumen de una pendiente, y 007 M6 con el mapa tras archivar y la opción de publicar de nuevo.
3. Correr 007 M8 en el segundo teléfono.
4. Correr 008 M8 paso 4.
5. Correr 008 M10, y comprobar que el servicio de ubicación termina y que el aviso se ve.
6. El usuario corre 009 M1 con el marco nuevo.
- **Esperado:** lo que pide cada caso, o el fallo registrado según CA-19.

**M35 — Postman**
1. Correr la colección completa en Postman, con el backend local.
- **Esperado:** todas las solicitudes pasan, incluidos los cuatro endpoints de `/user/me`.

## Reporte de la prueba de campo

Se llena en T56. Sin dirección de casa ni datos de los contactos.

- **Fecha y lugar:**
- **Teléfonos:** Galaxy S9+, Nothing Phone 2
- **Tipo de actividad:**
- **Resultados por CA:**
- **Fallos:**

| Fallo | Severidad | Resolución |
|---|---|---|

## Commits

Un commit por tarea cuando sea posible. Mínimo para la semana:

| Tipo | Tareas | Ejemplo |
|---|---|---|
| `docs(011)` | Spec, plan, tareas, T1, T2 | `docs(011): spec, plan y tareas de estabilidad` |
| `chore(011)` | T3, T4, T38, T46, T49 | `chore(011): archivos e2e en serie` |
| `feat(011)` | T5 a T9 | `feat(011): botones flotantes en la grabación` |
| `feat(011)` | T10 a T22 | `feat(011): editar perfil y borrar la cuenta` |
| `feat(011)` | T23 a T26 | `feat(011): umbrales de inactividad ajustables` |
| `feat(011)` | T27 a T32 | `feat(011): consultar rutas sin conexión` |
| `feat(011)` | T33 a T37 | `feat(011): descargar zonas del mapa` |
| `fix(011)` | T39 a T45, T57 | `fix(011): publicar sin saltos de ubicación` |
| `test(011)` | T47, T48 | `test(011): cubrir la lógica pura pendiente` |
| `docs(011)` | T50 a T56, T58 a T61 | `docs(011): reporte de campo y cierre` |

## Pendientes conocidos

- CA-38: M4 paso 2, con TalkBack en un teléfono real (T51).
