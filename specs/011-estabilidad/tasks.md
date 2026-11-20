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
- [x] T3 — Compilar el build e instalarlo en el S9+ y el Nothing Phone 2. Iniciar sesión, grabar 1 minuto y ver el mapa en cada uno. Confirmar que el S9+ detecta el barómetro y el Nothing Phone 2 no. (CA-1, CA-6)

  Hecho (2026-11-10) en los dos teléfonos.
  - **Build:** el APK de desarrollo arm64, compilado desde `C:\dev\sbc` en T45, que necesita Metro. Por USB, con `adb reverse` del 8081 y el 3000: Metro desde `C:\dev\SendaBC\frontend` con `EXPO_PUBLIC_BACKEND_IP=http://localhost:3000` y el backend local. El build de campo, sin Metro y con el túnel, es T49.
  - **S9+** (SM-G9650, Android 10, arm64), con barómetro LPS22HB según `dumpsys sensorservice`. La app se instaló sin problemas.
    - Se entró con la cuenta de Postman y se dio el permiso de ubicación "solo con la app en uso". El de segundo plano quedó en "Ahora no".
    - Se grabaron 2 min de senderismo con el teléfono quieto. El mapa 3D oscuro se vio con relieve y calles. Se guardaron 3 puntos, porque quieto no avanza los 5 m que pide un punto nuevo.
    - Al detener, la actividad quedó "Sincronizada" y el resumen dice "Elevación medida con barómetro": **el S9+ detecta el barómetro.**
  - **Nothing Phone 2** (A065, Android 16): `dumpsys sensorservice` no lista ningún sensor de presión. Con la misma build y la cuenta del usuario, que no tiene contactos activos, se grabaron 1:13 de senderismo con el teléfono quieto. El mapa 3D se vio con relieve y se guardaron 2 puntos. Al detener, la actividad quedó "Sincronizada" y el resumen dice "Elevación estimada con GPS": **el Nothing Phone 2 no detecta barómetro**, como se esperaba. Esa actividad de 1 min quedó en la cuenta del usuario.
  - **Nota:** el teclado de Samsung pierde letras con `adb shell input text`; hay que escribir de una en una.
- [x] T4 — Levantar el backend con el túnel y `TELEGRAM_MODE=polling`. Probar desde un teléfono con datos móviles, sin Wi-Fi, que inicia sesión y sincroniza. Comprobar que la computadora no se suspende. (RN-12)

  Hecho (2026-11-10).
  - **Túnel:** el de VS Code (Dev Tunnels) del puerto 3000, con la URL fija de `frontend/.env`. Para que funcione tiene que estar en visibilidad **Pública** y protocolo **HTTP**:
    - Privado, redirige al inicio de sesión de GitHub.
    - Con HTTPS, da `502`.
    - Al cambiar el protocolo, la visibilidad vuelve a privada.
    - VS Code tiene que quedarse abierto.
  - **Backend:** `TELEGRAM_MODE=polling` en `backend/.env`. Al arrancar registra "Recibiendo mensajes del bot con getUpdates", sin errores de Telegram.
  - **Pruebas por el túnel:** `POST /auth/login` con la cuenta de Postman da token, y `GET /activities` y `/routes/nearby` responden `200` en ~1 s. Con la versión de campo, el Nothing Phone 2 sin Wi-Fi, solo con datos móviles, cargó Rutas con distintos radios sin el aviso de datos guardados.
  - **Suspensión:** la computadora no tiene batería y su plan de energía ("High performance") no suspende con corriente.

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
- [x] T28 — `lib/routes/status.ts`: resultados y estado `saved`. (CA-53 a CA-57)

  Hecho (2026-11-08): `NearbyOutcome` y `RouteListOutcome` aceptan `{ offline: true, saved }`, y `RouteDetailOutcome` agrega `{ kind: 'saved', route, savedAt }`. `nearbyStatus`, `routeDetailStatus` y `routeListStatus` dan `saved` cuando hay datos guardados (también si la búsqueda o la lista guardada está vacía) y `offline` cuando no los hay (CA-54, CA-57). El detalle y las listas guardadas se siguen mostrando mientras se reintenta; una búsqueda nueva sigue mostrando "cargando" (spec 006, CA-16). Para los hooks: `sinConexion(saved)` y `detalleSinConexion(saved)` arman el resultado desde `routeCache`, y `noLlegoAlServidor(failure)` decide D3 (sin red o tiempo agotado sí; un `5xx` o un `404` no). `avisoDeGuardado(savedAt)` da el texto "Datos guardados el …". `RouteListNotice` no pinta nada con `saved`, igual que con `success`. 12 pruebas nuevas en `status.test.ts`; `tsc` y Vitest pasan (661). Ningún hook produce `saved` todavía (T29 a T31).
- [x] T29 — `useNearbyRoutes` y `exploreRoutesPage`, incluido abrir sin red con la búsqueda guardada. (CA-53, CA-54, CA-59)

  Hecho (2026-11-08): `lib/routes/offline.ts` tiene `consultarConRespaldo`, que usarán también T30 y T31: sin conexión no pide y devuelve lo guardado o nada; con respuesta exitosa la guarda y la devuelve (CA-59); si la petición no llegó al servidor usa lo guardado (D3), y sin nada guardado o con un `5xx` lanza el fallo para "Reintentar". Si guardar o leer fallan, la pantalla no se rompe. `useNearbyRoutes` lo usa con `getNearby`/`saveNearby` de la cuenta (la clave de la consulta lleva el `userId`), devuelve `savedAt` y, sin conexión, filtra lo guardado por el tipo elegido (`guardadasDelTipo`). En Explorar, con `saved` el aviso es "Datos guardados" con la fecha (`avisoDeGuardado`) y "Reintentar"; si no quedan rutas del tipo elegido lo dice (`NEARBY_MESSAGES.savedEmpty`). Si la búsqueda guardada es de otro lugar y ninguna ruta empieza dentro del radio actual (`guardadasFueraDeVista`), el mapa se mueve hacia ellas. Al abrir, con permiso de ubicación, la búsqueda automática ya cae en lo guardado sin red. Sin permiso, Explorar sigue sin buscar al abrir (spec 006, CA-14): lo guardado aparece al tocar "Buscar en esta zona". `offline.test.ts` (13 pruebas); `tsc` y Vitest pasan (674). Falta verlo en la app (M12, T32).
- [x] T30 — `useRouteDetail` y `routeDetailPage`: guardar, leer, borrar con `404` y aviso. (CA-55, CA-57, CA-59)

  Hecho (2026-11-08): `consultarDetalle` en `lib/routes/offline.ts` usa `consultarConRespaldo` y además, con un `404`, borra el detalle guardado y da `unavailable` (CA-59). Sustituye a `routeDetailOutcome`, que se quitó con sus pruebas. `useRouteDetail` guarda cada detalle que responde (con el recorte de T27), y sin conexión o si la petición no llega al servidor da el guardado (`saved`, con `savedAt`) o `offline` (CA-57). `editRoutePage` pasa `usarGuardado: false`: editar nunca parte de datos guardados (CA-58), y su clave de consulta es distinta de la del detalle. En `routeDetailPage`, con `saved` se ve la ruta completa (datos, perfil y recorrido, aunque falte el mapa de fondo) con el aviso "Datos guardados el …" y "Reintentar"; favoritas, editar, archivar y borrar siguen visibles y, sin red, avisan que necesitan conexión, como antes (CA-58). 7 pruebas nuevas en `offline.test.ts`; `tsc` y Vitest pasan (678). Falta verlo en la app (M13 a M15, T32).
- [x] T31 — `useFavorites` y `favoritesPage`, con descarga del detalle de las favoritas. (CA-55, CA-56, CA-59)

  Hecho (2026-11-08): `useRouteList` usa `consultarConRespaldo` con un respaldo opcional; solo lo tienen las favoritas, así que "Mis rutas" sigue necesitando conexión (CA-58). La clave de consulta lleva el `userId` y sigue bajo `['routes']`, que invalidan las mutaciones. Cada lista de favoritas que responde se guarda (CA-56, CA-59) y, en segundo plano, `descargarDetallesDeFavoritas` baja una por una el detalle de las favoritas disponibles que no estén guardadas (`getSavedDetailIds`, nuevo en `routeCache`), para que una favorita nunca abierta se vea sin red (CA-55). Un `404` o un fallo al guardar no detiene las demás; si la red se cae, se deja para el siguiente refresco. Solo corre una descarga a la vez. En `favoritesPage`, con `saved` se ve la lista con el aviso "Datos guardados el …" y "Reintentar"; una lista guardada vacía muestra el mensaje de lista vacía, y "Quitar" sin red avisa que necesita conexión, como antes. 4 pruebas nuevas (`offline.test.ts` y `routeCache.test.ts`); `tsc` y Vitest pasan (682). Falta verlo en la app (M13 a M16, T32).
- [x] T32 — Correr M12 a M16 y anotar los resultados. (CA-53 a CA-60)

  Hecho (2026-11-08) en el emulador `Pixel_8_Pro`, con el backend local (`http://10.0.2.2:3000`), Metro desde `C:\dev\sbc` en `b341046` y la ubicación simulada junto a Cerros de Ensenada. Sin red = modo avión; la app se abrió por `adb reverse` para que Metro siguiera disponible. Dos cuentas desechables (A y B), creadas por la API; B subió una actividad de 3 km y publicó "Ruta de prueba T32". A guardó en favoritas esa ruta y "Bosque de los Attenuatas" por la API, sin abrirlas, porque en la app solo se marca favorita desde el detalle. Lo guardado se revisó copiando la base SQLite del teléfono. Al terminar, A se borró desde "Borrar cuenta" y B por la API: las dos dejan de iniciar sesión y en el teléfono no quedó nada de A.
  - **M12, pasa:** (1) A, sin haber buscado, en modo avión: "Explorar rutas necesita conexión", con "Reintentar" y sin quedarse cargando. (2) Con red se ven las rutas. (3) Tras cerrar la app y abrirla en modo avión: las mismas rutas en el mapa, con "Datos guardados" y la fecha. Con el filtro "Ciclismo" dice que la búsqueda guardada no tenía rutas de ese tipo; con "Senderismo" las muestra.
  - **M13, pasa:** (1) Con red se abrió "Cañón de Doña Petra" y la lista de favoritas; en la base quedaron la búsqueda, la lista y el detalle de las tres rutas, incluidas las dos favoritas nunca abiertas. (2) En modo avión, la lista de favoritas, "Bosque de los Attenuatas" (favorita nunca abierta) y Doña Petra se ven con datos, perfil, recorrido y el aviso. El fondo del mapa se vio porque la zona estaba en la caché del mapa. (3) "El Salto", desde la búsqueda guardada y sin detalle guardado: "Ver el detalle de una ruta necesita conexión", en menos de 5 s.
  - **M14, pasa en parte:** (1) "Quitar de favoritas" en una ruta guardada: "Esto necesita conexión a internet" y la favorita no cambió. (2) "Mis rutas" pide conexión. Publicar no se probó: la cuenta A no tenía actividades; ese flujo no cambió en esta fase (spec 007).
  - **M15, pasa:** B archivó su ruta por la API. Con red, favoritas se actualizó sin el aviso y la muestra como "Ya no disponible"; al abrirla dice "Ruta no disponible" y su detalle guardado se borró del teléfono. Explorar se actualizó sin el aviso y la búsqueda guardada ya no la incluye.
  - **M16, pasa:** con B, en modo avión, Explorar y favoritas dicen que necesitan internet; no se ve nada de A. Lo de A siguió en el teléfono para A (RN-14).
  - **Fallo menor encontrado y corregido:** el aviso decía "5:38 p.m.. Sin conexión", con punto doble, porque en es-MX la hora termina en "p.m.". Ahora es "Sin conexión no se pueden actualizar. Son del …", con prueba en `status.test.ts`; se vio corregido en la app.
  - **Para la prueba de campo:** el cliente de Prisma de `backend/` de la copia principal estaba generado antes de la migración de la 011 (`users.avatarUrl` no existe) y el login respondía `500` hasta correr `npx prisma generate`. Hay que regenerarlo después de cada `git pull` que traiga migraciones. Además, `EXPO_PUBLIC_BACKEND_IP` no debe terminar en `/` para el backend local: la doble barra da `404`.

## Fase 1E — Zonas descargadas

- [x] T33 — `lib/map/offlineZones.ts`: límites, conteo de mosaicos, tamaño aproximado y tope. (CA-31, RN-8)

  Hecho (2026-11-08). `marcoALimites` pasa el marco fijo del centro (centro, zoom y tamaño en dp) a límites en Web Mercator, con mosaicos de 512 px como la cámara de Mapbox; el selector va en 2D y hacia el norte. `areaKm2`, `tamanoAproximadoMb` (D15), `contarMosaicos` (XYZ, zoom 10 a 13) y `revisarZona`, que rechaza más de 900 km² o tener ya 10 zonas (D13); una zona incompleta cuenta hasta que se borra. `boundsParaMapbox` da el orden de `createPack`, y `ZONE_MESSAGES` y `formatoTamano` los textos de T35. Pruebas en `offlineZones.test.ts` (14).
- [x] T34 — `lib/map/offlinePacks.ts` y `useOfflineZones`: crear, avance, reintentar, listar y borrar. Comprobar primero que una zona borrada deja de verse sin red y si `disk-quota` libera el espacio (plan, R1). (CA-32, CA-33)

  Hecho (2026-11-08).
  - **Código:** `offlinePacks.ts` envuelve `offlineManager`. Cada zona son dos paquetes, `<zona>:light` y `<zona>:dark`, con el relieve, y la metadata guarda los límites para recrear un paquete que falte. El avance y los errores quedan en un estado del módulo, así que la descarga sigue aunque se cierre la pantalla. `agruparZonas` en `offlineZones.ts` arma las zonas: lista, descargando o incompleta, con el tamaño del paquete mayor. `useOfflineZones` las lista con TanStack Query y expone descargar, reintentar y borrar. `TERRAIN_URL` y los estilos pasan a `style.ts`. Pruebas en `offlineZones.test.ts` (22).
  - **Comprobación R1**, en el emulador, con una pantalla temporal en `C:\dev\sbc` (ya quitada) y una zona de 5.5 × 5.5 km en Bahía de los Ángeles, nunca vista:
    - Sin descargar y sin red solo se ven manchas de zoom bajo.
    - La descarga tardó menos de 10 s. Quedó lista con 25 MB y `tile_store` pasó de 1 MB a 36 MB. Sin red se ve completa, con el relieve.
    - **Al borrarla** sale de la lista, pero `tile_store` sigue en 36 MB y, tras cerrar y abrir la app en modo avión, **la zona se sigue viendo**.
    - **`disk-quota` en 1 byte** (`TileStore.setOption`), antes y después de reiniciar y con red para forzar escrituras, **no libera nada**: 36 MB y la zona visible.
    - Lo descargado en T2 (51 MB) ya no estaba al empezar: `tile_store` medía 1 MB. Mapbox sí lo libera con el tiempo, sin plazo conocido.
    - **Conclusión:** la última frase de CA-33 no se podía cumplir con Mapbox. El usuario aprobó cambiarla: la zona borrada sale de la lista y deja de contar para el tope, y puede seguir viéndose sin red hasta que se libere el espacio. M18 paso 3 cambia en consecuencia. La app no toca `disk-quota`.
- [x] T35 — `pickZonePage`: marco, tamaño, confirmar o cancelar, rechazo por tope o por tener ya 10 zonas, y sin red. (CA-31, CA-34)

  Hecho (2026-11-08). `pages/map/pickZonePage.tsx`, registrada como `PickZone`; el acceso se agrega en T36. Mapa en 2D, sin giro ni inclinación, que empieza con todo Baja California y no usa la ubicación. El marco fijo ocupa el 80 % del lado más corto. `estadoDelSelector` y `resumenDeZona` en `offlineZones.ts` deciden el panel: sin red, demasiado grande, ya hay 10 o tamaño y área. Confirmar abre un diálogo con el tamaño y el aviso de datos. Al empezar la descarga, regresa. Pruebas en `offlineZones.test.ts` (27).
  - **Emulador**, abriendo la pantalla directo en `C:\dev\sbc` (cambio temporal ya quitado):
    - Al abrir, con todo el estado en el marco: "Zona demasiado grande" y el botón desactivado.
    - Acercando unos 5 niveles: "Unos 62 MB · 272 km²" y el botón activo.
    - El diálogo muestra el tamaño. Cancelar no descarga nada: `tile_store` sigue en 36.9 MB. Descargar sube `tile_store` a 72 MB.
    - En modo avión: "Sin conexión", el botón desactivado y el diálogo no se abre (CA-34).
    - Se quitó del mensaje de zona grande la frase que repetía el título.
    - El rechazo por 10 zonas solo se probó con Vitest.
- [x] T36 — `offlineZonesPage` y acceso desde `mainPage`. (CA-32, CA-33)

  Hecho (2026-11-08). `pages/map/offlineZonesPage.tsx`, registrada como `OfflineZones`, y tarjeta "Mapas sin conexión" en una sección "Mapas" de Inicio. Lista de la más nueva a la más vieja. Cada zona muestra "Zona del <fecha>" y, según su estado, "Unos N MB · área", "Descargando N %" con barra, o "Descarga incompleta" con "Reintentar". Borrar pide confirmación con el texto de CA-33. Reintentar sin red avisa y no hace nada. `describirZona` y `ZONES_LIST_MESSAGES` en `offlineZones.ts`, con sus pruebas.
  - **Emulador**, abriendo la app en Inicio sin iniciar sesión (cambio temporal en `C:\dev\sbc`, ya quitado):
    - La tarjeta de Inicio abre la lista. "Descargar una zona" abre `PickZone` y, al confirmar, regresa a la lista.
    - Con la red del emulador en EDGE, una zona nueva (Miraflores) mostró 36, 42, 47 y 94 % y luego "Unos 65 MB · 292 km²". `tile_store` subió 48 MB.
    - Modo avión a mitad de la descarga y app reiniciada: "Descarga incompleta (88 %)" con "Reintentar". Reintentar sin red avisa; con red, la zona queda lista.
    - Borrar: confirmación y la zona sale de la lista.
    - Sin reiniciar la app, cortar la red no dio ningún evento de error en unos 20 s: la zona sigue como descargando hasta reiniciar o volver la red. Se revisa en M17 (T37).
  - **Tres correcciones en `offlinePacks.ts` y `offlineZones.ts`:**
    - Mientras se descarga, `status()` falla ("could not find groupID") y el paquete se descartaba, así que la zona no aparecía. Ahora cuenta como sin terminar.
    - El primer aviso de Mapbox llega con 0 de 0 recursos y rnmapbox lo marca como completo y deja de escuchar: la zona salía lista sin haberse descargado. Ahora solo es completo con recursos, y se vuelve a escuchar el paquete.
    - Tras reanudar, Mapbox solo cuenta lo bajado en la última sesión: una zona que ocupó 69 MB decía 9 MB. Ahora el tamaño nunca baja de la estimación de D15 y se muestra como "Unos N MB".
  - Quedan 5 zonas de prueba en el emulador, encimadas cerca de Santo Tomás y el centro del estado.
- [x] T37 — Comprobar `RecordingMap` con una zona descargada y sin ella. Correr M17 a M19 y anotar los resultados. (CA-20, CA-21, CA-31 a CA-34)

  Hecho (2026-11-08), en el emulador, con la app completa (sin cambios temporales), el backend local y una cuenta de prueba nueva. No hubo que cambiar código.
  - **M17, pasa:**
    - (1) En modo avión, el selector dice "Sin conexión" y el botón no hace nada.
    - (2) Al abrir, con todo el estado en el marco: "Zona demasiado grande", con la explicación.
    - (3) San Felipe, "Unos 63 MB · 275 km²": el diálogo muestra el tamaño y, al cancelar, `tile_store` no cambia.
    - (4) La velocidad EDGE del emulador ya no frenaba la descarga: 64 MB en unos 15 s. Aun así se vio el avance en La Rumorosa (41 % y 94 %) antes de quedar lista. Modo avión 3 s después de confirmar, en Cerro Prieto: sin reiniciar, la zona pasó a "Descarga incompleta (80 %)". Esta vez Mapbox sí avisó el error ("2 of 10 resources failed to load"), a diferencia de T36.
    - (5) Con red, "Reintentar" la dejó lista al momento. `tile_store` no creció: solo faltaban recursos pequeños.
  - **M18, pasa:**
    - (1) Cada zona dice cuánto ocupa.
    - (2) Borrar pide confirmación y la zona sale de la lista.
    - (3) Con 10 zonas el selector dice "Ya tienes 10 zonas" y no deja descargar; así queda probado en la app el rechazo que en T35 solo se probó con Vitest. Al borrar una (9), Valle de la Trinidad, "Unos 62 MB · 273 km²", sí se descargó.
  - **M19, pasa en el emulador.** Zona de Valle de la Trinidad, sin ver antes a ese zoom; GPS simulado y modo avión:
    - **Claro:** en 3D se ven el relieve, el sombreado y las curvas de nivel; en 2D, el terreno y las curvas.
    - **Oscuro:** en 3D se ve el relieve. En 2D el fondo es gris liso, porque `dark-v11` no dibuja sombreado ni curvas y en ese punto no hay caminos. Los dos paquetes de la zona tienen los mismos mosaicos de calles, terreno y relieve (`metadata.db` de `tile_store`). En ningún caso hubo fondo azul.
    - **Fuera de la zona** solo se ven manchas de zoom bajo, y la grabación siguió igual (7 puntos, 72 m, la línea dibujada). Quedó "Pendiente de subir", como en la spec 010.
    - El aviso "Mapa sin conexión" sale con o sin zona. En desarrollo, LogBox muestra "Map load failed: Online connectivity is disabled" por los mosaicos fuera de la zona o de más zoom; no afecta.
    - CA-20 y CA-21 siguen pendientes del teléfono real (T54).
  - **Para revisar:** todas las zonas se llaman "Zona del 8 nov 2026", así que en la lista no se distinguen las de un mismo día más que por tamaño y área.
  - Quedan 10 zonas de prueba en el emulador y la cuenta de prueba en la base local.

## Fase 1F — Opción de prueba

- [x] T38 — "Sin mapa" en `MapViewToggle`, solo con `EXPO_PUBLIC_BATTERY_TEST=1`. Comprobar que sin la variable no aparece. (CA-8, RN-7)

  Hecho (2026-11-08).
  - **Código:** `lib/map/viewMode.ts` lee la variable (solo `"1"` la activa) y decide la vista siguiente: 3D → 2D → 3D, o 3D → 2D → Sin mapa → 3D en la prueba de batería. `MapViewToggle` muestra "Sin mapa" en dos renglones, con `accessibilityLabel` "Quitar el mapa". Con "Sin mapa", `RecordingMap` desmonta `Mapbox.MapView` y deja el fondo, los avisos, el botón de vista y "Detener". Al volver, la cámara empieza en la posición, en 3D: sin eso, el mapa nuevo mostraba todo el estado hasta el siguiente punto. Pruebas en `viewMode.test.ts` (5).
  - **Emulador**, grabando en Valle de la Trinidad:
    - Con `EXPO_PUBLIC_BATTERY_TEST=1`, el botón pasa por 2D, "Sin mapa" y 3D. Sin mapa se ve el fondo liso con "3D" y "Detener", y la grabación sigue.
    - Sin la variable, después de 2D el botón vuelve a 3D: "Sin mapa" no aparece.

## Fase 2 — Bugs

- [x] T39 — `database is locked`: reproducirlo primero. Si se reproduce, aplicar `busy_timeout` (plan, R2). Correr M20. Si no se reproduce, se cierra por RN-3. (CA-13)

  Hecho (2026-11-09). **M20 pasa en el emulador: 20 de 20 intentos inician y no aparece `database is locked` ni en la pantalla ni en el registro.** Hicieron falta tres cambios, aprobados uno por uno (plan, R2). Las 10 actividades se recuperaron completas, con sus 8 000 puntos (secuencias 1 a 8 000). **Se reproduce**, en el emulador Pixel_8_Pro con 2 procesos `yes` de carga, la cuenta de Postman y 10 actividades de 8 000 puntos en el servidor que la app no tiene (se restaura una copia de la base local antes de cada intento):
  - **Sin cambios, 3 de 3 intentos fallan.** "Iniciar actividad" no inicia: la pantalla sigue en "Nueva actividad" y en desarrollo sale "Uncaught (in promise)… `NativeStatement.finalizeAsync`… database is locked". Lo que falla es el `INSERT` de `createActivity`; el `finalizeAsync` del `finally` de expo-sqlite es el que da el mensaje. Confirma R2: la recuperación (`insertDownloadedActivity`) escribe en la transacción exclusiva, que expo-sqlite abre en otra conexión, y la principal falla al momento.
  - **Con `busy_timeout = 5000` en las dos conexiones, 16 de 20 siguen fallando.** Los errores (al iniciar, al guardar puntos y lecturas del barómetro) llegan en ráfagas cada ~5 s: la espera se aplica, pero la transacción dura más, porque inserta los puntos uno por uno con un `await` por punto. Hace falta acortar la transacción: el usuario aprueba insertar por lotes (plan, R2).
  - **Con los puntos en lotes de 500, la actividad inicia en 29 de 29 intentos** (20 de M20 y 9 con medición). La transacción más larga baja a 1,7 s. En el intento 16 `uiautomator` no encontró "Detener", pero la captura muestra la grabación.
  - **Queda `database is locked` en el registro en 11 de 29 intentos**, ya no al iniciar, sino en escrituras sueltas mientras se graba y se recupera: una lectura del barómetro, un punto ("Error procesando la ubicación") o la bandeja de seguridad. La medición muestra que no esperan: en el intento 8 el error llega sin ninguna transacción de más de 70 ms en los 5 s anteriores. Es el caso en que SQLite no usa `busy_timeout`: la conexión principal lee y escribe a la vez desde varios hilos y, si la otra conexión confirma en medio, la escritura falla en el acto. El usuario aprueba reintentarlas (plan, R2).
  - **Con los reintentos (hasta 5, con pausas de 50 a 400 ms), 20 de 20 inician y no queda ningún `database is locked`.**
  - **Código:**
    - `lib/db/espera.ts`: `PRAGMA_ESPERA`, `transaccionExclusiva` (la espera en la conexión de cada transacción), `reintentarSiBloqueada` y `conReintentos` (envuelve `runAsync` de la conexión principal, que lleva todas las escrituras fuera de las transacciones).
    - `sqlite.ts`: la espera al abrir y `conReintentos`. `activities.ts`, `safety.ts` y `account.ts` usan `transaccionExclusiva`.
    - `insertDownloadedActivity` inserta por lotes de `PUNTOS_POR_LOTE` (500).
  - **Pruebas:** `espera.test.ts` (8; dos usan un hilo que tiene la base bloqueada y muestran el fallo sin la espera) y 2 nuevas en `activities.test.ts` (lotes y todo o nada). Las de lotes y espera fallan sin la corrección (CA-24).
  - **Datos de prueba:** script y copia de la base en el scratchpad de la sesión, no en el repositorio. M20 se corrió con el backend local en el puerto 3001, Metro en el 8082 y `adb reverse`.
  - Aparte: el error de `start()` en `activityTracker.hook.ts` no se atrapa. En producción, la actividad no inicia y no se ve ningún mensaje. Se corrige en T62 (spec 003, CA-16).
- [x] T40 — Filtro de `503`, mensaje en `mensajeDeFallo`, y reproducir qué rama mostró el mensaje de internet (plan, R3). Correr M21. (CA-14, D9)

  Hecho (2026-11-09).
  - **Error de Prisma, confirmado:** con `DATABASE_URL` en un puerto cerrado, Prisma 7 lanza `PrismaClientKnownRequestError` con `code: 'P1001'` y `meta.driverAdapterError.cause.kind: 'DatabaseNotReachable'`. Hasta ahora respondía `500`.
  - **Backend:** `src/prisma-disponibilidad.filter.ts`. `esBaseNoDisponible` revisa la forma del error, no su clase: los códigos de conexión de Prisma (`P1001`, `P1002`, `P1017`, `P2024`, también como `errorCode` de inicialización) y los tipos del adaptador (`DatabaseNotReachable`, `ConnectionClosed`, `SocketTimeout`, `TooManyConnections`). El filtro global responde `503` con "El servicio no está disponible. Inténtalo de nuevo en unos minutos." y deja los demás errores a Nest. Se registra en `configurarHttp`, que comparten `main.ts` y las e2e que lo usan (`app` y `auth` no lo usan y no lo necesitan).
  - **Frontend:** `mensajeDeFallo` muestra ese texto para cualquier `503`, también si llega sin el cuerpo del backend (por ejemplo, del túnel).
  - **Pruebas:** `prisma-disponibilidad.filter.spec.ts` (6: el error real de Prisma, otros códigos, errores que no son de conexión, y una app Nest con `configurarHttp` que responde `503`, `500` y `404`) y una nueva en `status.test.ts`. La del `503` falla sin el filtro (CA-24). Pasan las 433 del backend y la compilación; el lint no marca nada en estos archivos.
  - **M21 en el emulador** (Pixel_8_Pro, cuenta de Postman, actividad del 6 nov de 1.56 km, backend en el 3001 con `adb reverse`):
    - **Antes**, sin el filtro y con la base inalcanzable: "No se pudo publicar · No se pudo completar. Inténtalo de nuevo." No menciona internet.
    - **Después**: "No se pudo publicar · El servicio no está disponible. Inténtalo de nuevo en unos minutos." El formulario conserva lo escrito. **Pasa.**
  - **Qué rama mostró el mensaje de internet en la 010 (R3):** no fue la del `5xx`; en el código de entonces (`b929794`) `mensajeDeFallo` era igual. El único camino es `{ offline: true }` de `useRouteMutations`, cuando `hayConexion` dice que no hay red (`isInternetReachable: false`): la petición ni se envía. La causa más probable es la falla de DNS del emulador de ese mismo día (2026-11-06), que hacía que la app se creyera sin conexión; el `DatabaseNotReachable` del registro del backend sería otro intento. No se repitió (RN-3), así que no se cambió `hayConexion`.
  - **Incidente en la prueba:** en el primer intento el backend no se reinició sin base y la ruta "Prueba M21" se publicó de verdad en la cuenta de Postman. Se borró al momento con `DELETE /routes/:id` (`204`, luego `404`). La cuenta queda sin rutas.
- [x] T41 — `sinSaltos` en `recorrido.ts` y publicar con `sequence = ANY(...)`, con e2e en `route-publish.e2e-spec.ts`. Correr M22. (CA-15, CA-16, D8)

  Hecho (2026-11-09). `sinSaltos` en `backend/src/route/recorrido.ts` (D8): descarta cada punto a más de 50 m/s del último conservado (misma regla que `isJump` de la app); si quedara menos de la mitad o menos de 2 puntos, usa el tramo sin saltos más largo, y si tampoco alcanza, conserva todos. `RouteService.publish` la aplica después de `sinPuntosViejos`, pasa el resultado a `perfilDe` (CA-16) y arma `ST_MakeLine` con `sequence = ANY(...)` (CA-15). `haversine` se exporta de `elevation-profile.ts`. Las rutas ya publicadas no cambian.
  - **Pruebas:** `recorrido.spec.ts` (7 nuevas), `route.service.spec.ts` (1 nueva, 3 ajustadas al arreglo de secuencias) y una e2e en `route-publish.e2e-spec.ts` con un punto ~100 km fuera de la línea: ningún vértice del recorrido va hacia él y el eje del perfil mide 28 × 111 m. Se comprobó que la e2e falla sin `sinSaltos`. `npm test` (441) y la e2e de publicar (23) pasan.
  - **M22 pasa en el emulador Pixel_8_Pro** con la cuenta "Prueba zonas" y el backend local. Se grabó "Ciclismo" con `adb emu geo fix` hacia el norte desde `-115.91 32.04`, ~35 m cada 3 s, y un punto a ~4.7 km al este a la mitad. La actividad quedó con 2.04 km, 80 puntos y "Sincronizada"; en el servidor guarda el punto falso (secuencia 48, en `-115.86`). Se publicó como "M22 Salto". En la base, la ruta tiene 79 puntos, todos en `-115.91`, y el perfil 79, con el eje hasta 2 238 m: sin el salto habría sumado ~9.4 km de ida y vuelta. En el detalle, el mapa dibuja solo la línea recta hacia el norte, y el perfil va de 0 a 2.24 km. Los 200 m sobre la distancia de la actividad vienen del suavizado de la app (la distancia de la ruta se copia de la actividad, RN-1), no del salto. La elevación es 0 porque el emulador no simula altitud.
  - **Datos de prueba:** la actividad y la ruta "M22 Salto" quedaron en la cuenta "Prueba zonas".
- [x] T42 — `backend/src/activity/distancia.ts`, con los mismos casos que `frontend/lib/metrics/distance.test.ts`, y script `datos:recalcular-distancias`. (CA-17, RN-11, D7)

  Hecho (2026-11-09).
  - **`src/activity/distancia.ts`:** copia de `computeDistance` (con `isAccurate`, `isJump`, los umbrales y `haversineMeters`), sin imports de runtime. `distancia.spec.ts` repite los 16 casos de `distance.test.ts`, con las utilidades de `testing.ts` dentro del archivo para que no entren al build.
  - **`prisma/scripts/recalcular-distancias.ts`** (`npm run datos:recalcular-distancias`, con `-- --aplicar` para guardar): busca las actividades con algún punto de más de 30 s antes del inicio, quita esos puntos con `sinPuntosViejos` y recalcula. Lista solo las que cambian, más de 1 cm, con su ruta, la distancia nueva y la dificultad nueva (`dificultadDe` con la elevación de la ruta). Con `--aplicar` actualiza en una transacción solo `activities."distanceMeters"` y la distancia, la dificultad y `updatedAt` de la ruta. Usa SQL para no tocar el estado ni el `updatedAt` de la actividad. Una segunda corrida no encuentra diferencias.
  - **`recorrido.ts`** importa `./elevation-profile.ts` en lugar de `.js` para que Node pueda cargarlo desde el script. El build lo reescribe a `.js` (`rewriteRelativeImportExtensions`).
  - **Modo informe contra la base (sin aplicar):** 9 actividades con puntos viejos, 2 con distancia distinta, las dos de `postman@senda.bc` y sin ruta: `2cb9ddda…` (0.137 → 0.084 km) y `3dd385a8…` (1.078 → 0.083 km). En las otras 7, el punto viejo ya era un salto y no sumaba. Se aplica en T44.
  - `tsc`, `nest build`, lint y `npm test` (457) pasan.
- [x] T43 — `lib/metrics/oldPoints.ts` y `recalcularDistanciasViejas`, una sola vez, sin cambiar el estado. (CA-17, RN-11)

  Hecho (2026-11-09).
  - **`lib/metrics/oldPoints.ts`:** `withoutOldPoints`, copia de `sinPuntosViejos`, y `hasOldPoints`. `oldPoints.test.ts` repite los 6 casos de `recorrido.spec.ts` y agrega 1 de `hasOldPoints`.
  - **`lib/db/activityMetrics.ts`:** `recalcularDistanciasViejas()` recorre las actividades terminadas con distancia, de cualquier cuenta y en cualquier estado. A las que empiezan con puntos viejos les recalcula `computeDistance` sin esos puntos y guarda solo `distance_meters` (`saveDistance` en `activities.ts`). Una `SYNCED` sigue `SYNCED`, y una `PENDING_SYNC` sube con la distancia nueva.
  - **Una vez por teléfono:** se marca en `app_settings` con `user_id = ''`, porque el paso es del teléfono y no de una cuenta. Si alguna actividad falla, no se marca y todo se repite en la siguiente apertura; recalcular dos veces da lo mismo.
  - **`App.tsx`:** se llama al abrir, después de `computeMissingMetrics` y antes de mostrar la navegación.
  - **Pruebas:** `activityMetrics.test.ts` (6) usa una ubicación guardada de 25 min antes, a 300 m, que la distancia de la spec 004 suma porque no es salto. Cubre que la distancia queda igual a la del recorrido sin ese punto, sin cambiar estado ni demás métricas; que no toca actividades sin puntos viejos; que corre una sola vez; que es idempotente; que con un error no se marca, y que no se cruza con los ajustes de una cuenta. `tsc` y Vitest pasan (749). Se ve en el teléfono con M23 (T44).
- [x] T44 — Correr el script en modo informe, revisar la lista con el usuario y aplicar. Correr M23. (CA-17)

  Hecho (2026-11-09). **M23 pasa en el emulador Pixel_8_Pro** con el backend local y la base de Supabase.
  - **Lista revisada con el usuario:** 9 actividades con puntos viejos y 2 con distancia distinta, las dos de `postman@senda.bc` y sin ruta publicada. El usuario aprobó aplicar.
  - **Paso 1:** se entró con la cuenta de Postman en la app de antes (`C:\dev\sbc`, sin T43) para que descargara las dos. Teléfono y servidor tenían lo mismo, "Sincronizada" en los dos:
    - `2cb9ddda…` (26 oct, 12:40 p.m.): 137 m, 5 puntos.
    - `3dd385a8…` (30 oct, 2:41 p.m.): 1.08 km, 6 puntos.
  - **Paso 2:** `npm run datos:recalcular-distancias -- --aplicar` guardó 83.963 m y 82.635 m. Las dos siguen `SYNCED` y su `updatedAt` no cambió. Luego se abrió la app desde `C:\dev\SendaBC\frontend`, con T43. El teléfono quedó con las mismas cifras, hasta el decimal 12, y en "Mis actividades" se ven "84 m" y "83 m", las dos "Sincronizada". Quedó la marca `distancias_recalculadas` en `app_settings`.
  - **Paso 3:** al reiniciar la app no cambió nada, y el script en modo informe dio "9 actividades con puntos viejos, 0 con distancia distinta".
  - **Comparación completa:** las 115 actividades `SYNCED` del teléfono que existen en el servidor tienen la misma distancia en los dos lados.
  - **Ruta publicada (prueba aparte):** ninguna actividad afectada tenía ruta, así que se armó una. Con una cuenta de prueba nueva, en el backend local, se subió por `POST /activities/sync` una caminata de 7.5 km en el océano, como las e2e. Empezaba con una ubicación guardada 25 min antes y 1.5 km al sur, y la distancia era la que daría la app: 8 950 m. Se publicó como ruta: 8 950 m y Moderada. El perfil ya excluía el punto viejo (7 500 m).
    - El informe mostró "8.950 km → 7.450 km, dificultad MODERATE → EASY". Era la única actividad con cambios; el informe contó 10 actividades con puntos viejos.
    - Con `--aplicar`, la actividad y la ruta quedaron en 7 450 m y la ruta en Fácil. `GET /routes/:id` devuelve lo mismo. La actividad siguió `SYNCED` con su `updatedAt`, y la ruta siguió `PUBLISHED`, con `updatedAt` nuevo y el mismo recorrido. Una segunda corrida dio 0 cambios.
    - Al final se borraron la ruta y la cuenta de prueba, y con ella su actividad.
- [x] T45 — Correr M24 en un teléfono real. Corregir si se reproduce; si no, cerrar por RN-3. (CA-18)

  Hecho (2026-11-09). **M24 no reproduce el fallo en el Nothing Phone 2** (A065, Android 16): 20 de 20 intentos seleccionan la ruta tocada. Se cierra por RN-3, sin cambiar código.
  - **Preparación:** el teléfono tenía una build del 6 nov sin depuración. Se le instaló encima, con la misma firma y conservando sus datos, un APK de desarrollo arm64 compilado desde `C:\dev\sbc` (la parte nativa no cambió desde ese commit). Por USB se usó `adb reverse` para el 8081 y el 3000: Metro desde `C:\dev\SendaBC\frontend` con `EXPO_PUBLIC_BACKEND_IP=http://localhost:3000` y el backend local. Se usó la cuenta del usuario, con su ubicación real cerca de El Sauzal.
  - **Explorar, 25 km, "Todas":** 3 marcadores visibles. El Salto en (353, 866), Cañón de Doña Petra en (686, 1165), encimado con otro marcador, y Bosque de los Attenuatas en (860, 1159). Seleccionar no mueve la cámara, así que los marcadores no cambian de lugar entre intentos.
  - **Intentos:** cada uno toca el marcador de una ruta, espera, toca el de otra y lee el nombre de la tarjeta a los 2.5 s.
    - Las esperas fueron 0.1, 0.3, 0.5, 0.8, 1, 1.5, 2, 3, 4, 0.2, 0.4, 0.6, 1.2, 2.5, 0.1, 0.7, 1.8, 3.5, 0.3 y 1 s.
    - Se cubrieron los 6 cambios posibles entre las tres rutas.
    - Los 20 dieron la ruta tocada. En la captura final, el anillo de selección y la tarjeta coinciden (Bosque de los Attenuatas).
  - **Límite:** los toques fueron de `adb shell input tap`, no de un dedo. Si el fallo vuelve a verse a mano, se reabre con la nueva evidencia.
- [x] T62 — Avisar cuando falla el inicio de una actividad y permitir reintentar, sin dejar nada grabando ni una actividad en `RECORDING`. Correr M36. (spec 003, CA-16; CA-13)

  Hecho (2026-11-09). **M36 pasa en el emulador Pixel_8_Pro** con la cuenta de Postman y contactos activos (modo en segundo plano). El fallo se forzó con un `throw` temporal, solo en el primer intento, justo después de `createActivity`, el caso que más limpieza necesita. Al terminar el caso se quitó el `throw`.
  - **Primer intento:** la pantalla sigue en "Nueva actividad" con el aviso de error "No se pudo iniciar la actividad · Intenta de nuevo.", y "Iniciar actividad" sigue abajo. En el registro sale `Error iniciando la actividad: FALLA_INICIO_TEMPORAL`, sin "Uncaught (in promise)". La actividad creada (87) queda cerrada con `endedAt = startedAt` y se sube, como en CA-10. No queda ninguna en `RECORDING`.
  - **Reintento:** inicia y graba ("Grabando · Senderismo", 1 punto). Al detenerla (88), la base no tiene ninguna actividad en `RECORDING`.
  - **Código:**
    - `lib/activity/inicio.ts`: `iniciarOLimpiar` (si falla, limpia y devuelve el error original) y `cierrePendiente` (hora de cierre como en CA-10, compartida con la salida de la pantalla).
    - `activityTracker.hook.ts`: `start()` ya no deja escapar el error. Limpia lo que alcanzó a arrancar (GPS o tarea, barómetro, escucha de puntos), cierra la actividad si ya existía y expone `startFailed`.
    - `activityPage.tsx`: muestra el aviso.
  - **Pruebas:** `lib/activity/inicio.test.ts` (7).
  - **Datos de prueba:** las actividades 87 y 88, vacías, quedaron subidas en la cuenta de Postman.

## Fase 3 — Pruebas

- [x] T46 — `fileParallelism: false` en `vitest.config.e2e.ts`, y correr la suite 5 veces seguidas. (CA-22, D10)

  Hecho (2026-11-10). `fileParallelism: false` en `backend/vitest.config.e2e.ts`, con comentario. `npm run test:e2e` corrió 5 veces seguidas contra la base de Supabase y pasó las 5: 7 archivos y 88 pruebas cada vez, en 56, 44, 44, 44 y 45 s.
- [x] T47 — Revisar la lista de CA-23 del plan. Escribir las pruebas que falten y anotar por qué no aplican las demás. (CA-23)

  Hecho (2026-11-10). Se revisaron todos los `.ts` de `frontend/lib` y `backend/src` sin prueba propia: 21 y 32 archivos, además de la lista del plan.
  - **Pruebas nuevas, frontend (+17):**
    - `lib/safety/areYouOk.test.ts` (10), con Expo, la base y la tarea de ubicación simulados. Cubre `umbralesDeActividad` y lo que hace cada evento del detector: programar con los umbrales de la sesión, sin hora, preguntar, alertar e ignorar los ajenos. También que un error al crear la alerta queda en el log, y `responderEstoyBien` con y sin actividad y desde la notificación.
    - `lib/safety/notifications.test.ts` (4): `esRespuestaEstoyBien` y el contenido de la pregunta (umbrales en el texto, `sticky`, canal y categoría con "Estoy bien" una sola vez).
    - `lib/map/offlineZones.test.ts` (+3): la regla de T36 que estaba dentro de `offlinePacks.ts` ("completo" con 0 recursos sigue descargando y se vuelve a escuchar) pasó a `avanceDePaquete` en `offlineZones.ts`, que es lógica pura. `offlinePacks.ts` la usa sin cambiar su comportamiento.
    - `lib/db/activityMetrics.ts` ya tenía prueba desde T43.
  - **Pruebas nuevas, backend (+11):**
    - `auth/auth.controller.spec.ts` (2): `LocalAuthGuard` y el token del id validado.
    - `user/user.controller.spec.ts` (3): `JwtAuthGuard` en todo menos el registro, y cada endpoint de `/user/me` con el id del token (constitución 3.3).
    - `user/normalizar-email.spec.ts` (2).
    - `safety/safety.types.spec.ts` (4): `MOTIVO_API`, `aSafetyAlert` y `aSafetySession`.
  - **No aplican, con su motivo:**
    - **Constantes y textos:** `lib/api/queryClient.ts`, `lib/map/camera.ts`, `lib/map/messages.ts`, `lib/metrics/constants.ts`, `lib/routes/constants.ts`, `lib/theme/*` y `backend/src/telegram/telegram.sender.ts` (interfaz y un texto).
    - **Envolturas nativas sin decisiones propias:**
      - `lib/map/mapbox.ts` (token).
      - `lib/map/offlinePacks.ts` (`offlineManager`; su regla ya se probó en `avanceDePaquete`).
      - `lib/sensors/barometer.ts` (`expo-sensors`; se ve con 004 M3 y M5).
      - `lib/auth/tokenStorage.ts` (`expo-secure-store`).
      - `lib/db/sqlite.ts` (abre la base; el reintento está en `espera.ts`, con prueba).
      - `lib/safety/locationTask.ts` (`TaskManager`; `aUbicacion` solo copia campos y el procesador tiene `recording.test.ts`).
    - **Ensamblado de piezas que ya tienen prueba:** `lib/safety/index.ts` (`safetySync` y `sessionActions`) y `lib/sync/index.ts` (`syncEngine`; `isOnline` usa `hayConexion`, con prueba).
    - **Utilidades de prueba:** `lib/db/testing.ts` y `lib/metrics/testing.ts`.
    - **Backend, módulos y arranque:** `*.module.ts`, `main.ts`, `app.module.ts`, `app.service.ts`, `prisma.service.ts`, `prisma/db.ts` y `auth/types/*.d.ts`. `configurar-http.ts` lo usan todas las e2e.
    - **Backend, cubiertos en otros archivos:**
      - `auth/strategies/local.strategies.ts` (`auth.e2e-spec.ts`).
      - `telegram/log.sender.ts` y `telegram.config.ts` (`telegram.module.spec.ts` y `safety.e2e-spec.ts`).
      - `telegram/webhook-secret.guard.ts` (`telegram.controller.spec.ts`).
      - `user/entities/user.entity.ts` (sin lógica).
    - **DTOs** (`activity-point`, `activity-upload`, `update-emergency-contact`, `finish-session`, `session-location`, `upsert-session`, `delete-account`, `update-email` y `update-password`): son reglas declarativas de `class-validator`, y las e2e los recorren por el `ValidationPipe`. Varios casos 400 de `/user/me` ya están en `user.e2e-spec.ts`. No se prueba cada regla por separado.
  - Vitest pasa en el frontend (766) y en el backend (468); `tsc` y lint, sin errores.
- [x] T48 — Revisar que cada bug corregido en la fase 2 tenga una prueba que falle sin la corrección. (CA-24)

  Hecho (2026-11-10). Cada arreglo de la fase 2 se quitó un momento, se corrió su prueba y se restauró el archivo (mutación con `sed` y copia de respaldo). T44 y T45 no cambiaron código.

  | Arreglo | Sin el arreglo | Falla |
  |---|---|---|
  | T39, reintento de `database is locked` (`espera.ts`) | no reintentar | 3 de 8 en `espera.test.ts` |
  | T39, `busy_timeout` en la conexión de la transacción | sin el `PRAGMA` | 1 de 8 en `espera.test.ts` |
  | T39, puntos por lotes (`insertDownloadedActivity`) | el código de antes, un `executeAsync` por punto | 1 de 13 en `activities.test.ts` |
  | T40, `503` en `mensajeDeFallo` | sin la rama del `503` | 1 de 31 en `status.test.ts` |
  | T40, filtro del `503` | sin registrarlo en `configurarHttp` | 1 de 6 en `prisma-disponibilidad.filter.spec.ts` |
  | T41, `sinSaltos` al publicar | sin `sinSaltos` | 1 de 71 en `route.service.spec.ts` (la e2e ya se había comprobado en T41) |
  | T41, `sequence = ANY(...)` | `sequence >=` como antes, con `sinSaltos` | 1 de 23 en `route-publish.e2e-spec.ts` |
  | T43, distancia sin puntos viejos | sin `withoutOldPoints` | 4 de 6 en `activityMetrics.test.ts` |
  | T62, limpiar un inicio fallido (`inicio.ts`) | sin `limpiar()` | 3 de 7 en `inicio.test.ts` |
  | T63, fin nunca antes del inicio y reparación (F1) | sin comparar con el inicio, `MIN` en lugar de `MAX`, sin reparar | 1 de 8 en `inicio.test.ts` y 3 de 16 en `activities.test.ts` |
  | T64, cobertura del barómetro (F3) | la regla de al menos 2 lecturas | 1 de 17 en `summary.test.ts` |

  - **Prueba reforzada:** la de lotes calcula lo que espera con `PUNTOS_POR_LOTE`, así que con lotes de 1 punto seguía pasando, aunque la transacción volviera a ser larga. Se agregó `expect(PUNTOS_POR_LOTE).toBeGreaterThanOrEqual(100)`; con lotes de 1 ahora falla.
  - **Sin prueba automática, con su motivo:**
    - `busy_timeout` y `conReintentos` en la conexión principal (`sqlite.ts`): solo los aplica al abrir expo-sqlite, que no corre en Vitest. Las dos funciones tienen prueba, y que estén conectadas se vio en M20.
    - El script `datos:recalcular-distancias`: necesita la base. Su cálculo es `sinPuntosViejos` más `computeDistance` (`distancia.ts`), los dos con prueba. Se comprobó en M23 y con la ruta de prueba de T44.
    - Lo que hace `activityTracker.hook.ts` con el resultado de `iniciarOLimpiar` (pantalla de React Native): M36.
  - Vitest pasa en el frontend (766) y en el backend (468).

## Fase 4 — Prueba de campo

- [x] T49 — Compilar el build de campo con la URL del túnel y `EXPO_PUBLIC_BATTERY_TEST=1`, e instalarlo en los dos teléfonos. Descargar la zona del recorrido en cada uno. (CA-8, CA-20, RN-7, RN-12)

  **Build instalado (2026-11-10). El usuario descargó la zona del recorrido en los dos teléfonos.**
  - `C:\dev\sbc` se movió al commit `2d4e18c`; no hubo cambios nativos desde el anterior.
  - Se compiló con `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`, con `EXPO_PUBLIC_BACKEND_IP` igual a la URL del túnel **sin `/` final** y `EXPO_PUBLIC_BATTERY_TEST=1`. Queda en `C:\dev\sbc\frontend\android\app\build\outputs\apk\release\app-release.apk`, de 67 MB.
  - El paquete tiene la URL del túnel, ningún `localhost` ni `10.0.2.2`, y el código de T41 a T48.
  - Se firma con la misma clave que la versión de desarrollo, así que se instaló encima con `adb install -r` en el S9+ y el Nothing Phone 2, y conservó sesión y actividades.
  - Con `adb reverse` quitado, los dos abren sin la computadora y cargan Rutas por el túnel.
- [x] T50 — Ensayo cerca de casa, con datos móviles: 10 minutos grabando en cada teléfono y una alerta de prueba. (R6)

  Hecho por el usuario el 2026-11-10, en los dos teléfonos. En el servidor queda la alerta de inactividad de la prueba, cancelada, en la sesión del Nothing de las 21:35.
- [ ] T51 — Correr M25, M26, M28 y M29 en la salida, y M4 paso 2 con TalkBack en un teléfono. (CA-1 a CA-3, CA-5 a CA-7, CA-38)

  **M28 (2026-11-18):** el usuario publicó la actividad del S9+ de la caminata. La ruta mide 4 461 m (la distancia de la actividad) y el eje del perfil llega a 4 996 m (+12 %). El perfil tiene 20 saltos de más de 30 m entre puntos seguidos: sale de la altitud del GPS de cada punto, así que hereda F5 aunque la actividad se midió con barómetro. No cumple; ver F5 y F6.

  **M4 (2026-11-20), en el Nothing con una actividad grabando y TalkBack 17.1 activado por `adb`, pasa:**
  - Paso 1: un toque corto en el escudo mostró "Pedir ayuda — Mantén presionado 2 segundos para avisar a tus contactos." y no creó alerta (revisado en el servidor). Fue un toque de `adb`, que no pasa por TalkBack.
  - Paso 2: el usuario enfocó a mano los dos botones con TalkBack, y los anuncios fueron los esperados: "Pedir ayuda" con la instrucción, y "Detener actividad".
  - La sesión no tuvo alertas. Al final se apagó TalkBack y quedó solo el servicio de accesibilidad que ya estaba. **CA-38 cumple.**

  **M25 revisado con los datos de la salida (2026-11-20):** además del reporte, se leyó la base del Nothing (copia por `run-as`).
  - **Nothing:** una sola actividad de 17:42:40 a 18:50:43 (1:08:02), "Sincronizada", con distancia, duración y elevación. Tiene 410 puntos, del inicio a 1 s antes del fin. Solo hay un hueco de más de 60 s (141 s, parado). La única otra actividad cercana es el inicio de prueba de 6 s de las 17:41. No hay cierres registrados de la app (`dumpsys dropbox`), y la app no está exenta de la optimización de batería (`deviceidle whitelist`), así que grabó con el ahorro normal.
  - **S9+:** según el reporte, 1:08:26, 394 puntos cada ~10 s, sincronizada y con su resumen. Los huecos son los mismos tramos parados. No estaba conectado para revisar su base ni su ajuste de batería.
  - **Pantalla bloqueada:** según los ajustes de batería de cada teléfono, ~9 min de pantalla en el Nothing y ~17 min en el S9+ durante una salida de 68 min. Los dos estuvieron bloqueados más de 30 minutos y siguieron llegando puntos.
  - **S9+, revisado por USB el mismo día:** la app no está exenta de la optimización de batería (`deviceidle whitelist`) y tiene el modo por defecto para correr en segundo plano (`appops`). El registro del sistema (`dumpsys dropbox`) cubre el 2026-11-18 y no tiene cierres ni ANR de la app. Su build de campo no es depurable, así que su base no se pudo leer.
  - **CA-1, CA-3 y CA-7 cumplen.**

  **M29 revisado:**
  - **004 M4 en el Nothing, pasa:** en T3 (1:13) y en la salida (1:08) grabó normal y el resumen dice "Elevación estimada con GPS".
  - **004 M3 y M5 en el S9+ (2026-11-20, por el usuario):** una sola actividad de senderismo de 5:51 (10:24 a 10:30): 5 min quieto al aire libre y luego **un piso** de la escalera de su casa, no tres. Sincronizada; en el servidor queda con 5 puntos y "barómetro" como fuente.
    - **M5, pasa:** distancia 0 m en el resumen, menos de 20 m. La suma punto a punto da 24 m, pero incluye caminar hasta la escalera.
    - **M3, parcial:** la elevación sale del barómetro y la subida es de 3.8 m, que corresponde a un piso (~3 m). M3 pide 3 pisos y entre 6 y 12 m; con un piso no se puede comparar con ese rango. **Decidido con el usuario (2026-11-20):** se acepta como M3. Con un piso, el barómetro midió una subida de la altura esperada, y la salida del 2026-11-18 ya midió 212 m con barómetro contra 199 m de Strava.
  - **CA-6 cumple.**
- [ ] T52 — Correr M30, la medición de batería. Si no cumple, ajustar el mapa y volver a medir. (CA-8)

  **Dato de la salida (2026-11-18), no sustituye a M30:** según los ajustes de batería de cada teléfono, el día de la caminata de ~1 h 08 min. **Nothing:** menos de 1 %, con 9 min de uso en pantalla y 1 h 15 min en segundo plano. **S9+:** 8.4 %, con 17 min en pantalla y 3 h 2 min en segundo plano; el segundo plano dura casi el triple que la caminata, así que incluye tiempo fuera de la grabación. La pantalla estuvo bloqueada casi todo el tiempo, así que mide sobre todo la grabación en segundo plano, no el mapa. CA-8 sigue pendiente: pide comparar el consumo por hora con "Sin mapa", 2D y 3D en pantalla.

  **M30 en el Nothing, con el teléfono quieto (2026-11-18):** en lugar del S9+. Build de diagnóstico de F5 (con `EXPO_PUBLIC_BATTERY_TEST=1`), zona descargada, pantalla encendida, brillo fijo y en el mismo lugar. El cable carga el teléfono, así que cada vuelta se midió desconectada: `Charge counter` de `dumpsys battery` justo antes de desconectar y al reconectar, ~30 min después.

  | Vuelta | Vista | Duración | Charge counter (µAh) | Nivel | Consumo | Frente a "Sin mapa" |
  |---|---|---|---|---|---|---|
  | 1 | 3D | 30:08 | 1 499 000 → 1 341 000 | 43 → 39 % | ~315 mAh/h | −13 % |
  | 2 | 2D | 30:02 | 1 383 000 → 1 213 000 | 40 → 35 % | ~340 mAh/h | −6 % |
  | 3 | Sin mapa | 30:14 | 1 225 000 → 1 043 000 | 35 → 30 % | ~361 mAh/h | — |

  - Cumple los límites: 3D no supera a "Sin mapa" (límite +30 %) ni a 2D (límite +15 %).
  - El consumo sube en el orden en que se corrieron las vueltas y no por vista. Con menos carga baja el voltaje y el mismo trabajo gasta más carga, así que la diferencia parece del orden, no del mapa. Quieto, el mapa no suma un consumo medible.
  - **Reservas:** sin movimiento, la cámara no sigue al marcador ni gira con el rumbo, que es lo que más dibuja el mapa; M30 pide "el mismo recorrido". Tampoco se corrió en el S9+. Para cerrar CA-8 falta repetirlo caminando, en otro orden ("Sin mapa" primero) y con la misma carga al empezar cada vuelta.
- [x] T53 — Correr M31 y M32 con el contacto real. (CA-9 a CA-11)

  Hecho (2026-11-19 y 2026-11-20) en el Nothing Phone 2 con la build de diagnóstico de F5 (URL del túnel), la cuenta del usuario y el contacto real "Diego Contacto" (en Telegram, "Blu CN"). Backend local con `TELEGRAM_MODE=polling`. Los casos se manejaron por `adb` y se comprobaron en la base del servidor.
  - **Túnel:** daba `502` en ~1 de cada 4 peticiones desde el teléfono. Para separarlo de la app, el backend pasó al puerto 3001 detrás de un proxy en el 3000 que registra cada petición. Ninguna petición fallida llegó al backend, y todas pasaron al reintentar. No es fallo de la app, salvo que no se recupera sola (F7).
  - **008 M1, pasa:**
    - Nombre vacío: "El nombre es obligatorio". 41 caracteres: "El nombre debe tener como máximo 40 caracteres". En los dos no se guarda.
    - Con un nombre válido: "Pendiente de aceptar" y la hoja de compartir del sistema con el texto de la invitación.
    - El contacto real aceptó la invitación y quedó "Activo", con su nombre de Telegram.
    - "Enviar mensaje de prueba": la app dice "Mensaje de prueba enviado". La bienvenida y esta prueba no se confirmaron una por una en Telegram, pero la misma cuenta recibió después la alerta, la ubicación y el "está bien" (ver M32).
    - Con 3 contactos desaparece "Agregar contacto" y sale "Puedes tener como máximo 3 contactos de emergencia."
    - Editar el nombre y quitar (con confirmación) se guardan.
    - Al cerrar y abrir la app se ven los mismos contactos.
  - **008 M2, pasa:** con el bot bloqueado, la prueba deja el contacto en "No recibe mensajes" (`UNREACHABLE` en el servidor), con la explicación y "Compartir invitación". Al compartirla de nuevo, desbloquear y aceptarla, vuelve a "Activo".
  - **008 M3, pasos 1 y 2, pasan:**
    - Paso 1, sin contactos activos (con el bot bloqueado): "Empezar" muestra el aviso, "Configurar contactos" e "Iniciar actividad". "Configurar contactos" abre Seguridad encima y atrás regresa a la grabación.
    - Paso 2, con el contacto activo: "Seguridad activa: … avisaríamos a Diego Contacto." y la hora de regreso opcional.
    - **Pasos 3 y 4:** el usuario decidió no quitar "Permitir todo el tiempo"; quedan cubiertos por las pruebas de T66 (`decidirSegundoPlano`).
  - **M32, pasa:** 5 min sin moverse y 1 min de cuenta regresiva, con el teléfono quieto y la app abierta. Se registraron la vibración de la app (`dumpsys vibrator_manager`), el cierre de la notificación y las alertas en la base.
    - 10 de 10 preguntas respondidas con "Estoy bien" entre 3 y 10 s después de aparecer (09:14 a 10:01). La sesión no tiene alertas.
    - El usuario confirma que sonó y vibró en las 10.
    - En la pregunta 5, Android marcó la vibración de la app como `ignored_for_higher_importance` porque coincidió con dos vibraciones cortas del sistema. Aun así, el usuario sintió vibración.
  - **Alerta real del 2026-11-19, por la prueba y no por la app:** en un primer intento de M32, una vigilancia por `adb` debía tocar "Estoy bien" detectando un cambio de foco de ventana. El aviso no cambia el foco, así que nadie respondió. A las 23:22 la app creó la alerta por inactividad y el contacto recibió la alerta y la ubicación. El usuario la canceló a las 23:29 y el contacto recibió "está bien". La app hizo lo esperado.
  - Al terminar se quitó el contacto de prueba pendiente; queda solo el contacto real.
- [ ] T54 — Correr M19 en la zona real, en modo avión. (CA-20, CA-21)

  **Avance (2026-11-18):** en la salida, en modo avión y dentro de la zona descargada, el mapa se vio con el terreno, no un fondo azul (CA-20, parte). No se revisaron el cambio entre 3D y 2D, el modo oscuro ni la grabación fuera de la zona (CA-21); quedan para otra salida.

  **Avance (2026-11-19), en un teléfono real, en modo avión y grabando dentro de la zona descargada:** el cambio entre 3D y 2D funciona, y el de claro a oscuro también, en las dos vistas. **CA-20 cumple.** Al mover la cámara fuera de la zona, en 3D las texturas se ven borrosas y en 2D se ve bien. Fuera de la zona solo hay lo que el mapa ya tenía guardado, así que no es un fondo azul ni un fallo de CA-20. Falta CA-21: grabar con la ubicación fuera de la zona, no solo mover la cámara.
- [x] T55 — Correr M27, el recorrido simulado a velocidad de bicicleta. (CA-4)

  Corrido el 2026-11-18 en el emulador `Pixel_8_Pro` (development build, Metro con el código de T67 y backend aparte en `TELEGRAM_MODE=log`), con una cuenta desechable. Un script manda una ubicación por `adb emu geo fix` según el tiempo real, a 20 km/h, sobre una carretera con curvas. El emulador no tenía el permiso en segundo plano, así que grabó en primer plano, con un punto cada ~2 s. Resultado: 5:33, 1.79 km, 19.4 km/h, 160 puntos; la distancia queda 1.8 % bajo la suma punto a punto. En 3D la cámara sigue al marcador con el rumbo y el trazo sale continuo; en 2D, igual. **El usuario lo da por aceptable (2026-11-18).** Queda escrito que no se probó en una bicicleta real. Un primer intento se descartó: quedaron dos scripts mandando ubicaciones a la vez y el trazo salió en pedazos; los saltos no sumaron distancia (la regla de 50 m/s funcionó), pero esa actividad no cuenta.
- [x] T56 — Hacer el reporte en este archivo, con la revisión de M33. Clasificar cada fallo por severidad y decidir con el usuario. (CA-12, CA-19, CA-29, RN-2)

  Hecho (2026-11-20): el reporte está en "Reporte de la prueba de campo". Lo decidido con el usuario: F5 (Mayor) pasa a la 012; F6 (Menor) y F7 (Mayor) se corrigen en T57; F8 (Menor) se acepta. F7 subió de Menor a Mayor: la función no sirve hasta reabrir la app. Falta el nombre del sendero, que lo agrega el usuario.
- [x] T57 — Corregir los fallos bloqueantes y los que el usuario pida, con su prueba si se puede. Repetir el caso que falló. (CA-19, CA-24)

  **Decidido el 2026-11-12, antes de repetir la salida:** se corrigen F1, F2 y F3 en T63 a T66; F4 se decide con los datos de la caminata (M26).
- [x] T63 — F1: cerrar sin "Detener" nunca deja el fin antes del inicio, en `closeOrphanActivities` y `cierrePendiente`. Al abrir la app, corregir las actividades pendientes que ya lo tengan, recalcular sus métricas y quitar su error de subida. (spec 003, CA-10; CA-24)

  Hecho (2026-11-12). `cierrePendiente` (`lib/activity/inicio.ts`) y `closeOrphanActivities` usan el inicio si el último punto es anterior. `repararFinAntesDelInicio` (`lib/db/activities.ts`) corre al abrir la app, entre cerrar huérfanas y `computeMissingMetrics`: pone el fin igual al inicio, borra las métricas para que se recalculen, conserva la fuente de elevación y quita el error. Sin el arreglo fallan 4 pruebas: 1 en `inicio.test.ts` y 3 en `activities.test.ts`. **En el Nothing (2026-11-12):** al abrir esta versión, la actividad del 2026-11-07 que seguía rechazada se corrigió y subió sola, con el fin igual al inicio, 1 punto y duración 0.
- [x] T64 — F3: usar GPS para la elevación cuando las lecturas del barómetro no cubren la actividad. (spec 004, CA-13, RN-7; CA-24)

  Hecho (2026-11-12). `barometerCovers` (`lib/metrics/summary.ts`) suma los tramos de más de 60 s sin lecturas, del inicio al fin, y exige menos del 10 % de la duración (`MAX_BARO_GAP_MS`, `MAX_BARO_UNCOVERED`). `computeActivityMetrics` recibe las lecturas con su hora. Con la regla anterior (al menos 2 lecturas) falla 1 de 17 en `summary.test.ts`. Las actividades ya sincronizadas con 0 m no se recalculan.
- [x] T65 — F3: módulo nativo `modules/barometro` que sigue leyendo con la pantalla apagada, con la hora del sensor; `lib/sensors/barometer.ts` lo usa en Android. Probar en el S9+ 10 min con la pantalla apagada. (spec 004, CA-12, CA-14; plan D16)

  Hecho (2026-11-12). El módulo tiene `disponible`, `iniciar`, `detener` y el evento `onLectura`, con la hora calculada desde `event.timestamp`. `barometer.ts` lo usa si existe y, si no, sigue con `expo-sensors` (3 pruebas en `barometer.test.ts`, con el módulo simulado). El autolinking lo encuentra en `modules/` sin `prebuild`. Se compiló la versión de campo en `C:\dev\sbc` y se instaló en el S9+, ya con "Permitir todo el tiempo". **Prueba:** senderismo de ~10 min con la pantalla bloqueada casi todo el tiempo y el teléfono quieto. El resumen dice "Elevación medida con barómetro", con 0 / 0 m. Como T64 solo usa el barómetro si las lecturas cubren el 90 % de la actividad, hubo lecturas con la pantalla apagada; los 0 m son el umbral de ruido de 3 m con el teléfono quieto. La base no se pudo leer directo: la versión de campo no es depurable (`run-as`).
- [x] T66 — F2: si falta el permiso en segundo plano y el sistema ya no deja pedirlo, avisar antes de iniciar y ofrecer abrir los ajustes. (spec 008, CA-10)

  Hecho (2026-11-12). La decisión pasa a `decidirSegundoPlano` (`lib/activity/segundoPlano.ts`, 4 pruebas). Con contactos activos y el permiso bloqueado, la pantalla muestra "Falta “Permitir todo el tiempo”" con "Grabar así" y "Abrir ajustes". "Abrir ajustes" o cerrar el aviso no crean la actividad: al volver se presiona "Iniciar" otra vez. No se vio en un teléfono: el Nothing ya tenía "Permitir todo el tiempo" al instalar esta versión, y el usuario decidió no quitarlo; queda verificado con las pruebas.

- [x] T67 — F4: la distancia solo promedia los puntos a 50 m o menos del punto nuevo, en el teléfono y en el servidor. (spec 004, plan D3; CA-4, CA-24)

  Hecho (2026-11-18). `SMOOTHING_RADIUS_M = 50` en `lib/metrics/constants.ts` y `backend/src/activity/distancia.ts`; el plan de la 004 se actualizó primero (D3, "Distancia", historial). Se eligió con los puntos reales de la salida: el carro del 2026-11-11 pasa de −8 a −16 % a entre −5.2 y −2.4 % de Strava, y la caminata del 2026-11-18 queda igual (+4.6 y +5.2 %). Prueba nueva en `distance.test.ts` y `distancia.spec.ts`: carretera con curvas a 25 m/s, un punto cada 10 s, error ≤ 5 %. Sin el radio, esa prueba falla en los dos lados. Las actividades ya guardadas conservan su distancia.

- [x] T68 — F6: el eje del perfil de una ruta termina en la distancia de la ruta. (spec 007, RN-8; CA-5, CA-24)

  Hecho (2026-11-20). Primero se actualizó la spec 007: RN-8 y su historial. `perfilDe` (`backend/src/route/elevation-profile.ts`) recibe la distancia de la ruta y escala la distancia acumulada para que el eje termine en ella; sin ella, o con 0, queda la suma punto a punto, que es lo que usa el seed. `route.service.ts` le pasa la distancia de la actividad.
  - **Pruebas:** dos nuevas en `elevation-profile.spec.ts`. La del zigzag con +12 %, como en M28, falla sin el cambio (12 432 contra 11 119.5 m).
  - **e2e:** "un salto imposible no se dibuja…" ahora espera que el eje termine en los 3 000 m de la ruta, con tramos parejos, en lugar de 28 × 111 m.
  - **Rutas ya publicadas:** conservan su perfil.
  - **M28 no se repitió:** el perfil sigue heredando F5, pasado a la 012.
- [x] T69 — F7: las consultas que fallaron se repiten al volver la red o la app al frente. (CA-24)

  Hecho (2026-11-20).
  - **Código:** `lib/api/reconexion.ts` tiene `crearQueryClient` y `conectarConsultas`. `crearQueryClient` usa `networkMode: 'always'` para que las consultas sigan corriendo sin red, como la copia local de los contactos, y vuelve a encender `refetchOnReconnect`, que TanStack apaga con ese modo. `conectarConsultas` conecta `onlineManager` con `expo-network` y `focusManager` con `AppState`. `lib/api/queryClient.ts` usa `crearQueryClient` y `App.tsx` llama a `conectarConsultas`.
  - **Pruebas:** tres en `reconexion.test.ts`, con TanStack real y las fuentes de red y app simuladas: la consulta con error se repite al volver la red, se repite al volver la app al frente, y sin red sigue corriendo. Sin conectar las fuentes fallan las dos primeras.
  - **No se vio en un teléfono:** la build instalada es la de campo, de antes del cambio. Queda verificado con las pruebas.

  **Después de T68 y T69:** Vitest pasa en el frontend (783) y en el backend (471), las e2e pasan (88), `tsc` del frontend pasa y `npm run lint` del backend termina sin errores, con las 3 advertencias de siempre.
**M33, revisado con el usuario (2026-11-18):** se conservan 30 m, 10 minutos y 2 minutos. En la caminata, la parada más larga dentro de 30 m fue de 3.4 min, no hubo "¿Estás bien?" sin motivo ni alertas, y el tiempo y la cuenta regresiva ya los puede cambiar cada usuario. La spec 008 no cambia.

## Fase 5 — Regresión y cierre

- [x] T58 — Correr M34, los casos pendientes de las specs 005, 007, 008 y 009. 009 M1 lo hace el usuario. (CA-26)

  Avance (2026-11-18), en el emulador con la misma preparación que T55:
  - **005 M3, pasa:** con 3 actividades grabadas en modo avión, al quitarlo se tocó "Empezar" → "Iniciar actividad" de inmediato. La grabación arrancó normal y a los 21 s las 3 ya estaban sincronizadas, con la nueva aún grabando.
  - **007 M1, pasa:** una pendiente no ofrece publicar y dice "Para publicarla como ruta, primero tiene que subirse a tu cuenta."; una sincronizada de 424 m dice "Una ruta debe medir al menos 1.5 km."; la de 1.79 km ofrece "Publicar como ruta".
  - **007 M6, pasa:** se publicó la de 1.79 km, se editó el nombre, se archivó (queda "Archivada" en "Mis rutas", desaparece del mapa y de la búsqueda cercana), se volvió a publicar (regresa al mapa) y se borró (sale de "Mis rutas" y el resumen vuelve a ofrecer "Publicar como ruta").
  - **008 M8 paso 4, pasa:** se inició con regreso a 1 h, se cambió a 3 h con conexión (el servidor guardó la nueva) y se adelantó la sesión 1 h 31 min en la base, de modo que la hora anterior ya habría vencido con su margen. En dos corridas de la tarea no hubo aviso. Como control, al vencer también la hora nueva el servidor sí mandó "no ha confirmado su regreso".
  - **008 M10, pasa:** con "Permitir todo el tiempo" en el emulador, 5 min con la pantalla bloqueada y el GPS en movimiento: 64 puntos, sin tramos de más de 5 s sin puntos. Al detener desaparece la notificación de grabación y el servicio sale de primer plano. Después de 11 min (más que los 10 de inactividad) no llegó pregunta ni alerta.
  - **007 M8, pasa (2026-11-20), con los dos teléfonos reales:**
    - En el S9+, con la cuenta de Postman, se guardó "El Salto" como favorita (`PUT /routes/:id/favorite` → `204`). La cuenta quedó con 2: El Salto (hoy) y Cañón de Doña Petra (2026-11-02).
    - En el Nothing, con la cuenta del usuario, que no tiene favoritas, "Mis favoritas" muestra "Nada por aquí todavía" y explica cómo guardarlas.
    - El usuario cerró sesión en el Nothing y entró con la cuenta de Postman. "Mis favoritas" muestra las mismas 2, con El Salto primero, igual que en el S9+.
  - **009 M1, pasa (2026-11-20, por el usuario, en un teléfono real):** en claro y en oscuro, la app coincide con Figma. Con letra grande (`font_scale` 1.3) y la app reabierta no se corta nada. Si se cambia la letra con la app abierta, se cortan textos hasta reabrirla (F8, límite conocido de la spec 003).
  - **M34 completo. CA-26 cumple.**
- [x] T59 — Agregar a la colección de Postman los endpoints nuevos y correrla en Postman. (CA-27)

  Colección actualizada (2026-11-18): carpeta "Cuenta (spec 011)" con 25 peticiones y sus pruebas. Crea una cuenta temporal (no toca la de las variables `email` y `password`), edita nombre y avatar (`400` con avatar inexistente y nombre corto, `null` quita el avatar), cambia correo (`403`, `409`) y contraseña (`400`, `403`, login nuevo `200` y anterior `401`), publica una ruta, comprueba el `409` al borrar con una alerta activa y el `403` con contraseña incorrecta, la borra (`204`) y verifica el `401` del token y del login, y que la ruta publicada queda con autor "Cuenta eliminada". **Corrida (2026-11-18):** con un runner propio que ejecuta los mismos scripts de la colección (el subconjunto de `pm` que usa, con `chai`), no con la app de Postman, contra un backend aparte en el puerto 3001 con `TELEGRAM_MODE=log` y el secreto del webhook. Se corrió con una cuenta desechable en `email` y `password`, porque la carpeta de seguridad borra todos los contactos de esa cuenta y la de Postman tiene contactos reales en el S9+; la advertencia quedó en la descripción de esa carpeta. Las 78 solicitudes y sus 134 pruebas pasan. En la primera corrida fallaron 7 pruebas de la carpeta nueva por errores de la propia colección (el `400` trae el detalle en `errors`, y la ruta de prueba medía menos de 1.5 km); se corrigieron. Al final se borró la cuenta desechable y la ruta sin autor que deja la carpeta; no quedan cuentas de prueba.
- [x] T60 — Correr pruebas unitarias de backend y frontend, e2e y lint. (CA-25)

  Hecho (2026-11-18), después de T67: Vitest pasa en el frontend (780) y en el backend (469); las e2e del backend pasan (88) y no dejan cuentas de prueba. `npm run lint` del backend termina sin errores, con 3 advertencias de variables sin usar en `user.entity.ts` y `user.service.ts` que ya estaban. `tsc` del frontend y `nest build` pasan. `tsc` sobre todo el backend marca `supertest/types` en `test/app.e2e-spec.ts`, que viene del primer commit y no afecta las e2e. El frontend no tiene lint configurado.
- [ ] T61 — Ejecutar `/spec-verify`. Actualizar los estados de 004, 009, 010 y 011 y `specs/roadmap.md`. Anotar en la 012 que debe quitar el túnel y comprobar que no define `EXPO_PUBLIC_BATTERY_TEST`. (CA-28, RN-7)

## Cobertura

Los 60 criterios tienen al menos una tarea y una forma de verificarse.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | Caso manual M25 | Manual, teléfono real | Cumple (salida del 2026-11-18, revisada el 2026-11-20) |
| CA-2 | Caso manual M26 | Manual, teléfono real | No cumple: la distancia (+5.1 %) y el barómetro (+6.5 %) sí; la elevación con GPS no, por F5, pasado a la 012 |
| CA-3 | Caso manual M25 | Manual, teléfono real | Cumple (salida del 2026-11-18) |
| CA-4 | Caso manual M27 | Manual, simulado | Cumple (2026-11-18, T55): aceptado por el usuario; no probado en bici real |
| CA-5 | Caso manual M28 | Manual, teléfono real | No cumple: el perfil hereda F5, pasado a la 012. El eje (F6) se corrige en T57 |
| CA-6 | Caso manual M29 | Manual, teléfono real | Cumple (2026-11-20): 004 M4 en el Nothing y M5 en el S9+; M3 con 1 piso (3.8 m, barómetro), aceptado por el usuario |
| CA-7 | Caso manual M25 | Manual, teléfono real | Cumple (salida del 2026-11-18; ajustes de batería revisados por USB el 2026-11-20) |
| CA-8 | Caso manual M30 | Manual, teléfono real | Pendiente: cumple quieto en el Nothing (2026-11-18); falta caminando |
| CA-9 | Caso manual M31 | Manual, teléfono real | Cumple (2026-11-19, Nothing; 008 M3 pasos 3 y 4 por las pruebas de T66) |
| CA-10 | Caso manual M32 | Manual, teléfono real | Cumple (2026-11-20, Nothing): sonó y vibró en las 10 |
| CA-11 | Caso manual M32 | Manual, teléfono real | Cumple (2026-11-20, Nothing): 10 de 10, sin alertas |
| CA-12 | Caso manual M33 | Revisión | Cumple (2026-11-18): se conservan los valores |
| CA-13 | Caso manual M20, `lib/db/espera.test.ts` y `activities.test.ts` | Manual y automatizada | Cumple (emulador) |
| CA-14 | `prisma-disponibilidad.filter.spec.ts`, `frontend/lib/routes/status.test.ts` y caso manual M21 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-15 | `backend/src/route/recorrido.spec.ts`, `route-publish.e2e-spec.ts` y caso manual M22 | Automatizada y manual | Cumple (Vitest, e2e y emulador) |
| CA-16 | `recorrido.spec.ts`, `route-publish.e2e-spec.ts` y caso manual M22 | Automatizada y manual | Cumple (Vitest, e2e y emulador) |
| CA-17 | `backend/src/activity/distancia.spec.ts`, `frontend/lib/metrics/oldPoints.test.ts` y caso manual M23 | Automatizada y manual | Cumple (Vitest, emulador y script con ruta de prueba) |
| CA-18 | Caso manual M24 | Manual, teléfono real | No reproducible (20/20 en Nothing Phone 2, RN-3) |
| CA-19 | Reporte de campo en este archivo (T56) | Revisión | Cumple (2026-11-20): F1 a F8 tienen severidad y resolución |
| CA-20 | Caso manual M19 | Manual, teléfono real | Cumple (2026-11-19) |
| CA-21 | Caso manual M19 | Manual, teléfono real | Pendiente |
| CA-22 | `npm run test:e2e`, 5 veces seguidas | Automatizada | Cumple (5 de 5, 88 pruebas) |
| CA-23 | Pruebas nuevas y lista revisada en T47 | Automatizada y revisión | Cumple (28 pruebas nuevas; resto anotado) |
| CA-24 | Revisión de T48 y T57 | Revisión | Cumple (2026-11-20): T63 a T69 tienen pruebas que fallan sin la corrección, salvo T65 y T66, verificadas como se anota en cada una |
| CA-25 | `npm test` y `npm run test:e2e` en backend, Vitest en frontend, y `npm run lint` | Automatizada | Cumple (2026-11-18, T60) |
| CA-26 | Caso manual M34 | Manual | Cumple (2026-11-20): emulador, y 007 M8 y 009 M1 en teléfonos reales |
| CA-27 | Caso manual M35 | Postman | Cumple (2026-11-18, T59): 134 pruebas, con un runner de los scripts de la colección |
| CA-28 | Revisión de estados en T61 | Revisión | Pendiente |
| CA-29 | Reporte de campo en este archivo (T56) | Revisión | Cumple (2026-11-20), salvo el nombre del sendero, que lo agrega el usuario |
| CA-30 | Caso manual M1 | Manual | Cumple (emulador) |
| CA-31 | `frontend/lib/map/offlineZones.test.ts` y caso manual M17 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-32 | Caso manual M17 | Manual | Cumple (emulador) |
| CA-33 | Caso manual M18 | Manual | Cumple (emulador) |
| CA-34 | Caso manual M17 | Manual | Cumple (emulador) |
| CA-35 | Caso manual M1 | Manual | Cumple (emulador) |
| CA-36 | Caso manual M2 | Manual | Cumple (emulador) |
| CA-37 | Caso manual M3 | Manual | Cumple (emulador) |
| CA-38 | Caso manual M4 | Manual | Cumple (paso 1 en el emulador y en el Nothing; paso 2 con TalkBack en el Nothing, 2026-11-20) |
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
| CA-53 | `frontend/lib/db/routeCache.test.ts`, `status.test.ts` y caso manual M12 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-54 | `status.test.ts` y caso manual M12 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-55 | `routeCache.test.ts`, `status.test.ts` y caso manual M13 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-56 | `routeCache.test.ts`, `status.test.ts` y caso manual M13 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-57 | `status.test.ts` y caso manual M13 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-58 | Caso manual M14 | Manual | Cumple en parte (emulador): favoritas y "Mis rutas"; publicar sin probar |
| CA-59 | Caso manual M15 | Manual | Cumple (emulador) |
| CA-60 | `routeCache.test.ts` y caso manual M16 | Automatizada y manual | Cumple (Vitest y emulador) |

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
3. Con nueve zonas y la borrada fuera de la lista, elegir una zona nueva.
- **Esperado:** (1) cada una dice cuánto ocupa. (2) desaparece de la lista. (3) deja descargarla: la borrada ya no cuenta para el tope. Sin red, la zona borrada puede seguir viéndose hasta que el teléfono libere su espacio (CA-33).

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

**M36 — Fallo al iniciar (spec 003, CA-16)**
1. Forzar que el primer inicio falle después de crear la actividad (un `throw` temporal en `start()`, solo en el primer intento) y presionar "Iniciar actividad".
2. Revisar la pantalla, el registro y la base del teléfono.
3. Presionar "Iniciar actividad" de nuevo, grabar unos segundos y detener.
4. Quitar el `throw`.
- **Esperado:** en el paso 2 la pantalla sigue en "Nueva actividad" con "No se pudo iniciar la actividad. Intenta de nuevo.", no sale "Uncaught (in promise)", y la actividad creada queda cerrada como en CA-10, sin ninguna en `RECORDING`. En el paso 3 la actividad inicia y se graba normalmente.

## Reporte de la prueba de campo

Se llena en T56. Sin dirección de casa ni datos de los contactos.

- **Fecha y lugar:**
  - Salida principal el 2026-11-18, de 17:42 a 18:50 UTC, en un sendero de Baja California de ~4.2 km y ~200 m de subida, según Strava. Falta el nombre del sendero, que lo pone el usuario.
  - Ensayo y pruebas cerca de casa el 2026-11-10 y el 2026-11-11.
  - Casos en teléfono real del 2026-11-18 al 2026-11-20: M19, M30 a M32, M4 y el resto de M25 y M29.
- **Teléfonos:** Galaxy S9+ (SM-G9650, con barómetro) y Nothing Phone 2 (A065, Android 16, sin barómetro). Build de campo con la URL del túnel y `EXPO_PUBLIC_BATTERY_TEST=1`. En el Nothing, desde el 2026-11-18, la build de diagnóstico de F5. Strava como referencia.
- **Tipo de actividad:** senderismo, de 1:08 en los dos teléfonos. Las pruebas de bicicleta y carro se simularon en el emulador (CA-4) o se grabaron en carro (F4).
- **Resultados por CA** (el detalle está en "Verificación" y en cada tarea):
  - Cumplen en teléfono real: CA-1, CA-3, CA-6, CA-7, CA-9, CA-10, CA-11, CA-20 y CA-38.
  - CA-4 cumple con la simulación del emulador; el usuario la dio por aceptable.
  - CA-12 (M33): se conservan los valores.
  - CA-18: no se pudo reproducir (20 de 20).
  - CA-2 y CA-5 no cumplen por F5, pasado a la 012. La distancia de CA-2 se aceptó con +5.1 %.
  - CA-8 cumple con el teléfono quieto; falta caminando.
  - CA-21 falta grabar fuera de la zona.
  - CA-26: la regresión pasa.
- **Fallos:**

| Fallo | Severidad | Resolución |
|---|---|---|
| F1 — Una actividad cerrada sin "Detener" puede quedar con el fin antes del inicio y no subir nunca (ver abajo) | Bloqueante | Corregido en T63; la actividad del Nothing subió |
| F2 — Con la pantalla bloqueada, los dos teléfonos dejan de grabar puntos durante casi toda la salida, y la detección de inactividad tampoco corre (ver abajo) | Mayor. En los dos fue el permiso, no el código | Corregido: aviso antes de iniciar (T66). En la salida del 2026-11-18 los dos grabaron sin huecos |
| F3 — Con la pantalla apagada el barómetro no entrega lecturas, y la actividad queda con fuente "barómetro" y 0 m de elevación (ver abajo) | Mayor; afecta CA-2 | Corregido en T64 y T65. En la salida del 2026-11-18 el S9+ midió 212 m con barómetro contra 201 m de Strava |
| F4 — A velocidad de carro o bici, con un punto cada 10 s, el suavizado de la distancia recorta 8 a 16 % (ver abajo) | Menor; afecta CA-4 | Corregido en T67: con los puntos reales, el carro queda entre −5.2 y −2.4 % de Strava y la caminata igual |
| F5 — En segundo plano, la altitud del GPS alterna entre la real y un valor casi fijo (~−15 m), y la elevación con GPS sale casi 4 veces la real (ver abajo) | Mayor; afecta CA-2 en teléfonos sin barómetro y el perfil de las rutas (M28) | **Pasado a la 012** (decidido con el usuario, 2026-11-20). CA-2 y CA-5 quedan sin cumplir por F5. Los datos de `diag_f5`, tomados solo con el teléfono quieto, muestran altitudes fijas con precisión vertical de 1 m, así que filtrar por `altitudeAccuracy` quizá no baste; falta la caminata de diagnóstico |
| F6 — El eje del perfil de una ruta mide la suma punto a punto, no la distancia de la ruta: en M28, 4 996 contra 4 461 m (+12 %) | Menor; afecta M28 | Corregido en T68 (decidido con el usuario, 2026-11-20). Las rutas ya publicadas conservan su perfil |
| F7 — Si el backend no responde al abrir la app, Inicio queda en "No se pudo cargar tu perfil" y no se recupera cuando vuelve la conexión; hay que cerrar y abrir la app (ver abajo) | Mayor: la función no sirve hasta reabrir la app | Corregido en T69 (decidido con el usuario, 2026-11-20); verificado con pruebas, no en un teléfono |
| F8 — Si se cambia el tamaño de letra con la app abierta, los textos que ya estaban en pantalla se cortan hasta reabrirla: en Seguridad, los botones de "Tiempo sin moverme" y "Cuenta regresiva" muestran el número sin "min", y en "Mis actividades" se corta la distancia (ver abajo) | Menor. Es el límite ya anotado en la spec 003 (CA-14) | **Aceptado por el usuario** (2026-11-20): es el costo de que cambiar la letra no corte la grabación |

- **F7, detalle (2026-11-19):** antes de M31, en el Nothing, la app se abrió con el túnel apagado. Ya con el túnel arriba, el teléfono llegaba al backend (`curl` desde el teléfono y `GET /user/profile` con la cuenta de Postman, ambos por el túnel, respondían), pero Inicio seguía con el error y sin el aviso de "Seguridad activa". Al cerrar y abrir la app cargó todo. En el frontend no se usan `onlineManager` ni `focusManager` de TanStack Query, así que la consulta con error no se repite al volver la red ni al regresar a la app. Ninguna spec lo pide de forma explícita: la 010 (CA-16) habla solo del mapa.
  Pasó dos veces el 2026-11-19: la segunda, el túnel daba `502` en 1 de cada 3 peticiones (tras 5 a 11 s), con el backend respondiendo en local. Con la app abierta en un `502`, la tarjeta de Seguridad de Inicio sí era correcta: el usuario había quitado a su único contacto al empezar M1.
- **F8, detalle (2026-11-20):** en 009 M1, hecho por el usuario en un teléfono real. En modo claro todo coincide. Con la letra del sistema en la opción más grande, se cortan al menos dos textos:
  - En Seguridad, los botones de "Tiempo sin moverme" y "Cuenta regresiva" muestran el número y no "min".
  - En "Mis actividades", la distancia.
  
  - **Causa:** el usuario cambió el tamaño de letra sin cerrar la app. Con la app reabierta y `font_scale` 1.3 (la opción que tenía el Nothing), las dos pantallas se ven completas: los botones bajan de fila con "min", y las distancias y los tiempos caben.
  - **Ya estaba documentado:** es el límite anotado en la spec 003 (CA-14). `fontScale` está en `configChanges` para que cambiar la letra no corte la grabación (hallazgo de la spec 010). Por eso React Native no vuelve a medir los textos que ya están en pantalla; las pantallas nuevas sí salen bien.
  - **009 M1 con letra grande pasa** con la app reabierta, que es como lo prueba M1. Queda decidir en T56 si se acepta el límite o se fuerza a volver a medir los textos al cambiar la letra.

**Antes de la salida (2026-11-10).** Actividades grabadas por el usuario sin backend ni internet, sincronizadas después por USB. No cuentan como la prueba de campo (M25 a M33), pero dejan datos y un fallo.
- **Mismo recorrido en los dos teléfonos**, grabado como ciclismo. Por la velocidad (mediana 25 km/h, máximo 113 km/h), parece hecho en carro.

  | | S9+ | Nothing Phone 2 |
  |---|---|---|
  | Duración | 7:24 | 7:29 |
  | Distancia | 4 433 m | 4 440 m (0.2 % de diferencia) |
  | Puntos | 190, cada 2 s | 190, cada 2 s; un hueco de 34 s al empezar |
  | Precisión, mediana | 3.2 m | 3.8 m |
  | Elevación | barómetro: +51 / −42 m | GPS: +28 / −14 m |
  | Desnivel neto | +8 m por presión, +7 m por GPS | +15 m por GPS |

  Ninguno tiene huecos durante el recorrido, saltos de más de 50 m/s ni la ubicación vieja al inicio. Sin app de referencia no sirve para CA-2.
- **Regreso en el S9+**, también como ciclismo: 4.03 km en 6:45, +26 / −33 m. El desnivel neto es parecido al de ida, en sentido contrario.
- **Un senderismo de 70 s en el S9+**, quieto: 2 puntos y 0 m.
- **Teléfono y servidor** tienen la misma distancia, la misma elevación y el mismo número de puntos en las 4.
- **F1, detalle:** en el Nothing Phone 2, una actividad del 2026-11-07 seguía en `PENDING_SYNC` con el error "El fin de la actividad no puede ser anterior al inicio".
  - **Causa:** su único punto tiene la hora del GPS 95 ms antes de `startedAt`. Al cerrarla sin "Detener", `endedAt` tomó la hora del último punto.
  - **Dónde:** `closeOrphanActivities` (`lib/db/activities.ts`) y `cierrePendiente` (`lib/activity/inicio.ts`) hacen lo mismo. Un primer punto unos ms antes del inicio es normal: la del Nothing de este día empezó con uno 0.6 s antes.
  - **Corrección propuesta:** usar como fin el mayor entre el último punto y el inicio, y reparar una vez las actividades pendientes que ya tengan el fin antes del inicio. Toca la spec 003, CA-10.

**Salida (2026-11-11), senderismo, 08:21 a 09:17.** Los dos teléfonos con sesión de seguridad y Strava en el Nothing como referencia. Las dos actividades se sincronizaron solas.

| | S9+ | Nothing Phone 2 | Strava |
|---|---|---|---|
| Duración | 55:38 | 55:43 | — |
| Distancia | 1 180 m (−72 %) | 2 107 m (−51 %) | 4.29 km |
| Elevación ganada | 31 m, barómetro | 124 m, GPS (−41 %) | 208 m |
| Puntos | 62 | 37 | — |

- **Resultado:** CA-1 y CA-2 no cumplen, por F2. La distancia y la elevación no se pueden juzgar contra RN-10 hasta que la grabación no tenga huecos. CA-3 cumple: el primer punto de cada uno es de la hora de inicio.
- **F2, detalle:** los puntos llegan cada 4 a 6 s y con precisión de 3 a 6 m mientras hay, pero se cortan.
  - **S9+:** sin puntos de 08:24:34 a 08:29:12 y de 08:29:49 a 09:15:55 (46 min).
  - **Nothing:** seis huecos de 3 a 20 min. Entre ellos solo hay puntos sueltos, casi siempre de a dos.
  - **Los dos vuelven a las 09:15:55,** con menos de un segundo de diferencia, y siguen bien hasta "Detener" a las 09:17.
  - **No llegó ningún "¿Estás bien?" ni alerta** en 46 min sin puntos. El detector solo corre cuando llega una ubicación (segundo plano) o con el temporizador de la pantalla (primer plano). Que tampoco corriera indica que la app entera dejó de ejecutarse, no solo el GPS.
  - **No hay saltos ni puntos descartados:** el procesador solo descarta los que están a menos de 5 m del anterior y la ubicación vieja del primer minuto.
- **Causas posibles, por confirmar:**
  1. Grabó en primer plano (`watchPositionAsync`) porque faltaba el permiso "Permitir todo el tiempo". Con la pantalla bloqueada, ese modo no recibe puntos.
  2. Grabó en segundo plano, pero el ahorro de batería de Samsung y de Nothing detuvo el servicio.
- **Para distinguirlas:** si se vio la notificación fija de "grabando", el permiso de ubicación de SendaBC en cada teléfono, y el registro del teléfono (`adb logcat`) si todavía lo guarda.
- **S9+, causa confirmada (1):** `ACCESS_BACKGROUND_LOCATION` está denegado con la marca `USER_SET`, así que grabó en primer plano. El registro muestra la pantalla apagada (en reposo) hasta las 09:15:54, cuando se desbloqueó con la huella. El primer punto después del hueco es de las 09:15:55. Es lo que la spec 008 (CA-10) define sin ese permiso: la app avisa con "Detección solo con la app abierta" y no vuelve a pedir el permiso si el sistema ya no deja preguntar. M25 pide el permiso concedido, así que en el S9+ falló la preparación, no el código.
- **Nothing, misma causa:** `ACCESS_BACKGROUND_LOCATION` está denegado con `USER_SET|USER_FIXED` ("no volver a preguntar"), así que la app no lo pide de nuevo. Su registro empieza a las 09:15 y ya no muestra los huecos. Los puntos sueltos entre los huecos coinciden con ratos en que la app estaba en pantalla.
- **Para decidir en T56:** el aviso es fácil de pasar por alto y, con la pantalla apagada, la actividad pierde puntos sin que el usuario lo note. Se puede pedir un aviso más claro antes de iniciar, con un acceso directo a los ajustes del permiso.
- **Visto de paso, descartado después:** se sospechó que `expo-location` ignoraba el `timeInterval` de 10 s en segundo plano (`as? Long` en `LocationArguments.kt`). Las actividades de la tarde, ya en segundo plano, tienen un punto cada 10 s: el intervalo sí se respeta. Los puntos cada 4 s de la mañana eran del modo primer plano (2 s más el mínimo de 5 m).

**Más tarde (2026-11-11), en carro, como ciclismo.** Los dos teléfonos ya en segundo plano, con la pantalla apagada todo el tiempo. Strava en el Nothing. No cuentan para M25 (no es senderismo), pero prueban el segundo plano y dejan F3 y F4.

| | A1, S9+ | A1, Nothing | A1, Strava | A2, S9+ | A2, Nothing | A2, Strava |
|---|---|---|---|---|---|---|
| Distancia | 4 385 m (−16 %) | 4 536 m (−14 %) | 5.25 km | 3 313 m (−8 %) | 3 271 m (−9 %) | 3.59 km |
| Suma punto a punto | 5 207 m (−1 %) | 5 152 m (−2 %) | | 3 614 m (+1 %) | 3 538 m (−1 %) | |
| Elevación ganada | 0 m, barómetro | 61 m, GPS (+11 %) | 55 m | 0 m, barómetro | 12.5 m, GPS (−1.5 m) | 14 m |
| Puntos | 67 | 70 | | 31 | 30 | |

- **Segundo plano:** puntos cada 9 a 10 s durante todo el recorrido, con la pantalla apagada. Sin huecos, salvo de 38 a 48 s al empezar (primer fijo del GPS) y uno de ~40 s en A1, en el mismo sitio en los dos teléfonos (parado: los puntos a menos de 5 m del anterior no se guardan). Esto cumple lo que M25 pide del tiempo bloqueado.
- **Elevación con GPS (Nothing):** dentro de RN-10 en las dos (±30 % o ±30 m).
- **F3, detalle:** `expo-sensors` deja de escuchar el sensor cuando la actividad de Android pasa a segundo plano (`OnActivityEntersBackground` → `onHostPause` en `SensorProxy.kt`). Con la pantalla apagada no llegan lecturas. `finalizeMetrics` usa la fuente elegida al iniciar sin revisar si hubo lecturas, así que la actividad queda con 0 / 0 m y fuente "barómetro". En la salida de la mañana pasó a medias: solo cuenta lo que hubo con la pantalla encendida.
  - **Opciones para T56:** usar la altitud del GPS cuando las lecturas no cubren la actividad (sencillo, pierde la precisión del barómetro), o leer el barómetro desde código nativo dentro del servicio en primer plano (más trabajo). Toca la spec 004 (CA-12 a CA-14) y su RN-3.
- **F4, detalle:** la suma punto a punto queda a 2 % o menos de Strava. Lo que se pierde viene del promedio de 5 puntos (`SMOOTHING_WINDOW`): a 10 s entre puntos y 30 a 100 km/h, la ventana abarca cientos de metros y corta las curvas. A pie (~14 m entre puntos) la ventana abarca ~60 m y debería perder mucho menos, pero falta confirmarlo en M26. Con bici a 20 km/h la ventana abarca ~270 m.
  - **Opciones para T56:** que la ventana dependa del tiempo o la distancia entre puntos en lugar de la cantidad, o no suavizar cuando los puntos están lejos entre sí. Toca la spec 004 (plan D3) y el cálculo del backend (`distancia.ts`, D7).

**Salida (2026-11-18), senderismo, 17:42 a 18:50 (UTC).** Los dos teléfonos con "Permitir todo el tiempo" y la versión con T63 a T66. Strava como referencia. Las dos actividades se sincronizaron solas.

| | S9+ | Nothing Phone 2 | Strava |
|---|---|---|---|
| Duración | 1:08:26 | 1:08:02 | ~1 h, recortada a la hora de "Detener" |
| Distancia | 4 461 m (+5.2 %) | 4 458 m (+5.1 %) | 4.24 km |
| Suma punto a punto | 4 996 m | 4 775 m | |
| Elevación ganada | 212 m, barómetro (+6.5 %) | 774 m, GPS (+289 %) | 199 m |
| Puntos | 394, cada ~10 s | 410, cada ~10 s | |
| Precisión, mediana | 9 m | 3 m | |

- **F2 resuelto en campo:** puntos cada 9 a 10 s durante todo el recorrido, con la pantalla bloqueada. Solo hay tramos de 64 a 141 s sin puntos guardados, en el mismo sitio en los dos (parado: no se guardan puntos a menos de 5 m). Cumple lo que M25 pide del tiempo bloqueado.
- **CA-3:** el primer punto del Nothing es de la hora de inicio; el del S9+ es de 26 s antes, a 11 m del siguiente, dentro del margen de 30 s (spec 003, RN-5). No hay ubicación vieja.
- **F3 resuelto en campo:** el S9+ midió con barómetro toda la salida, con la pantalla bloqueada. 212 m contra 199 m está dentro de RN-10 (±15 %).
- **Otra actividad del Nothing,** de 6 s y 1 punto, a las 17:41: un inicio de prueba sin recorrido.
- **F5, detalle:** en los dos teléfonos, la altitud del GPS salta entre la real (sube de −17 a ~120 m) y un valor casi fijo de −13 a −20 m, a veces en puntos seguidos y a veces durante varios minutos (de 18:24 a 18:34 en el S9+, siempre −13 m mientras avanza). Son 173 de 394 puntos en el S9+ y 130 de 410 en el Nothing. La precisión horizontal de esos puntos es normal (8 a 11 m), así que el filtro de precisión no los quita. Un valor fijo mientras la persona avanza indica que esa ubicación no trae altitud medida. Con el promedio de 5 y el umbral de 10 m, cada salto suma una subida falsa de ~100 m.
  - En la caminata del 2026-11-11 (primer plano, punto cada 2 s) y en el carro (segundo plano, terreno casi plano) no se vio, o no pesó.
  - **Probado con los puntos de hoy, sin cambiar el código:** la mediana de 15 en lugar del promedio de 5 deja 492 m en el Nothing; descartar las altitudes que implican más de 0.5 m/s de velocidad vertical deja 412 m. Ninguna llega a RN-10 (±30 %): son demasiados puntos malos.
  - **Opción para T56:** guardar la precisión vertical de cada punto (`coords.altitudeAccuracy` de `expo-location`) e ignorar la altitud de los puntos sin ella o con una mala. Falta comprobar en un teléfono que esos puntos la traen vacía o grande. Para eso, el 2026-11-18 se instaló en el Nothing un build de diagnóstico (solo en `C:\dev\sbc`, sin commit): guarda en la tabla `diag_f5` cada ubicación tal como llega, con `altitudeAccuracy`, y es depurable para leerla con `run-as`. Falta una caminata de 15 a 20 min con la pantalla bloqueada. Toca la spec 004 (CA-11, RN-3) y la tabla de puntos del teléfono.
- **Strava:** sin recortar marcaba 5.04 km y 201 m, porque siguió grabando después de "Detener". El usuario la recortó a la hora de fin de la app: 4.24 km, ~1 h y 199 m. Strava empezó un poco antes que la app, con el usuario quieto, así que cubre el mismo recorrido; la diferencia de tiempo es cómo cuenta Strava el tiempo.
- **Distancia (CA-2):** los dos teléfonos quedan 5.1 y 5.2 % arriba de Strava, apenas fuera de ±5 % (RN-10), y a menos de 0.1 % entre sí. **Decidido con el usuario (2026-11-18):** se acepta como dentro de CA-2; la diferencia con el límite es menor que el error de la referencia. CA-2 queda pendiente solo por la elevación con GPS (F5).
- **F4 a pie:** el suavizado no recorta de más. La distancia suavizada queda 11 % (S9+) y 7 % (Nothing) bajo la suma punto a punto, y aun así un poco arriba de Strava: a pie quita ruido. F4 solo afecta a velocidad de bici o carro.

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
