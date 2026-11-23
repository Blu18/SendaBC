# 012 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de `frontend/lib/` sin imports de React Native incluyen sus pruebas Vitest (constitución 6.1).

Las tareas marcadas **(usuario)** necesitan una cuenta o un acceso que solo tiene el usuario: Oracle Cloud, Expo, el respaldo de Supabase y el Telegram del contacto. Claude prepara los archivos y los comandos y el usuario los ejecuta o los aprueba.

**Antes de borrar datos reales (T17) se detiene el trabajo:** se muestra el resultado del `SELECT` y el usuario confirma (plan, R1).

## Antes de empezar

- Rama `012-entrega` desde `master`, con la 015 fusionada (constitución 8.2). Si la 015 todavía no está en `master`, la rama sale del final de `015-filtros-y-ajustes`.
- **(usuario)** Tener cuentas en Oracle Cloud (pide tarjeta, no cobra) y en Expo, y el bot de Telegram de producción con su token. El bot de producción es distinto del de desarrollo (spec 008, plan D12).
- Sesión de Figma conectada al MCP, para T11.

## Fase A — Actividades con menos de 3 puntos válidos

- [ ] T1 — `backend/src/activity/distancia.ts`: `MIN_PUNTOS_VALIDOS = 3` y `contarPuntosValidos(puntos)` con `isAccurate`. Casos en `distancia.spec.ts`: 0, 2 y 3 puntos válidos, 3 puntos con 1 impreciso y precisión `null` (plan D1). (CA-26)
- [ ] T2 — `backend/src/activity/activity-validation.ts`: `reglasExtra` rechaza con "La actividad necesita al menos 3 puntos con buena precisión para guardarse". Se actualiza el comentario de `activity-upload.dto.ts`. Casos en `activity-validation.spec.ts`. (CA-26)
- [ ] T3 — e2e de `POST /activities/sync`: una actividad con 2 puntos válidos sale rechazada y no se guarda nada, ni actividad ni puntos. Se ajustan a 3 puntos válidos los e2e que hoy suben actividades sin puntos. (CA-26)
- [ ] T4 — Migración de datos `backend/prisma/migrations/20261123000000_borrar_actividades_cortas/migration.sql`: borra las actividades con menos de 3 puntos con `"accuracyMeters" IS NULL OR "accuracyMeters" <= 20`. Va acompañada de `backend/prisma/consultas/actividades_cortas.sql`, el mismo criterio como `SELECT` con cuenta y fecha, para T17. Se prueba en local o en la base de pruebas: las actividades cortas se borran, las de 3 puntos válidos quedan y una ruta publicada desde una actividad corta queda con `sourceActivityId` en `NULL`. **No se aplica en Supabase todavía.** (CA-25)
- [ ] T5 — `frontend/lib/metrics/validPoints.ts`: `MIN_VALID_POINTS`, `countValidPoints(points)` y `debeGuardarse(n)`, con `validPoints.test.ts`. Repite los casos de T1, como `oldPoints.test.ts` (plan D1). (CA-17, CA-20, CA-22)
- [ ] T6 — `frontend/lib/db/activities.ts`:
  - `countValidPoints(localId)`: un `COUNT` con `MAX_ACCURACY_M`.
  - `discardActivity(localId)`: no borra si la actividad tiene `server_id` (plan R3).
  - `closeOrphanActivities()`: también devuelve los `local_id` que cerró.

  Pruebas en `activities.test.ts`:
  - el conteo con puntos imprecisos y con precisión `null`;
  - el descarte borra puntos, lecturas del barómetro y sesión de seguridad, pero no `safety_outbox`;
  - con `server_id` no borra. (CA-19, CA-22)
- [ ] T7 — SQLite **v8** en `frontend/lib/db/schema.ts`: borra una vez las actividades con `status != 'RECORDING'` y menos de 3 puntos válidos, incluidas las `SYNCED`. Pruebas en `schema.test.ts`: borra las cortas, conserva las de 3 válidos y las que están grabando, y no vuelve a correr en v8 (plan D4). (CA-25)
- [ ] T8 — `frontend/hooks/activity/activityTracker.hook.ts`:
  - `stop({ descartar })`: cierra, encola el fin de la sesión con `sessionActions.terminar`, descarta y vuelve a `idle`, sin métricas ni sincronización.
  - `cerrarActividad`: si la actividad tiene menos de 3 puntos válidos, descarta después de `terminar`. Si no, sigue como hoy (plan D3). (CA-18, CA-19, CA-21, CA-23)
- [ ] T9 — `frontend/lib/safety/sessionActions.ts`, `cerrarHuerfanas`: cerrar, terminar las sesiones y después descartar las cortas, sin aviso. Pruebas en `sessionActions.test.ts`:
  - una huérfana corta se descarta **después** de encolar `finish` (D3);
  - una huérfana de 3 puntos válidos queda en `PENDING_SYNC`;
  - el caso del fallo al detener: la actividad queda en `RECORDING` y se resuelve al abrir la app. (CA-22, CA-23, CA-24)
- [ ] T10 — `frontend/lib/activity/closingMessages.ts` y `frontend/pages/activity/activityPage.tsx`:
  - `handleStop` cuenta los puntos válidos. Con menos de 3 pregunta "Seguir grabando" o "Terminar sin guardar"; si se elige terminar, la pantalla queda en "Nueva actividad". La pregunta de la alerta activa va primero, como hoy.
  - `usePreventRemove` usa el texto que avisa que la actividad no se guardará cuando tiene menos de 3 puntos válidos. (CA-17, CA-18, CA-20, CA-21)

## Fase B — Nombre, ícono, arranque y ajuste del panel

- [ ] T11 — Exportar de Figma ("SendaBC — Diseño", página de identidad de la 009) el logo cuadrado. Salen estos archivos:
  - `frontend/assets/icon.png` (1024 px);
  - `adaptive-icon.png` (logo dentro del 66 % central);
  - `adaptive-icon-monochrome.png`;
  - `notification-icon.png` (silueta blanca de 96 px con fondo transparente);
  - `splash-icon.png` y `splash-icon-dark.png`.

  **Si el logo cuadrado no existe o no sirve como silueta, se detiene y se pregunta al usuario** (plan R6). (CA-30, CA-31, CA-32)
- [ ] T12 — `frontend/app.json`:
  - `name` "SendaBC", `slug` "sendabc" y `android.versionCode` 1;
  - `adaptiveIcon` con `monochromeImage` y el `backgroundColor` de marca;
  - opción `icon` del plugin `expo-notifications`;
  - `npx expo install expo-splash-screen` y su plugin con la variante `dark`, y se quita la clave `splash`.

  Antes se revisan las opciones en la documentación de SDK 57. Después: `npx expo prebuild --platform android --clean` y comprobar que `strings.xml` dice `SendaBC` y que no queda "frontend" visible (plan D5, D6, R8). (CA-29, CA-30, CA-31, CA-32)
- [ ] T13 — `frontend/components/activity/ActivityFiltersSheet.tsx`: `STACK_FONT_SCALE` pasa a 1.1. Hay que medir a 100 % con "Ver 202 actividades" en el S9+. Si se parte, se cambia a medir el texto (plan D11, R5). (CA-28)

## Fase C — Despliegue

- [ ] T14 — En `backend/deploy/`:
  - `sendabc-api.service` (systemd, `Restart=always`, `EnvironmentFile=/etc/sendabc/api.env`);
  - `Caddyfile` (proxy de `https://<dominio>` a `localhost:PORT`);
  - `actualizar.sh` (`git pull`, `npm ci`, `npm run build`, `npx prisma migrate deploy`, reinicio);
  - `api.env.ejemplo` con los nombres de las variables y valores falsos (plan D8, D9). (CA-3, CA-9)
- [ ] T15 — **(usuario, con Claude guiando)** Crear la máquina A1 de Oracle (Ubuntu LTS, 1 OCPU, 6 GB) y reservar su IP pública. Abrir 80 y 443 en la lista de seguridad y en `iptables`. Instalar Node 24 y Caddy, clonar el repositorio, crear `/etc/sendabc/api.env` y hacer el primer despliegue con `actualizar.sh`. Comprobar `https://<ip-con-guiones>.sslip.io` desde fuera (plan D10, R4). (CA-9)
- [ ] T16 — **(usuario)** Registrar el webhook del bot de producción con `setWebhook` y `TELEGRAM_WEBHOOK_SECRET`. Vincular a un contacto del equipo con una invitación desde la app (spec 008). (CA-10, CA-27)
- [ ] T17 — **Detenerse antes:** correr en Supabase `consultas/actividades_cortas.sql` y mostrar al usuario cuántas actividades se borran y de qué cuentas. **(usuario)** Respaldar la base desde el panel de Supabase y confirmar. Después, `npx prisma migrate deploy` aplica T4 (plan R1). (CA-25)
- [ ] T18 — Base recreable: **(usuario)** crear un proyecto vacío de Supabase. Luego `prisma migrate deploy` y `npm run test:e2e` contra él (en serie, por el fallo intermitente en paralelo de la 011). Anotar el resultado y borrar el proyecto. (CA-11)
- [ ] T19 — `backend/postman/SendaBC.produccion.postman_environment.json` con `baseUrl` del backend publicado y sin secretos. Correr la colección completa contra producción y anotar el resultado. (CA-12)

## Fase D — Build de entrega

- [ ] T20 — `frontend/eas.json` con el perfil `entrega`: `buildType: "apk"`, `distribution: "internal"` y `EXPO_PUBLIC_BACKEND_IP` del dominio publicado, sin `EXPO_PUBLIC_BATTERY_TEST` ni `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES`. **(usuario)** `eas login`, `eas init` (agrega `projectId` a `app.json`) y `EXPO_PUBLIC_MAPBOX_TOKEN` como variable de entorno del proyecto en EAS (plan D7). (CA-7)
- [ ] T21 — `eas build -p android --profile entrega`. Descargar el APK como `SendaBC-1.0.0.apk` e instalarlo en el S9+ después de desinstalar el development build (plan R7, R8). (CA-6, CA-7, CA-8)

## Fase E — Documentación y demo

- [ ] T22 — `README.md` en la raíz con el contenido del plan, y `backend/README.md` pasa a ser un enlace a él. (CA-1, CA-2, CA-3)
- [ ] T23 — `docs/manual.md` con una sección por función y capturas del APK de entrega en `docs/capturas/`. Incluye el uso sin conexión, la regla de las actividades cortas y la limitación de F5. (CA-4, CA-5, CA-16)
- [ ] T24 — `docs/demo.md`: guion, preparación y plan B sin red. Preparar la cuenta de la demo:
  - **(usuario)** una actividad real grabada antes;
  - actividades de relleno con el GPS simulado del emulador, recuperadas en el S9+;
  - una ruta publicada cerca del lugar;
  - el contacto vinculado de T16. (CA-13, CA-14, CA-27)
- [ ] T25 — Ensayar el guion completo una vez con el APK de entrega y anotar la duración y lo que falló. (CA-8, CA-13)

## Fase F — Pendientes de specs anteriores

- [ ] T26 — Correr con el APK de entrega los casos que pasaron a esta spec y anotar el resultado en el `tasks.md` de cada spec de origen:
  - 014: M8, M12 y los pasos 3 y 5 de M5;
  - 015: el recorrido con TalkBack de M8, el paso 4 de M3 y el paso 5 de M10;
  - 011: la prueba de batería. (CA-15)
- [ ] T27 — Observar y anotar:
  - el cierre de Fabric al arrancar (015);
  - P-B y P-E en la prueba de campo (013);
  - la caminata de F5 con la pantalla bloqueada (011).

  Cada uno queda como corregido o como limitación conocida. F5 queda como limitación en la 011 y en el manual. Cada spec de origen actualiza su estado. (CA-16)

## Cierre

- [ ] T28 — Correr los casos manuales de esta spec y llenar la tabla de verificación. Pasar la spec a `Implementada` (o `Implementada con pendientes`) y actualizar `roadmap.md`. Actualizar la nota de los casos manuales en la memoria: el esquema pasa a `exp+sendabc` y el backend publicado.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | M1 | Manual | Pendiente |
| CA-2 | M1 | Manual | Pendiente |
| CA-3 | M1 (búsqueda de secretos) | Manual | Pendiente |
| CA-4 | M2 | Manual | Pendiente |
| CA-5 | M2 | Manual | Pendiente |
| CA-6 | M3 | Manual (S9+) | Pendiente |
| CA-7 | M4 | Manual (S9+) | Pendiente |
| CA-8 | M5 | Manual (S9+) | Pendiente |
| CA-9 | M6 | Manual | Pendiente |
| CA-10 | M7 | Manual (S9+) | Pendiente |
| CA-11 | M8 (`npm run test:e2e` contra la base nueva) | Manual + automatizada | Pendiente |
| CA-12 | M9 (colección de Postman) | Manual | Pendiente |
| CA-13 | M5 | Manual (S9+) | Pendiente |
| CA-14 | M10 | Manual (S9+) | Pendiente |
| CA-15 | M11 | Manual (S9+) | Pendiente |
| CA-16 | M11 | Manual (S9+) | Pendiente |
| CA-17 | M12; `validPoints.test.ts` | Manual + automatizada | Pendiente |
| CA-18 | M12 | Manual (emulador) | Pendiente |
| CA-19 | M12; `activities.test.ts` › descarte | Manual + automatizada | Pendiente |
| CA-20 | M13 | Manual (emulador) | Pendiente |
| CA-21 | M14 | Manual (emulador) | Pendiente |
| CA-22 | M15; `sessionActions.test.ts` › huérfanas cortas | Manual + automatizada | Pendiente |
| CA-23 | `sessionActions.test.ts` › `finish` antes del descarte; M12 paso 5 | Automatizada + manual | Pendiente |
| CA-24 | `sessionActions.test.ts` › fallo al detener | Automatizada | Pendiente |
| CA-25 | `schema.test.ts` › v8; T4 en la base de pruebas; M16 | Automatizada + manual | Pendiente |
| CA-26 | `distancia.spec.ts`, `activity-validation.spec.ts` y e2e de sync | Automatizada | Pendiente |
| CA-27 | M7 | Manual (S9+) | Pendiente |
| CA-28 | M18 | Manual (S9+) | Pendiente |
| CA-29 | M3 | Manual (S9+) | Pendiente |
| CA-30 | M3 | Manual (S9+) | Pendiente |
| CA-31 | M17 | Manual (S9+) | Pendiente |
| CA-32 | M3 | Manual (S9+) | Pendiente |

Todos los `CA-x` de la spec están cubiertos por al menos una tarea y una forma de verificarse.

### Casos manuales

**M1 — README desde cero (CA-1, CA-2, CA-3)**
1. Clonar el repositorio en una carpeta nueva, sin `node_modules`, `.env` ni `android/`.
2. Seguir solo el README hasta tener el backend en `localhost:3000` contra una base de pruebas y la app abierta en el emulador.
3. Revisar que el README tiene todas las secciones de CA-2.
4. Buscar secretos en el repositorio: `git grep -nE "eyJ|sk\.|pk\.ey|postgres(ql)?://[^<]|[0-9]{8,}:[A-Za-z0-9_-]{30,}"` y revisar los `.env*` versionados.
- **Esperado:** se levanta todo sin pasos fuera del README. Cada variable aparece con su nombre, su uso y un valor falso. La búsqueda no encuentra secretos reales.

**M2 — Manual (CA-4, CA-5)**
1. Abrir `docs/manual.md` desde el enlace del README.
2. Recorrer la lista de funciones de CA-4 y comparar cada captura con el APK de entrega.
- **Esperado:** cada función de CA-4 tiene su sección con captura actual. Se explica el uso sin conexión y que una actividad con muy poco recorrido no se guarda.

**M3 — Instalar el APK, nombre, ícono y arranque (CA-6, CA-29, CA-30, CA-32)**
1. En el S9+, desinstalar el development build e instalar `SendaBC-1.0.0.apk` con el archivo, sin `adb install`.
2. Ver la app en el lanzador, en las apps recientes, en Ajustes > Aplicaciones y en el aviso del permiso de ubicación.
3. Cambiar la forma del ícono en el lanzador, si el teléfono lo permite, y probar con el tema claro y el oscuro.
4. Abrir la app con el teléfono en modo claro y después en modo oscuro.
- **Esperado:** se instala sin herramientas de desarrollo. Se llama "SendaBC" en todos esos lugares y nunca "frontend". El ícono es el logo cuadrado, completo en cada forma. La pantalla de arranque muestra el logo con fondo claro u oscuro según el modo.

**M4 — El APK usa el backend publicado (CA-7)**
1. Con el APK, iniciar sesión y abrir Explorar.
2. Revisar en la máquina virtual `journalctl -u sendabc-api` y ver que llegan las peticiones.
3. Apagar la computadora del equipo (sin Metro, túnel ni backend local) y repetir el paso 1.
4. Grabar una actividad y mirar que no aparezca el modo de medición de batería.
- **Esperado:** todo funciona solo con el backend publicado por HTTPS, sin el túnel y sin el modo de batería.

**M5 — Flujo de la demo con el APK (CA-8, CA-13)**
1. Seguir `docs/demo.md` completo en el S9+ con el APK de entrega.
2. Incluir el mapa de grabación, Explorar en 2D y 3D, y un mapa descargado en modo avión.
3. Anotar la duración.
- **Esperado:** el guion se completa sin errores y cada paso se ve como en el manual.

**M6 — El backend no se duerme (CA-9)**
1. Dejar el backend sin peticiones al menos 3 horas.
2. Abrir la app y entrar a Explorar, midiendo el tiempo de respuesta.
3. Reiniciar la máquina virtual (`sudo reboot`) y repetir el paso 2 sin entrar por SSH.
- **Esperado:** responde con normalidad, sin la espera de un arranque en frío. Después del reinicio vuelve solo.

**M7 — Hora de regreso con el bot real (CA-10, CA-27)**
1. Con el contacto del equipo vinculado al bot de producción, iniciar una actividad con la hora de regreso más cercana posible.
2. Bloquear el teléfono, sin tocar la app, y apagar las computadoras del equipo.
3. Esperar la hora de regreso más el margen de la spec 008 (RN-10).
- **Esperado:** el contacto recibe el aviso en Telegram, con la última ubicación, dentro del margen y desde el bot real.

**M8 — Base recreable (CA-11)**
1. Seguir T18 contra el proyecto vacío de Supabase.
- **Esperado:** `prisma migrate deploy` aplica todas las migraciones sin error, incluidos los triggers y funciones, y `npm run test:e2e` en serie pasa completo.

**M9 — Postman contra producción (CA-12)**
1. Importar la colección y el entorno de producción y correr la colección completa.
- **Esperado:** todas las peticiones pasan sus pruebas.

**M10 — Datos de la demo (CA-14)**
1. Con la cuenta de la demo en el APK, ver Inicio, Mis actividades con filtros y Explorar desde el lugar de la demo.
- **Esperado:** hay una actividad real con su recorrido, actividades suficientes para que los filtros cambien la lista y al menos una ruta publicada cerca.

**M11 — Pendientes de specs anteriores (CA-15, CA-16)**
1. Correr T26 y T27.
- **Esperado:** cada caso y cada observación tiene su resultado anotado en el `tasks.md` de su spec, y esa spec tiene su estado actualizado.

**M12 — "Detener" con menos de 3 puntos válidos (CA-17, CA-18, CA-19, CA-23)**
1. En el emulador, con un contacto activo (modo log) y la hora de regreso puesta, iniciar una actividad sin mover el GPS.
2. Presionar "Detener actividad" y elegir "Seguir grabando".
3. Presionar otra vez "Detener actividad" y elegir "Terminar sin guardar".
4. Abrir Mis actividades e Inicio, y revisar que no queda pendiente de subir.
5. Esperar la hora de regreso más el margen y revisar el registro del backend.
6. Repetir el paso 3 con TalkBack activo.
- **Esperado:** la pregunta avisa que la actividad no se guardará. "Seguir grabando" deja el cronómetro corriendo. "Terminar sin guardar" deja la pantalla en "Nueva actividad", sin resumen. La actividad no aparece en ningún lado, ni en los totales de la semana. El servidor no genera alerta por ella. TalkBack lee la pregunta.

**M13 — "Detener" con 3 puntos válidos o más (CA-20)**
1. Iniciar una actividad y mover el GPS 0.0003 grados cada 5 s hasta tener al menos 3 puntos.
2. Presionar "Detener actividad".
- **Esperado:** no hay pregunta y se abre el resumen como hoy.

**M14 — Salir de la pantalla con menos de 3 puntos (CA-21)**
1. Iniciar una actividad sin mover el GPS y tocar la flecha de atrás.
2. Elegir terminar.
- **Esperado:** la pregunta dice que la actividad no se guardará. Al terminar no aparece en Mis actividades ni en Inicio.

**M15 — Cierre al abrir la app (CA-22)**
1. Iniciar una actividad sin mover el GPS y cerrar la app con `am force-stop`.
2. Abrir la app.
3. Repetir con una actividad de 3 puntos válidos o más.
- **Esperado:** en el primer caso no hay aviso y la actividad no aparece. En el segundo, la actividad aparece cerrada, como hoy. En los dos, no queda ninguna actividad grabando.

**M16 — Borrado único al instalar la versión de entrega (CA-25)**
1. En un teléfono con actividades de prueba de menos de 3 puntos válidos, tanto pendientes como subidas, instalar la versión con la v8.
2. Abrir Mis actividades e Inicio.
- **Esperado:** las actividades cortas ya no aparecen ni cuentan en los totales. Las demás siguen igual.

**M17 — Ícono de las notificaciones (CA-31)**
1. Con el APK, iniciar una actividad con un contacto activo y bloquear la pantalla.
2. Ver la barra de estado y la notificación del servicio de grabación.
3. Provocar la pregunta "¿Estás bien?" por inactividad.
- **Esperado:** las dos notificaciones muestran en la barra de estado la silueta de SendaBC, no un cuadro vacío.

**M18 — "Ver N actividades" (CA-28)**
1. En el S9+, con la letra del sistema al 110 %, abrir la app y el panel de filtros de Mis actividades con más de 100 actividades.
2. Repetir con la letra al 100 %.
- **Esperado:** a 110 % los botones van uno debajo del otro y "Ver N actividades" se lee en un solo renglón. A 100 % el texto tampoco se parte.

## Commits propuestos

1. `feat(012): no guardar actividades con menos de 3 puntos válidos`: T1, T2, T4 a T10.
2. `test(012): pruebas e2e de la regla de 3 puntos válidos`: T3.
3. `feat(012): nombre SendaBC, ícono y pantalla de arranque`: T11 y T12.
4. `fix(012): apilar los botones del panel de filtros desde 110 %`: T13.
5. `chore(012): despliegue en Oracle y perfil de EAS para el APK`: T14, T19 y T20.
6. `docs(012): README, manual y guion de la demo`: T22 a T24.
7. `docs(012): resultados de los casos y cierre de la spec`: T25 a T28, más las notas en los `tasks.md` de las specs 011, 013, 014 y 015.

T15 a T18 y T21 se hacen fuera del repositorio. Sus resultados se anotan en este archivo con el commit 7.

## Resultado de los casos manuales

(Se llena al correrlos.)

## Pendientes conocidos

(Se llena al cerrar la spec.)
