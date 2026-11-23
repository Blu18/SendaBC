# 012 — Plan técnico

Spec: [spec.md](spec.md)

## Resumen

La spec tiene dos partes. La primera cambia código y la segunda casi todo es configuración, documentación y pruebas en el teléfono.

- **Actividades con menos de 3 puntos válidos.** Un punto es válido si su precisión es de 20 m o mejor, o si no trae precisión: es la misma regla `isAccurate` que usa la distancia en la app y en el servidor (D1). La app cuenta los puntos válidos en SQLite al cerrar la actividad, por cualquiera de los tres caminos. Si son menos de 3, termina la sesión de seguridad y borra la actividad (D2, D3). "Detener" y la pregunta al salir avisan antes. El servidor rechaza esas actividades con una regla más de RN-5 de la spec 005. Las actividades cortas que ya están guardadas se borran una sola vez: en el teléfono con la versión 8 de SQLite y en el servidor con una migración de Prisma (D4).
- **Nombre, ícono y pantalla de arranque.** La app se configura en `app.json` con el nombre "SendaBC", el logo cuadrado de la spec 009 como ícono adaptable y de notificación, y `expo-splash-screen` en modo claro y oscuro (D5, D6).
- **Build de entrega.** El APK se compila con EAS Build, con un perfil `entrega` que apunta al backend publicado por HTTPS (D7).
- **Despliegue.** El backend corre en una máquina virtual de Azure for Students, con systemd y Caddy para el HTTPS. La base sigue en Supabase (D8, D9, D10).
- **Documentación y demo.** El README va en la raíz del repositorio. El manual y el guion de la demo van en Markdown en `docs/`.
- **Pendientes de specs anteriores.** Se corren con el APK de entrega y se anotan en el `tasks.md` de cada spec de origen. "Ver N actividades" se corrige apilando los botones desde 110 % de letra (D11).

## Verificación contra la constitución

- [x] **Art. 1 La spec primero:** la spec se aprobó el 2026-11-22. Las specs 003 (CA-10 y CA-15) y 004 (CA-17) se anotaron en sus historiales antes de este plan (RN-7).
- [x] **Art. 2 Offline-first:** contar y descartar ocurre solo en SQLite, sin red (2.1). Solo se borra una actividad por la regla de los 3 puntos, nunca por un fallo de red o del servidor (2.4, RN-4). Los estados no retroceden (2.3): una actividad descartada no pasa por otro estado, se borra. La sesión de seguridad se termina **antes** de borrar la actividad. El aviso de fin queda en `safety_outbox`, que no depende de la actividad, y sale cuando hay red (D3).
- [x] **Art. 3 Seguridad:** la app solo habla con el backend por HTTPS (D9). Los secretos (`DATABASE_URL`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`) viven en un archivo de entorno en la máquina virtual, fuera del repositorio (3.6). El token público de Mapbox va como variable de entorno de EAS, no en `eas.json` (D7). El README solo trae valores de ejemplo (CA-3). Los permisos no cambian (3.5).
- [x] **Art. 4 Contratos de API:** no hay endpoints nuevos. `POST /activities/sync` gana una regla más de validación por actividad, con su mensaje en español (4.3). La actividad se rechaza dentro de la respuesta `200`, como las demás reglas de RN-5 (spec 005, D1).
- [x] **Art. 5 Datos:** sin cambios de modelo en Prisma. La migración `20261123000000_borrar_actividades_cortas` solo borra datos (5.1). SQLite pasa a la **versión 8**, que solo borra datos y no cambia el esquema (5.3).
- [x] **Art. 6 Verificación:** con Vitest se prueban la regla nueva del servidor, la decisión de guardar o descartar, el conteo de puntos válidos, el descarte al cerrar y la migración v8. Las pantallas, el build, el despliegue y la demo se verifican con casos manuales en `tasks.md`. La colección de Postman se corre contra el backend publicado (6.3, CA-12).
- [x] **Art. 7 Simplicidad y stack:** hay dos cambios en la tabla del stack (D6, D8). `expo-splash-screen` es un módulo del SDK de Expo, y una máquina virtual de Azure for Students con Caddy reemplaza a "Railway o Render" (v1.11 decía Oracle Cloud Always Free; v1.12 lo cambia, D8). No hay otras dependencias de npm.
- [x] **Art. 8 Ritmo:** rama `012-entrega` desde `master` con la 015 fusionada. Commits `feat(012)`, `fix(012)` y `docs(012)`.

### Cambios a la constitución (v1.11, se aprueban con este plan)

- Tabla, fila **Interfaz:** se agrega `expo-splash-screen` (pantalla de arranque en modo claro y oscuro, D6).
- Tabla, fila **Despliegue:** "Railway o Render (API)" pasa a "Oracle Cloud Always Free (API, con systemd y Caddy para HTTPS)" (D8). En v1.12 pasa a la máquina virtual de Azure for Students.
- Historial: entrada v1.11 que cita la spec 012, plan D6 y D8.

## Backend

### Endpoints

No hay endpoints nuevos. Cambia la validación de uno:

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| POST | `/activities/sync` | JWT | Sin cambios (spec 005) | `200 { results }`. Una actividad con menos de 3 puntos válidos sale como rechazada, con el error `"La actividad necesita al menos 3 puntos con buena precisión para guardarse"` | Sin cambios: `400` en el lote, `401`, `503` |

`POST /telegram/webhook` no cambia. En producción, el webhook se registra una vez con `setWebhook` hacia `https://<dominio>/telegram/webhook`, con el secreto de `TELEGRAM_WEBHOOK_SECRET`. El comando va en el README.

### Módulos / archivos

- `backend/src/activity/distancia.ts`: se agrega `MIN_PUNTOS_VALIDOS = 3`, junto a `MAX_ACCURACY_M`, y `contarPuntosValidos(puntos)`, que usa `isAccurate`. Es la copia del lado del servidor de `frontend/lib/metrics/validPoints.ts` (D1). Los dos archivos repiten los mismos casos de prueba.
- `backend/src/activity/activity-validation.ts`: `reglasExtra` agrega el error de la tabla cuando `contarPuntosValidos(points) < MIN_PUNTOS_VALIDOS` (CA-26).
- `backend/src/activity/dto/activity-upload.dto.ts`: se actualiza el comentario "Puede estar vacío". La lista sigue sin `ArrayMinSize`, porque la regla cuenta puntos válidos y no puntos (D1).
- `backend/src/activity/activity-validation.spec.ts` y `distancia.spec.ts`: casos con 0, 2 y 3 puntos válidos, con 3 puntos de los cuales 1 es impreciso, y con precisión `null`.
- `backend/test/`: el e2e de sync sube una actividad de 2 puntos válidos y la ve rechazada, sin que se guarde nada. Los e2e que hoy suben actividades sin puntos se ajustan a 3 puntos válidos.
- `backend/README.md`: se reemplaza la plantilla de NestJS por un enlace al README de la raíz.

### Cambios de esquema (Prisma)

No cambia el modelo. La migración de datos `20261123000000_borrar_actividades_cortas` (CA-25, D4) borra de `activities` las actividades con menos de 3 puntos en `activity_points` que cumplan `"accuracyMeters" IS NULL OR "accuracyMeters" <= 20`. Sus puntos se borran en cascada. Si alguna era el origen de una ruta publicada, `routes.sourceActivityId` queda en `NULL` (`onDelete: SetNull`) y la ruta no cambia.

Antes de aplicarla en Supabase se corre la misma consulta como `SELECT`, para ver cuántas actividades se borran y de qué cuentas. El usuario confirma antes de seguir (riesgo R1).

### Despliegue (D8, D9, D10)

- **Máquina virtual:** Azure for Students, `Standard_B2ats_v2` (2 vCPU, 1 GB) con Ubuntu 24.04 LTS en `mexicocentral`. Se pidió primero `Standard_B1s`, pero no tenía capacidad en esa región (R4). La suscripción solo permite `centralus`, `mexicocentral`, `canadacentral`, `brazilsouth` y `chilecentral`;  la suscripción solo permite `centralus`, `mexicocentral`, `canadacentral`, `brazilsouth` y `chilecentral`. Disco de 64 GB P6 e IP pública estática. La máquina y el disco P6 entran en los servicios gratis de 12 meses y lo demás se cubre con el crédito de USD 100. Un archivo de intercambio de 2 GB para que `npm ci` y `nest build` no se queden sin memoria. Node 24 LTS, la versión de desarrollo.
- **Proceso:** `backend/deploy/sendabc-api.service` (systemd) corre `node dist/main` con `Restart=always` y lee `/etc/sendabc/api.env`. Este archivo no está en el repositorio y tiene `NODE_ENV=production`, `PORT`, `DATABASE_URL`, `DIRECT_URL` (para `prisma migrate deploy`), `JWT_SECRET`, `JWT_EXPIRE_IN`, `TELEGRAM_MODE=webhook` y las variables del bot. Arranca solo al reiniciar la máquina. Así no se duerme y la tarea `hora-de-regreso` corre cada minuto (CA-9, CA-10).
- **HTTPS:** `backend/deploy/Caddyfile` con un proxy inverso de `https://<dominio>` a `localhost:PORT`. Caddy saca y renueva solo el certificado de Let's Encrypt. El dominio es `<ip-con-guiones>.sslip.io`, que es gratis y no necesita cuenta (D10).
- **Red:** el grupo de seguridad de red de Azure abre solo los puertos 80 y 443, además del 22 para SSH. La imagen de Ubuntu de Azure no trae reglas de `iptables`. El puerto de Node no queda expuesto.
- **Actualizar:** `backend/deploy/actualizar.sh` hace `git pull`, `npm ci`, `npm run build`, `npx prisma migrate deploy` y `systemctl restart sendabc-api`.
- **Base recreable (CA-11):** se crea un proyecto vacío de Supabase (el plan gratis permite dos). Se aplican las migraciones con `prisma migrate deploy` y se corren los e2e contra él. Después ese proyecto se borra.

## Frontend

### Pantallas y navegación

- `frontend/pages/activity/activityPage.tsx`:
  - `handleStop`: antes de `stop()`, consulta `countValidPoints(activityLocalId)` (D2). Si `!debeGuardarse(n)`, muestra el `Alert` de CA-17 con "Seguir grabando" (cancela) y "Terminar sin guardar" (destructivo). Con "Terminar sin guardar" llama `stop({ descartar: true })` y la pantalla queda en "Nueva actividad", sin `replace` al resumen (CA-18). Con 3 puntos válidos o más, todo sigue como hoy (CA-20). Si hay una alerta activa, primero se hace la pregunta de la alerta, como hoy.
  - `usePreventRemove`: antes del `Alert` de salida cuenta los puntos válidos. Con menos de 3, el texto avisa que la actividad no se guardará (CA-21). El cierre al desmontar ya pasa por `cerrarActividad`, que aplica la regla.
- `frontend/lib/activity/closingMessages.ts` (nuevo): los textos de las dos preguntas (RN-6).
  - "Detener", título: "¿Terminar sin guardar?". Cuerpo: "La actividad tiene muy poco recorrido y no se guardará."
  - Al salir, cuerpo: "Si sales, la grabación termina. La actividad tiene muy poco recorrido y no se guardará."
  - El texto final se puede ajustar en la implementación.
- `frontend/components/activity/ActivityFiltersSheet.tsx`: `STACK_FONT_SCALE` pasa de 1.25 a 1.05, para que los botones se apilen desde 110 % (CA-28, D11). Se usa 1.05 y no 1.1 porque Android puede entregar la escala un poco por debajo de su valor, como pasó con 1.3 en la 015 (T17).

### Hooks / estado / almacenamiento local

- `frontend/lib/metrics/validPoints.ts` (nuevo, lógica pura con Vitest): `MIN_VALID_POINTS = 3`, `countValidPoints(points)` con `isAccurate` y `debeGuardarse(n)`. Es la copia de `distancia.ts` del servidor (D1).
- `frontend/lib/db/activities.ts`:
  - `countValidPoints(localId)`: `COUNT(*)` en SQL sobre `activity_points` con `accuracy IS NULL OR accuracy <= MAX_ACCURACY_M`.
  - `discardActivity(localId)`: `DELETE` de la actividad (puntos, lecturas del barómetro y sesión de seguridad en cascada) **solo** si su `client_generated_id` no tiene `server_id`. Así nunca borra una que el servidor ya guardó (riesgo R3).
  - `closeOrphanActivities()`: devuelve también los `local_id` que cerró, para descartar las cortas después de terminar sus sesiones.
- `frontend/hooks/activity/activityTracker.hook.ts`:
  - `stop({ descartar })`: después de `finishActivity` y `sessionActions.terminar`, si `descartar` llama `discardActivity` en lugar de `finalizeMetrics` y `requestSync`. Devuelve `{ kind: 'descartada' }` y el estado pasa a `idle`, para que la pantalla vuelva a "Nueva actividad".
  - `cerrarActividad` (salir de la pantalla o fallo al iniciar): después de `terminar`, cuenta los puntos válidos. Con menos de 3 descarta; si no, calcula métricas y sincroniza como hoy (CA-21, spec 003 CA-16).
- `frontend/lib/safety/sessionActions.ts`, `cerrarHuerfanas`: después de cerrar las actividades y terminar sus sesiones, como hoy, descarta las que tengan menos de 3 puntos válidos, sin aviso (CA-22, CA-24). El orden es: cerrar, encolar `finish` y luego borrar (D3).
- Cambios a SQLite, **versión 8** (CA-25, D4): un paso en `lib/db/schema.ts` que borra las actividades con `status != 'RECORDING'` y menos de 3 puntos válidos, incluidas las `SYNCED`. Corre una sola vez, por `PRAGMA user_version`. No toca las que están grabando, porque esas las resuelve `cerrarHuerfanas` al abrir la app. Prueba en `schema.test.ts`.
- La cola de sincronización no cambia. Ninguna actividad corta llega a `PENDING_SYNC` después de cerrarse, y las que ya estaban las borra la v8.

### Configuración nativa (`app.json`)

- `name`: "SendaBC" y `slug`: "sendabc" (CA-29). El esquema del development build pasa a `exp+sendabc` y la nota de los casos manuales en la memoria se actualiza. `android.package` sigue igual (`com.sendabc.app`). Se agrega `android.versionCode: 1`.
- Ícono (CA-30): se exporta de Figma ("SendaBC — Diseño", página de identidad de la 009) el logo cuadrado.
  - `assets/icon.png`: 1024 px.
  - `assets/adaptive-icon.png`: el logo dentro del 66 % central, la zona segura de Android.
  - `assets/adaptive-icon-monochrome.png`: para los íconos con tema de Android 13 y posteriores.
  - `android.adaptiveIcon.backgroundColor`: el color de marca de `colors.ts`.
- Notificaciones (CA-31): `assets/notification-icon.png` es una silueta blanca del logo de 96 px con fondo transparente, en la opción `icon` del plugin `expo-notifications`. El color (`#C1432A`) se conserva.
- Pantalla de arranque (CA-32, D6): `npx expo install expo-splash-screen` y su plugin, con el logo y `backgroundColor` claro, y `dark.image` y `dark.backgroundColor` con el logo y el fondo oscuro de `colors.ts`. Se quita la clave `splash` de nivel superior.
- Antes de programar se revisan las opciones de estos plugins en la documentación de SDK 57 (`frontend/AGENTS.md`).

### Build de entrega (D7)

- `frontend/eas.json` (nuevo), perfil `entrega`: `android.buildType: "apk"`, `distribution: "internal"` y `env.EXPO_PUBLIC_BACKEND_IP: "https://<dominio>"`. No define `EXPO_PUBLIC_BATTERY_TEST` ni `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES` (CA-7).
- `EXPO_PUBLIC_MAPBOX_TOKEN` se carga como variable de entorno del proyecto en EAS. El usuario inicia sesión en Expo (`eas login`) y corre `eas init`, que agrega `extra.eas.projectId` a `app.json`. La firma la lleva EAS, con un keystore administrado.
- El APK se descarga del build y se adjunta a la entrega como `SendaBC-1.0.0.apk` (P2).

## Documentación y demo

- `README.md` (raíz, CA-1 a CA-3):
  - qué es SendaBC;
  - arquitectura con un diagrama en Mermaid;
  - stack y estructura de carpetas;
  - SDD y la carpeta `specs/`;
  - requisitos (Node 24, Android SDK, JDK 21);
  - variables de entorno del backend y de la app, con valores de ejemplo;
  - desarrollo: migraciones, `start:dev`, `expo start` y development build;
  - pruebas y linter;
  - despliegue en Azure, registro del webhook y build con EAS;
  - instalación del APK y enlace al manual.
- `docs/manual.md` (CA-4, CA-5): una sección por función, con capturas del APK de entrega en `docs/capturas/`, tomadas con `adb exec-out screencap` en el S9+. Incluye el uso sin conexión, la regla de las actividades cortas y la limitación de F5 (CA-16).
- `docs/demo.md` (CA-13, CA-14, CA-27): el guion paso a paso, qué se prepara antes y un plan B si falla la red del lugar (la grabación y Mis actividades funcionan sin red).
  - Lo que se prepara antes: la cuenta de la demo, la actividad real grabada antes, las actividades para los filtros, una ruta publicada cerca y un contacto del equipo vinculado al bot real.
  - Las actividades de relleno se crean grabando con el GPS simulado en el emulador y la misma cuenta, y se recuperan en el S9+ (spec 005, CA-21).

## Pendientes de specs anteriores (CA-15, CA-16)

- Se corren con el APK de entrega en el S9+ y se anotan en el `tasks.md` de su spec:
  - 014: M8, M12 y los pasos 3 y 5 de M5;
  - 015: el recorrido con TalkBack de M8, el paso 4 de M3 y el paso 5 de M10;
  - 011: la prueba de batería.
- **Observaciones:**
  - el cierre de Fabric al arrancar (015);
  - P-B y P-E (013);
  - la caminata de F5 con la pantalla bloqueada (011).
- **F5:** queda como limitación conocida aunque se confirme. Se documenta en la 011 y en el manual.
- Cada spec de origen actualiza su estado y `roadmap.md`.

## Decisiones

| Decisión | Alternativas consideradas | Motivo |
|---|---|---|
| **D1.** Punto válido = `isAccurate` (precisión ≤ 20 m o `null`) | Excluir también los saltos de ubicación y los puntos viejos del inicio | `isAccurate` ya existe igual en la app y en el servidor y no depende del orden de los puntos. Los saltos y los puntos viejos dependen de los vecinos y del reloj, y las dos copias divergirían con facilidad. |
| **D2.** Se cuenta en SQLite al cerrar, no en vivo | Llevar la cuenta con los eventos de `onGrabacion` | SQLite es la fuente de verdad (constitución 2.1). En los tres caminos se cuenta lo mismo, incluido el cierre al abrir la app, donde no hay eventos. Un `COUNT` con índice por actividad tarda poco aunque haya miles de puntos. |
| **D3.** Primero se termina la sesión de seguridad, después se borra la actividad | Borrar y dejar que el servidor cierre la sesión | `safety_sessions` se borra en cascada con la actividad. Si se borrara antes de encolar `finish`, el servidor seguiría esperando la hora de regreso y avisaría a los contactos, lo que rompe CA-23. `safety_outbox` no depende de la actividad. |
| **D4.** Borrado único: v8 en SQLite y migración de datos en Prisma | Ocultar las actividades cortas en las consultas | El usuario eligió borrarlas (P3). Las dos migraciones corren una sola vez y quedan en el historial (constitución 5.1 y 5.3). Ocultarlas obligaría a filtrar en cada consulta y en los totales. |
| **D5.** `name` "SendaBC" y `slug` "sendabc" | Cambiar solo `name` | Con `slug` "frontend" el proyecto de EAS y el esquema del development build seguirían diciendo "frontend". El paquete de Android no cambia, así que la app instalada se actualiza en lugar de duplicarse. |
| **D6.** `expo-splash-screen` (módulo del SDK) | La clave `splash` de nivel superior | La documentación de SDK 57 marca los otros métodos como heredados, y la clave no tiene variante oscura (CA-32). |
| **D7.** EAS Build en la nube, con el perfil `entrega` | `./gradlew assembleRelease` local; `eas build --local` | Ya está en el stack. Firma con un keystore administrado y es repetible desde el README. `--local` no corre en Windows, y el build local obligaría a guardar y respaldar el keystore. |
| **D8.** Máquina virtual de Azure for Students con systemd | Oracle Cloud Always Free (rechazó los datos de pago); túnel de VS Code (depende de una computadora encendida, no cumple CA-7, CA-9 ni CA-10); Render Free con `pg_cron`; Docker; pm2 | Es gratis para estudiantes, no pide tarjeta y no se duerme (P1). systemd ya viene en Ubuntu y reinicia el proceso: no se agregan dependencias. |
| **D9.** Caddy como proxy con HTTPS automático | Nginx con certbot; Node con el certificado directo | Caddy saca y renueva el certificado solo, con un `Caddyfile` de pocas líneas. Android exige HTTPS en release, y el webhook de Telegram también. |
| **D10.** Dominio `<ip>.sslip.io` | DuckDNS; un dominio comprado | No necesita cuenta ni costo, y Let's Encrypt lo acepta. Si la IP cambia, solo cambian el dominio, `eas.json` y el webhook. La IP pública estática de Azure es gratis y evita ese cambio. |
| **D11.** Apilar los botones del panel desde 110 % de letra (umbral 1.05) | Medir el texto con `onTextLayout`; `adjustsFontSizeToFit` | Es el cambio más chico y usa el diseño de letra grande ya aprobado en Figma. Achicar la letra va contra la accesibilidad. Si a 100 % "Ver 202 actividades" no cabe en el S9+, se cambia a medir el texto (R5). |

## Riesgos

- **R1. Borrado en producción.** La migración del servidor borra datos reales. Mitigación: se cuenta con un `SELECT` antes, el usuario confirma, y se respalda la base desde el panel de Supabase.
- **R2. Alerta ya enviada.** Una actividad con GPS impreciso durante mucho tiempo puede disparar la alerta de inactividad antes de descartarse. Al descartarla, `finish` sale como hoy y los contactos reciben "ya terminó" (spec 008, CA-22). CA-23 se cumple para avisos posteriores al descarte. Se anota como caso en `tasks.md`.
- **R3. Borrar algo ya subido.** Si una actividad se subió entre el cierre y el descarte, no debe borrarse solo en el teléfono. `discardActivity` no borra si tiene `server_id`. Además, una actividad corta no se sube, porque el servidor la rechaza.
- **R4. Crédito y regiones de Azure.** La suscripción solo permite cinco regiones y puede no tener `Standard_B1s` en la elegida. Mitigación: se usa la otra región permitida o `Standard_B2ats_v2`, también gratis. Si el crédito o los 12 meses se acaban antes de la demo, la suscripción se desactiva: se revisa el saldo en el portal antes de la entrega.
- **R5. "Ver N actividades" a 100 %.** Puede seguir partiéndose con números de tres cifras. Se mide en el S9+ y, si pasa, se aplica la alternativa de D11.
- **R6. Logo cuadrado.** Si el logo cuadrado no está en Figma o no sirve como silueta para la notificación, se pide al usuario antes de improvisar un diseño (P10).
- **R7. Cola gratis de EAS.** El plan gratis de EAS pone los builds en una cola que puede tardar. Se compila con tiempo antes de la demo.
- **R8. Cambio de esquema del development build.** Con `exp+sendabc`, el development build instalado deja de abrir el esquema viejo. Hay que regenerarlo (`expo prebuild --clean`) y actualizar las notas de los casos manuales.
