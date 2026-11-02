# 008 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de backend y de `lib/safety` incluyen sus pruebas Vitest (constitución 6.1).

## Antes de empezar (lo hace el usuario)

- Crear un **bot de desarrollo** con @BotFather en Telegram y poner su token y su nombre de usuario en `backend/.env` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`). Esos valores no pasan por el chat ni por el repositorio (constitución 3.6).
- Tener Telegram en un teléfono para hacer de contacto en los casos manuales.

## Backend

- [x] T1 — Migración `20261022000000_safety_module`:
  - en `schema.prisma`: `EmergencyContact`, `SafetySession`, `EmergencyAlert` rehecha, `AlertMessage` y los enums `ContactStatus`, `AlertStatus`, `AlertReason`, `MessageKind` y `MessageStatus`;
  - quitar `users.emergencyContact*`;
  - índice único parcial de una alerta `ACTIVE` por sesión, escrito a mano.

  Antes de `migrate deploy`, confirmar con una consulta de solo lectura que `emergency_alerts` sigue vacía y que ningún usuario tiene contacto. Después, que `prisma migrate diff` contra la base queda vacío. (CA-1, CA-18, CA-27)
- [x] T2 — Módulo `telegram`, parte de envío:
  - la interfaz `TelegramSender` (`sendMessage` en HTML y `sendLocation`);
  - `log.sender.ts`, que solo registra y guarda lo enviado para las pruebas;
  - `bot-api.sender.ts`, con `fetch`, límite de 10 s y `403` como `blocked`;
  - selección por `TELEGRAM_MODE` (`log` por omisión fuera de producción);
  - variables nuevas en `backend/.env.example`.

  Pruebas con `fetch` simulado: método, ruta, body y token; `403` → `blocked`; sin red y tiempo agotado. (CA-6, CA-7, CA-14)
- [x] T3 — `safety/messages.ts`, puro. Los siete textos del plan: bienvenida, prueba, alerta por inactividad o SOS, no regresó, ubicación, cancelada y terminó. Pruebas:
  - cada texto lleva lo que pide RN-6, en español y sin el correo;
  - el escape de HTML en el nombre del usuario y del contacto;
  - las horas en `America/Tijuana`;
  - el enlace de Google Maps con lat, lng;
  - el aviso de "puede deberse a falta de señal" solo en el de hora de regreso.

  (CA-5, CA-6, CA-14, CA-18, CA-22, CA-25)
- [x] T4 — Módulo `emergency-contact`:
  - DTOs (`name` de 1 a 40 caracteres sin los espacios de los extremos);
  - `invitation.ts` (token de 32 bytes en base64url y enlace `t.me/<bot>?start=`);
  - servicio: listar, crear (máximo tres, en una transacción), editar el nombre, borrar (la invitación deja de servir) y mensaje de prueba (`409` si no está activo, `429` a menos de 1 min del anterior);
  - controlador con `JwtAuthGuard`.

  Pruebas con Prisma simulado y mensajes en español. (CA-1, CA-2, CA-3, CA-4, CA-6, CA-28)
- [x] T5 — Módulo `telegram`, parte de recepción:
  - `updates.service.ts`: `/start <token>` válido deja el contacto `ACTIVE` con su `chat_id` y nombre, borra el token y manda la bienvenida; un token inválido, o la misma cuenta de Telegram ya vinculada con ese usuario (RN-3), responde que la invitación no es válida; otro mensaje recibe una explicación breve;
  - `telegram.controller.ts`, el webhook, con un guard que compara el secreto en tiempo constante (`401` si no coincide);
  - `polling.service.ts` con `getUpdates`, solo en `TELEGRAM_MODE=polling`.

  Pruebas de cada caso. (CA-5, CA-7)
- [x] T6 — `SessionsService` y DTOs:
  - `PUT` crea o actualiza la sesión (idempotente por `clientGeneratedId`; `400` si `returnBy` ≤ `startedAt`; `404` si es de otra cuenta);
  - `GET`;
  - `locations` guarda la más reciente (`409` si la sesión terminó);
  - `finish`.

  Pruebas con Prisma simulado. (CA-19, CA-20, CA-23, CA-28)
- [x] T7 — `AlertsService`:
  - crear: idempotente por `clientAlertId`; si ya hay una activa, la devuelve sin enviar nada; manda el texto y el pin a cada contacto activo y guarda cada envío en `alert_messages`;
  - cancelar: `409` si ya no está activa; manda "estoy bien";
  - reenviar la ubicación al recibir una (15 min o 200 m desde el último reenvío, RN-11);
  - al terminar la sesión, resolver una alerta por hora de regreso y mandar "terminó";
  - si un envío responde `blocked`, el contacto pasa a `UNREACHABLE` con una invitación nueva.

  Pruebas de cada regla. (CA-7, CA-14, CA-16, CA-17, CA-22, CA-24, CA-25, CA-27)
- [x] T8 — `return-time.job.ts`: `@nestjs/schedule` (`ScheduleModule.forRoot`) y `@Cron` cada minuto. Busca las sesiones sin terminar con `returnBy + 30 min < now()` y sin alerta activa, y crea una alerta `RETURN_TIME` con la última ubicación. Pruebas con reloj simulado:
  - a los 29 min no avisa y a los 31 sí;
  - una sesión terminada no avisa;
  - una que cambió su hora de regreso usa la nueva;
  - dos ejecuciones no duplican la alerta (índice único).

  (CA-18, CA-19)
- [x] T9 — `SafetyController` y conexión en `AppModule` (`ScheduleModule`, `TelegramModule`, `EmergencyContactModule` y `SafetyModule`). Pruebas del controlador: el guard en toda la clase, el usuario del token en cada acción, `ParseUUIDPipe` con `404`. (CA-28)
- [x] T10 — `test/safety.e2e-spec.ts` contra la base, con `TELEGRAM_MODE=log`. Usa dos usuarios de prueba y al final borra sus sesiones, contactos y usuarios. Casos:
  - crear tres contactos; el cuarto da `409`; un nombre de 41 caracteres da `400` (CA-1, CA-2);
  - aceptar la invitación con un update simulado al webhook: con el secreto pasa a `ACTIVE` y registra la bienvenida; sin el secreto da `401`; el mismo token otra vez no vincula (CA-5);
  - la prueba a un pendiente da `409`; a un activo, `200` y queda registrada; dos seguidas dan `429` (CA-6);
  - el otro usuario no ve ni cambia esos contactos: `404` (CA-4, CA-28);
  - sesión: `PUT` dos veces es idempotente; ubicaciones; una alerta por inactividad avisa a los activos; repetirla no envía otra (CA-14, CA-27);
  - una ubicación a más de 200 m con la alerta activa se reenvía; cancelar manda "estoy bien" (CA-16, CA-25);
  - hora de regreso en el pasado más la tarea ejecutada a mano: crea la alerta `RETURN_TIME`; al terminar la sesión, la resuelve y manda "terminó" (CA-18, CA-22);
  - un envío `blocked` deja al contacto `UNREACHABLE` (CA-7);
  - sin token, `401` en todos los endpoints de la app (CA-28).
- [x] T11 — Colección de Postman: carpeta "Seguridad (spec 008)" con contactos, sesión, ubicación, alerta, cancelar, terminar, un `409` y un `429`. Validarla contra la API local (constitución 6.3). Probar el bot de desarrollo real en `TELEGRAM_MODE=polling`: aceptar una invitación y recibir la prueba en Telegram.

  Validada el 2026-10-22 contra la API local con `TELEGRAM_MODE=log` y `TELEGRAM_WEBHOOK_SECRET` igual a la variable `webhookSecret`: la colección completa, en orden, pasa 92/92 pruebas (23 peticiones nuevas), y otra vez 92/92 al repetirla. La carpeta quita al inicio los contactos que hayan quedado y activa el contacto con un "Iniciar" simulado por el webhook. Se corrió con un ejecutor en Node, como en la 007 (ahora también con `pm.sendRequest`), porque `newman` no está instalado; conviene correrla también en Postman.

  Bot real, el mismo día, con `@senda_bc_bot` en `TELEGRAM_MODE=polling`: el usuario abrió la invitación en su teléfono y tocó "Iniciar"; recibió la bienvenida, el contacto pasó a "Activo" con su nombre de Telegram, y el mensaje de prueba (`200 SENT`) le llegó a Telegram. Después se quitó el contacto de prueba de la cuenta de Postman.

## Frontend

- [x] T12 — Configuración nativa:
  - `npx expo install expo-task-manager expo-notifications`;
  - en `app.json`: el plugin de `expo-location` con `locationAlwaysAndWhenInUsePermission`, segundo plano en Android e iOS y servicio en primer plano; los plugins de `expo-notifications` y `expo-task-manager`, con textos de propósito en español;
  - **generar un development build nuevo** (`expo run:android` o EAS) e instalarlo en el emulador.

  (CA-10, CA-11)

  Hecho el 2026-10-22: `expo-task-manager` ~57.0.21 y `expo-notifications` ~57.0.24. El color de las notificaciones es el `alert` del tema (`#C1432A`, solo seguridad). El texto en segundo plano también se puso en `locationAlwaysPermission`, porque si no iOS queda con el texto en inglés. No se agregó `SCHEDULE_EXACT_ALARM`: Android 14 lo niega por omisión, Google Play lo restringe, y `expo-notifications` cae a una alarma inexacta sin fallar (lo resuelve T17). El build se generó con `expo prebuild --clean` y `expo run:android` con `JAVA_HOME` en el JDK 21 de `C:\Program Files\Android\openjdk`. La app carga en el emulador con los permisos nuevos declarados (`ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`), todavía sin conceder.
- [x] T13 — Lógica pura en `lib/safety/`, con pruebas Vitest:
  - `contacts.ts`: validación con los mismos casos que el DTO, etiquetas de estado y `contactosActivos`;
  - `inactivity.ts`: quieto 10 min → preguntar; 12 min → alertar; moverse más de 30 m reinicia; un punto con precisión mayor a 30 m no mueve el ancla; "Estoy bien" reinicia;
  - `returnTime.ts`: opciones, validación y "avisaría a las HH:MM";
  - `outbox.ts`: orden, combinar ubicaciones, qué se reintenta;
  - `messages.ts`.

  (CA-2, CA-8, CA-9, CA-11, CA-12, CA-13, CA-21, CA-23)
- [x] T14 — Datos y envío:
  - SQLite v5 (`safety_sessions`, `safety_detector`, `safety_outbox` y `emergency_contacts_cache`) con su migración en `schema.ts`;
  - `lib/safety/api.ts` (pruebas con `fetch` simulado como `lib/routes/api.test.ts`);
  - `lib/safety/safetySync.ts`: intenta al encolar, reintenta cada 30 s con red, se detiene con `401` y marca la sesión como recibida. Pruebas de la lógica con dependencias simuladas, como `syncEngine.test.ts`.

  (CA-15, CA-20, CA-23)
- [x] T15 — Contactos en la app:
  - `hooks/safety/useEmergencyContacts.ts`, con copia en SQLite;
  - `pages/safety/emergencyContactsPage.tsx` y `components/safety/ContactForm.tsx`: estado de cada contacto; agregar, editar y quitar con confirmación; "Compartir invitación" con `Share`; "Enviar mensaje de prueba" con su resultado; recargar al volver a la pantalla; aviso del 911;
  - botón "Seguridad" en `MainPage` y la ruta `EmergencyContacts` en `App.tsx`.

  (CA-1, CA-2, CA-3, CA-4, CA-5, CA-6, CA-7)

  Probado el 2026-10-26 en el emulador, con el backend local en `TELEGRAM_MODE=log` y la aceptación simulada por el webhook: nombre vacío y de 41 caracteres (mensaje junto al campo); agregar, con la invitación lista para compartir en la hoja del sistema; el contacto pasa a "Activo" al volver a la pantalla; prueba enviada y la segunda da el aviso del `429`; con tres contactos ya no deja agregar; editar y quitar con confirmación; sin red se muestra la copia del teléfono (la migración v5 corrió en el dispositivo). Se corrigió que, con el teclado abierto, el primer toque en "Agregar" solo cerraba el teclado (`keyboardShouldPersistTaps`). Falta M1 completo con el bot real y otro emulador (pasos 3 y 8).
- [x] T16 — Grabación en segundo plano:
  - `lib/safety/locationTask.ts`, con `defineTask` en `index.ts`: guarda puntos a 5 m o más del anterior, pasa cada punto por el detector y encola la ubicación cada 5 min (cada 1 min con alerta activa);
  - `activityTracker.hook.ts` elige el modo: con permiso en segundo plano, la tarea sin `keep-awake`; sin él, `watchPositionAsync` con `keep-awake` como hoy;
  - explicación antes de pedir el permiso;
  - la tarea se detiene al terminar o al salir de la grabación.

  (CA-10, CA-13, CA-20)

  Probado el 2026-10-26 en el emulador (development build de T12; hubo que reinstalarlo porque el emulador restauró un snapshot con el build anterior). Con un contacto activo, "Iniciar" explica el permiso antes de pedirlo. "Ahora no" graba con la pantalla encendida y el aviso de que la detección solo funciona con la app abierta. "Continuar" abre los ajustes de Android; con "Permitir todo el tiempo" graba con la tarea y, con la pantalla bloqueada, guardó los 4 puntos del GPS. Al detener o salir de la pantalla, el servicio se detiene. Pendiente para T17: sin el permiso de notificaciones (Android 13+), el servicio corre pero su notificación no se ve.
- [x] T17 — "¿Estás bien?":
  - `lib/safety/notifications.ts`: canal `seguridad`, categoría con "Estoy bien", programar y reprogramar como máximo una vez por minuto, y permiso de notificaciones;
  - `hooks/safety/useAreYouOk.ts` y `components/safety/AreYouOkModal.tsx` (cuenta regresiva, vibración, botón grande);
  - a los 12 min sin respuesta, encolar la alerta con la última ubicación.
  - En desarrollo, `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES` acorta los tiempos para los casos manuales; en producción se ignora.

  (CA-11, CA-12, CA-13, CA-14, CA-15)

  Hecho el 2026-10-29. Pruebas: `inactivity.test.ts` (umbrales de depuración), `recording.test.ts` (reinicio en la cola) y `alertActions.test.ts` (crear con la última ubicación, una activa a la vez, cancelar). En el emulador: la app carga con los módulos nuevos; al iniciar con un contacto activo pide el permiso de notificaciones y después el de segundo plano; con los dos, el servicio que graba publica su notificación, y al detener se quita. La pregunta y la alerta necesitan la sesión de seguridad, que se crea al iniciar en T18: M4 a M6 se corren después de T18.
- [x] T18 — Seguridad durante la actividad, en `activityPage.tsx`:
  - antes de iniciar, `SafetyCard` (activa con los nombres, o el aviso sin contactos activos) y `ReturnTimePicker`;
  - al iniciar, encolar la sesión;
  - durante la grabación: la hora de regreso con "enviada" o "pendiente de enviar" y la opción de cambiarla; el SOS de mantener presionado 2 s; el aviso de alerta activa con la hora, a quiénes se envió y "Cancelar alerta";
  - al detener: preguntar si se cancela la alerta activa, y avisar si se termina sin red con hora de regreso.

  (CA-8, CA-9, CA-17, CA-19, CA-21, CA-22, CA-23, CA-24, CA-25, CA-26)

  Hecho el 2026-10-29. `lib/safety/sessionActions.ts` crea la sesión al iniciar (con la actividad ya creada y antes de grabar, para que corra el detector), cambia la hora de regreso y encola `finish` al detener, al salir de la pantalla y al cerrar las actividades huérfanas al abrir la app. Pruebas: `sessionActions.test.ts` (iniciar, hora de regreso inválida, cambiar o quitar, terminar, huérfanas) y `messages.test.ts`. Pantalla: `SafetyCard`, `ReturnTimePicker` y `RecordingSafety` (hora de regreso enviada o pendiente, alerta activa con "Cancelar alerta" y SOS de 2 s).

  Probado el 2026-10-30 en el emulador (build del 2026-10-29), con el backend local en `TELEGRAM_MODE=log` (lo que recibiría el contacto se revisó en el registro del backend y en la base, no en un Telegram real) y `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES=1`. Pasaron:
  - **M3:** sin contactos activos, el aviso con "Configurar contactos" (abre "Seguridad") y el aviso del 911; con uno, "Seguridad activa: … a Mama Rosa" y la hora de regreso. Al iniciar pide el permiso de notificaciones y explica el de segundo plano; con "Ahora no" graba con el aviso de que la detección solo funciona con la app abierta; con "Permitir todo el tiempo" corre el servicio con la notificación "SendaBC está grabando tu actividad".
  - **M4:** con la app abierta, el modal con la cuenta regresiva, vibración y la notificación en el canal `seguridad` (importancia alta); con la pantalla apagada llega la notificación, y "Estoy bien" desde ella la quita y no crea alerta.
  - **M5:** sin responder, alerta `INACTIVITY_TIMEOUT` con el texto de RN-6; al abrir la app, "Alerta enviada a las HH:MM a Mama Rosa". Con la alerta activa, moverse más de 200 m reenvía la ubicación con el pin; al cancelar, el contacto recibe "está bien" y ya no recibe ubicaciones.
  - **M6:** en modo avión la alerta queda "pendiente de enviar"; al volver la red sale en 11 s con su hora original.
  - **M7:** un toque al SOS no hace nada; mantenerlo 2 s envía "pidió ayuda"; mantenerlo otra vez avisa que ya hay una alerta activa y no manda otro mensaje.
  - **M8:** iniciada en modo avión, "pendiente de enviar"; con red, "enviada". Con `startedAt` y `returnBy` adelantados en la base, la tarea avisa "no ha confirmado su regreso" con la última ubicación y su hora. Cambiar la hora con red deja en el servidor solo la nueva.
  - También: al detener con una alerta activa pregunta si se cancela (CA-26, de M9), y terminar con red resuelve la alerta por hora de regreso y avisa "terminó su actividad y está bien" (CA-22).

  Observaciones:
  - Una alerta por hora de regreso la crea el servidor y la app no la mostraba durante la grabación (CA-17). Corregido el mismo día: la app consulta la sesión al servidor y adopta su alerta (`sessionActions.test.ts`). Probado en el emulador: con la hora de regreso vencida en la base, la app muestra la alerta en menos de 30 s, "Cancelar alerta" la cancela en el servidor y el contacto recibe "está bien".
  - El sistema muestra la app como "frontend" (nombre de `app.json`) en el permiso de notificaciones y en las notificaciones.
  - Dos veces el primer toque en un diálogo no hizo nada ("OK" de "Ya hay una alerta activa" y la confirmación de "Cancelar alerta"); con el segundo funcionó y no volvió a pasar.
  - La ubicación de la alerta puede ser de antes del inicio (el último punto del GPS del emulador); el mensaje dice de qué hora es (RN-5).

## Documentación

- [x] T19 — Al cerrar: tabla de verificación, estado de la spec y `specs/roadmap.md`.

  Hecho el 2026-10-30. Pasan 382 pruebas unitarias y 72 e2e del backend y 448 de Vitest del frontend. En el emulador se corrieron también:
  - **M9:** al detener con una alerta activa pregunta si se cancela; con hora de regreso y en modo avión, al detener avisa "si tu teléfono no se conecta antes de las HH:MM…"; con la hora adelantada en la base, el contacto recibe "no ha confirmado su regreso" y, al quitar el modo avión, "terminó su actividad y está bien" con la hora real de fin.
  - **M10:** con permiso en segundo plano y la pantalla bloqueada, 5 min moviendo el GPS dejan 16 puntos en el resumen; después de detener no llega pregunta ni mensaje en 2.5 min (con los tiempos de depuración), y se quitan la notificación y el servicio.

  **M2**, el mismo día, con el bot real (`TELEGRAM_MODE=polling`) y Telegram en el teléfono del usuario: el contacto "Prueba M2" aceptó la invitación; con el bot bloqueado, el mensaje de prueba no se envió ("El contacto bloqueó a SendaBC o borró la conversación en Telegram") y el contacto quedó "No recibe mensajes" con una invitación nueva; al desbloquear y aceptarla, volvió a "Activo".

  **M1 paso 8**, el mismo día: se borraron los datos de la app en el emulador (`pm clear`, como un teléfono nuevo, sin la copia local de los contactos) y, al entrar con la misma cuenta, "Seguridad" mostró los mismos tres contactos con sus estados y nombres de Telegram, traídos del servidor.

  Los 28 CA quedan verificados. Los avisos de alerta se revisaron con `TELEGRAM_MODE=log`; con el bot real solo se probaron la invitación y el mensaje de prueba (T11).

## Cobertura

Los 28 CA están cubiertos por al menos una tarea.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | `emergency-contact.service.spec.ts` › límite de tres · e2e › cuarto contacto `409` · M1 | Ambas | Verificada |
| CA-2 | `create-emergency-contact.dto.spec.ts` · `contacts.test.ts` · e2e › nombre de 41 · M1 | Ambas | Verificada |
| CA-3 | `emergency-contact.service.spec.ts` › editar y borrar · M1 | Ambas | Verificada |
| CA-4 | e2e › contactos de otro usuario `404` | Automatizada | Verificada |
| CA-5 | `updates.service.spec.ts` · `messages.spec.ts` › bienvenida · e2e › webhook · M1 | Ambas | Verificada |
| CA-6 | `emergency-contact.service.spec.ts` › prueba `409` y `429` · e2e · M1 | Ambas | Verificada |
| CA-7 | `bot-api.sender.spec.ts` › `403` · `alerts.service.spec.ts` › `UNREACHABLE` · e2e · M2 | Ambas | Verificada |
| CA-8 | `contacts.test.ts` › `contactosActivos` · M3 | Ambas | Verificada |
| CA-9 | `contacts.test.ts` · M3 | Ambas | Verificada |
| CA-10 | M3 (permiso concedido y negado) · M10 | Manual | Verificada |
| CA-11 | `inactivity.test.ts` › preguntar a los 10 min · M4 | Ambas | Verificada |
| CA-12 | `inactivity.test.ts` › "Estoy bien" reinicia · M4 | Ambas | Verificada |
| CA-13 | `inactivity.test.ts` · M10 | Ambas | Verificada |
| CA-14 | `alerts.service.spec.ts` › crear · `messages.spec.ts` › alerta · e2e · M5 | Ambas | Verificada |
| CA-15 | `safetySync.test.ts` › sin red queda en la bandeja · M6 | Ambas | Verificada |
| CA-16 | `alerts.service.spec.ts` › reenvío 15 min / 200 m · e2e · M5 | Ambas | Verificada |
| CA-17 | `alerts.service.spec.ts` › entregas · `sessionActions.test.ts` › alerta del servidor · M5 · M8 | Ambas | Verificada |
| CA-18 | `return-time.job.spec.ts` · e2e › hora de regreso vencida · M8 | Ambas | Verificada |
| CA-19 | `return-time.job.spec.ts` › terminada y cambiada · `sessions.service.spec.ts` · M8 | Ambas | Verificada |
| CA-20 | `sessions.service.spec.ts` › ubicación más reciente · `outbox.test.ts` · M8 | Ambas | Verificada |
| CA-21 | `returnTime.test.ts` › "avisaría a las" · M9 | Ambas | Verificada |
| CA-22 | `alerts.service.spec.ts` › resolver al terminar · e2e · M9 | Ambas | Verificada |
| CA-23 | `safetySync.test.ts` › marca la sesión recibida · M8 | Ambas | Verificada |
| CA-24 | M7 | Manual | Verificada |
| CA-25 | `alerts.service.spec.ts` › cancelar · e2e · M5 | Ambas | Verificada |
| CA-26 | M9 | Manual | Verificada |
| CA-27 | `alerts.service.spec.ts` › una activa · e2e › repetir alerta · M7 | Ambas | Verificada |
| CA-28 | `safety.controller.spec.ts` › guard · e2e › `401` y `404` | Automatizada | Verificada |

### Casos manuales

En el emulador con el **development build nuevo** (T12), el backend local en `TELEGRAM_MODE=polling` con el bot de desarrollo, y Telegram en un teléfono que hace de contacto. Para no esperar los 10 minutos reales, `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES` acorta los tiempos (T17). Para la hora de regreso, un script de prueba adelanta `returnBy` en la base.

**M1 — Contactos e invitación**
1. Pestaña Seguridad. Agregar "Mamá" con el nombre vacío y luego con 41 caracteres. 2. Agregarlo con un nombre válido y compartir la invitación. 3. En el teléfono de prueba, abrir el enlace en Telegram y tocar "Iniciar". 4. Volver a la pestaña Seguridad. 5. "Enviar mensaje de prueba". 6. Agregar dos contactos más e intentar un cuarto. 7. Editar el nombre de uno y quitar otro. 8. Cerrar sesión y entrar en otro emulador.
- **Esperado:** (1) mensaje junto al campo, sin guardar. (2) "Pendiente de aceptar" y el menú de compartir del sistema. (3) el contacto recibe la bienvenida con mi nombre. (4) aparece "Activo". (5) llega la prueba y la app dice que se envió. (6) no deja agregar el cuarto. (7) los cambios se guardan. (8) se ven los mismos contactos.

**M2 — Contacto que bloquea al bot**
1. En Telegram, bloquear al bot desde el teléfono de prueba. 2. "Enviar mensaje de prueba". 3. Compartir de nuevo la invitación, desbloquear y aceptarla.
- **Esperado:** (2) falla y el contacto queda "No recibe mensajes". (3) vuelve a "Activo".

**M3 — Al iniciar una actividad**
1. Sin contactos activos, tocar "Empezar" en la pestaña Inicio. 2. Con un contacto activo, abrirla de nuevo. 3. Iniciar y negar el permiso en segundo plano. 4. Repetir y concederlo.
- **Esperado:** (1) aviso de que no se puede avisar a nadie, con "Configurar contactos", que abre "Seguridad" encima de la grabación (atrás regresa a la grabación), y se puede iniciar igual. (2) "Seguridad activa" con el nombre del contacto y la hora de regreso opcional. (3) explicación previa; graba con la pantalla encendida y avisa que la detección solo funciona con la app abierta. (4) graba con la notificación "SendaBC está grabando tu actividad".

**M4 — "¿Estás bien?"**
1. Con una actividad en curso y el GPS fijo, esperar el tiempo de inactividad con la app abierta y responder "Estoy bien". 2. Bloquear la pantalla y esperar de nuevo. 3. Responder desde la notificación.
- **Esperado:** (1) modal con cuenta regresiva, sonido y vibración; al responder, no se envía nada. (2) llega la notificación con la pantalla bloqueada. (3) se reinicia la detección; el contacto no recibe nada.

**M5 — Alerta por inactividad, ubicación y cancelación**
1. Dejar que la cuenta regresiva termine sin responder. 2. Abrir la app. 3. Mover el GPS más de 200 m. 4. "Cancelar alerta".
- **Esperado:** (1) el contacto recibe la alerta con nombre, motivo, hora, tipo, enlace y pin. (2) aviso de alerta activa con la hora y a quiénes. (3) el contacto recibe la ubicación nueva. (4) el contacto recibe "está bien" y ya no recibe ubicaciones.

**M6 — Alerta sin conexión**
1. Activar el modo avión y dejar que se genere una alerta. 2. Quitar el modo avión.
- **Esperado:** (1) la app muestra la alerta como pendiente de enviar. (2) el contacto la recibe al volver la conexión.

**M7 — SOS**
1. Tocar el SOS sin mantener. 2. Mantenerlo 2 s. 3. Mantenerlo otra vez con la alerta activa.
- **Esperado:** (1) no pasa nada. (2) el contacto recibe la alerta por "pidió ayuda". (3) no llega una segunda alerta.

**M8 — Hora de regreso**
1. Iniciar en modo avión con hora de regreso. 2. Quitar el modo avión. 3. Con el script, adelantar `returnBy` para que ya haya vencido con el margen, y esperar a la tarea. 4. Iniciar otra actividad con hora de regreso, cambiarla con conexión y adelantar la anterior en la base.
- **Esperado:** (1) "pendiente de enviar". (2) pasa a "enviada". (3) el contacto recibe "no ha confirmado su regreso" con la última ubicación y su hora, y la mención de la falta de señal. (4) no avisa por la hora anterior.

**M9 — Terminar con alerta o sin señal**
1. Con una alerta por inactividad activa, detener la actividad. 2. Con hora de regreso, activar el modo avión y detener. 3. Adelantar `returnBy` hasta que el servidor avise y luego quitar el modo avión.
- **Esperado:** (1) pregunta si se cancela la alerta. (2) aviso de que, si no se conecta antes de HH:MM, los contactos recibirán un mensaje. (3) el contacto recibe primero "no ha confirmado su regreso" y, al conectarse, "terminó su actividad y está bien".

**M10 — Pantalla bloqueada y fin de la actividad**
1. Con permiso en segundo plano, grabar 5 minutos con la pantalla bloqueada moviendo el GPS. 2. Detener y esperar el tiempo de inactividad.
- **Esperado:** (1) el resumen tiene los puntos de ese tiempo. (2) no llega ninguna pregunta ni alerta, y desaparece la notificación de grabación.

## Commits propuestos

| # | Commit | Tareas |
|---|---|---|
| 1 | `feat(008): migración del módulo de seguridad` | T1 |
| 2 | `feat(008): bot de Telegram y contactos de emergencia` | T2–T5 |
| 3 | `feat(008): sesiones, alertas y hora de regreso en el backend` | T6–T9 |
| 4 | `test(008): e2e de seguridad y colección de Postman` | T10, T11 |
| 5 | `chore(008): ubicación en segundo plano y notificaciones en el build` | T12 |
| 6 | `feat(008): lógica, bandeja y cliente de seguridad` | T13, T14 |
| 7 | `feat(008): contactos de emergencia en la app` | T15 |
| 8 | `feat(008): grabación en segundo plano y "¿Estás bien?"` | T16, T17 |
| 9 | `feat(008): seguridad durante la actividad` | T18 |
| 10 | `fix(008)`: ajustes de los casos manuales | — |
| 11 | `docs(008): verificación y estado de la spec` | T19 |

Así quedan los tres tipos de la semana: `feat(008)` (1–3 y 6–9), `test/fix(008)` (4 y 10) y `chore/docs(008)` (5 y 11).

## Pendientes conocidos

Ninguno por ahora.
