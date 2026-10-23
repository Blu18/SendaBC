# 008 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de backend y de `lib/safety` incluyen sus pruebas Vitest (constitución 6.1).

## Antes de empezar (lo hace el usuario)

- Crear un **bot de desarrollo** con @BotFather en Telegram y poner su token y su nombre de usuario en `backend/.env` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`). Esos valores no pasan por el chat ni por el repositorio (constitución 3.6).
- Tener Telegram en un teléfono para hacer de contacto en los casos manuales.

## Backend

- [ ] T1 — Migración `20261022000000_safety_module`:
  - en `schema.prisma`: `EmergencyContact`, `SafetySession`, `EmergencyAlert` rehecha, `AlertMessage` y los enums `ContactStatus`, `AlertStatus`, `AlertReason`, `MessageKind` y `MessageStatus`;
  - quitar `users.emergencyContact*`;
  - índice único parcial de una alerta `ACTIVE` por sesión, escrito a mano.

  Antes de `migrate deploy`, confirmar con una consulta de solo lectura que `emergency_alerts` sigue vacía y que ningún usuario tiene contacto. Después, que `prisma migrate diff` contra la base queda vacío. (CA-1, CA-18, CA-27)
- [ ] T2 — Módulo `telegram`, parte de envío:
  - la interfaz `TelegramSender` (`sendMessage` en HTML y `sendLocation`);
  - `log.sender.ts`, que solo registra y guarda lo enviado para las pruebas;
  - `bot-api.sender.ts`, con `fetch`, límite de 10 s y `403` como `blocked`;
  - selección por `TELEGRAM_MODE` (`log` por omisión fuera de producción);
  - variables nuevas en `backend/.env.example`.

  Pruebas con `fetch` simulado: método, ruta, body y token; `403` → `blocked`; sin red y tiempo agotado. (CA-6, CA-7, CA-14)
- [ ] T3 — `safety/messages.ts`, puro. Los siete textos del plan: bienvenida, prueba, alerta por inactividad o SOS, no regresó, ubicación, cancelada y terminó. Pruebas:
  - cada texto lleva lo que pide RN-6, en español y sin el correo;
  - el escape de HTML en el nombre del usuario y del contacto;
  - las horas en `America/Tijuana`;
  - el enlace de Google Maps con lat, lng;
  - el aviso de "puede deberse a falta de señal" solo en el de hora de regreso.

  (CA-5, CA-6, CA-14, CA-18, CA-22, CA-25)
- [ ] T4 — Módulo `emergency-contact`:
  - DTOs (`name` de 1 a 40 caracteres sin los espacios de los extremos);
  - `invitation.ts` (token de 32 bytes en base64url y enlace `t.me/<bot>?start=`);
  - servicio: listar, crear (máximo tres, en una transacción), editar el nombre, borrar (la invitación deja de servir) y mensaje de prueba (`409` si no está activo, `429` a menos de 1 min del anterior);
  - controlador con `JwtAuthGuard`.

  Pruebas con Prisma simulado y mensajes en español. (CA-1, CA-2, CA-3, CA-4, CA-6, CA-28)
- [ ] T5 — Módulo `telegram`, parte de recepción:
  - `updates.service.ts`: `/start <token>` válido deja el contacto `ACTIVE` con su `chat_id` y nombre, borra el token y manda la bienvenida; un token inválido, o la misma cuenta de Telegram ya vinculada con ese usuario (RN-3), responde que la invitación no es válida; otro mensaje recibe una explicación breve;
  - `telegram.controller.ts`, el webhook, con un guard que compara el secreto en tiempo constante (`401` si no coincide);
  - `polling.service.ts` con `getUpdates`, solo en `TELEGRAM_MODE=polling`.

  Pruebas de cada caso. (CA-5, CA-7)
- [ ] T6 — `SessionsService` y DTOs:
  - `PUT` crea o actualiza la sesión (idempotente por `clientGeneratedId`; `400` si `returnBy` ≤ `startedAt`; `404` si es de otra cuenta);
  - `GET`;
  - `locations` guarda la más reciente (`409` si la sesión terminó);
  - `finish`.

  Pruebas con Prisma simulado. (CA-19, CA-20, CA-23, CA-28)
- [ ] T7 — `AlertsService`:
  - crear: idempotente por `clientAlertId`; si ya hay una activa, la devuelve sin enviar nada; manda el texto y el pin a cada contacto activo y guarda cada envío en `alert_messages`;
  - cancelar: `409` si ya no está activa; manda "estoy bien";
  - reenviar la ubicación al recibir una (15 min o 200 m desde el último reenvío, RN-11);
  - al terminar la sesión, resolver una alerta por hora de regreso y mandar "terminó";
  - si un envío responde `blocked`, el contacto pasa a `UNREACHABLE` con una invitación nueva.

  Pruebas de cada regla. (CA-7, CA-14, CA-16, CA-17, CA-22, CA-24, CA-25, CA-27)
- [ ] T8 — `return-time.job.ts`: `@nestjs/schedule` (`ScheduleModule.forRoot`) y `@Cron` cada minuto. Busca las sesiones sin terminar con `returnBy + 30 min < now()` y sin alerta activa, y crea una alerta `RETURN_TIME` con la última ubicación. Pruebas con reloj simulado:
  - a los 29 min no avisa y a los 31 sí;
  - una sesión terminada no avisa;
  - una que cambió su hora de regreso usa la nueva;
  - dos ejecuciones no duplican la alerta (índice único).

  (CA-18, CA-19)
- [ ] T9 — `SafetyController` y conexión en `AppModule` (`ScheduleModule`, `TelegramModule`, `EmergencyContactModule` y `SafetyModule`). Pruebas del controlador: el guard en toda la clase, el usuario del token en cada acción, `ParseUUIDPipe` con `404`. (CA-28)
- [ ] T10 — `test/safety.e2e-spec.ts` contra la base, con `TELEGRAM_MODE=log`. Usa dos usuarios de prueba y al final borra sus sesiones, contactos y usuarios. Casos:
  - crear tres contactos; el cuarto da `409`; un nombre de 41 caracteres da `400` (CA-1, CA-2);
  - aceptar la invitación con un update simulado al webhook: con el secreto pasa a `ACTIVE` y registra la bienvenida; sin el secreto da `401`; el mismo token otra vez no vincula (CA-5);
  - la prueba a un pendiente da `409`; a un activo, `200` y queda registrada; dos seguidas dan `429` (CA-6);
  - el otro usuario no ve ni cambia esos contactos: `404` (CA-4, CA-28);
  - sesión: `PUT` dos veces es idempotente; ubicaciones; una alerta por inactividad avisa a los activos; repetirla no envía otra (CA-14, CA-27);
  - una ubicación a más de 200 m con la alerta activa se reenvía; cancelar manda "estoy bien" (CA-16, CA-25);
  - hora de regreso en el pasado más la tarea ejecutada a mano: crea la alerta `RETURN_TIME`; al terminar la sesión, la resuelve y manda "terminó" (CA-18, CA-22);
  - un envío `blocked` deja al contacto `UNREACHABLE` (CA-7);
  - sin token, `401` en todos los endpoints de la app (CA-28).
- [ ] T11 — Colección de Postman: carpeta "Seguridad (spec 008)" con contactos, sesión, ubicación, alerta, cancelar, terminar, un `409` y un `429`. Validarla contra la API local (constitución 6.3). Probar el bot de desarrollo real en `TELEGRAM_MODE=polling`: aceptar una invitación y recibir la prueba en Telegram.

## Frontend

- [ ] T12 — Configuración nativa:
  - `npx expo install expo-task-manager expo-notifications`;
  - en `app.json`: el plugin de `expo-location` con `locationAlwaysAndWhenInUsePermission`, segundo plano en Android e iOS y servicio en primer plano; los plugins de `expo-notifications` y `expo-task-manager`, con textos de propósito en español;
  - **generar un development build nuevo** (`expo run:android` o EAS) e instalarlo en el emulador.

  (CA-10, CA-11)
- [ ] T13 — Lógica pura en `lib/safety/`, con pruebas Vitest:
  - `contacts.ts`: validación con los mismos casos que el DTO, etiquetas de estado y `contactosActivos`;
  - `inactivity.ts`: quieto 10 min → preguntar; 12 min → alertar; moverse más de 30 m reinicia; un punto con precisión mayor a 30 m no mueve el ancla; "Estoy bien" reinicia;
  - `returnTime.ts`: opciones, validación y "avisaría a las HH:MM";
  - `outbox.ts`: orden, combinar ubicaciones, qué se reintenta;
  - `messages.ts`.

  (CA-2, CA-8, CA-9, CA-11, CA-12, CA-13, CA-21, CA-23)
- [ ] T14 — Datos y envío:
  - SQLite v5 (`safety_sessions`, `safety_detector`, `safety_outbox` y `emergency_contacts_cache`) con su migración en `schema.ts`;
  - `lib/safety/api.ts` (pruebas con `fetch` simulado como `lib/routes/api.test.ts`);
  - `lib/safety/safetySync.ts`: intenta al encolar, reintenta cada 30 s con red, se detiene con `401` y marca la sesión como recibida. Pruebas de la lógica con dependencias simuladas, como `syncEngine.test.ts`.

  (CA-15, CA-20, CA-23)
- [ ] T15 — Contactos en la app:
  - `hooks/safety/useEmergencyContacts.ts`, con copia en SQLite;
  - `pages/safety/emergencyContactsPage.tsx` y `components/safety/ContactForm.tsx`: estado de cada contacto; agregar, editar y quitar con confirmación; "Compartir invitación" con `Share`; "Enviar mensaje de prueba" con su resultado; recargar al volver a la pantalla; aviso del 911;
  - botón "Seguridad" en `MainPage` y la ruta `EmergencyContacts` en `App.tsx`.

  (CA-1, CA-2, CA-3, CA-4, CA-5, CA-6, CA-7)
- [ ] T16 — Grabación en segundo plano:
  - `lib/safety/locationTask.ts`, con `defineTask` en `index.ts`: guarda puntos a 5 m o más del anterior, pasa cada punto por el detector y encola la ubicación cada 5 min (cada 1 min con alerta activa);
  - `activityTracker.hook.ts` elige el modo: con permiso en segundo plano, la tarea sin `keep-awake`; sin él, `watchPositionAsync` con `keep-awake` como hoy;
  - explicación antes de pedir el permiso;
  - la tarea se detiene al terminar o al salir de la grabación.

  (CA-10, CA-13, CA-20)
- [ ] T17 — "¿Estás bien?":
  - `lib/safety/notifications.ts`: canal `seguridad`, categoría con "Estoy bien", programar y reprogramar como máximo una vez por minuto, y permiso de notificaciones;
  - `hooks/safety/useAreYouOk.ts` y `components/safety/AreYouOkModal.tsx` (cuenta regresiva, vibración, botón grande);
  - a los 12 min sin respuesta, encolar la alerta con la última ubicación.
  - En desarrollo, `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES` acorta los tiempos para los casos manuales; en producción se ignora.

  (CA-11, CA-12, CA-13, CA-14, CA-15)
- [ ] T18 — Seguridad durante la actividad, en `activityPage.tsx`:
  - antes de iniciar, `SafetyCard` (activa con los nombres, o el aviso sin contactos activos) y `ReturnTimePicker`;
  - al iniciar, encolar la sesión;
  - durante la grabación: la hora de regreso con "enviada" o "pendiente de enviar" y la opción de cambiarla; el SOS de mantener presionado 2 s; el aviso de alerta activa con la hora, a quiénes se envió y "Cancelar alerta";
  - al detener: preguntar si se cancela la alerta activa, y avisar si se termina sin red con hora de regreso.

  (CA-8, CA-9, CA-17, CA-19, CA-21, CA-22, CA-23, CA-24, CA-25, CA-26)

## Documentación

- [ ] T19 — Al cerrar: tabla de verificación, estado de la spec y `specs/roadmap.md`.

## Cobertura

Los 28 CA están cubiertos por al menos una tarea.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | `emergency-contact.service.spec.ts` › límite de tres · e2e › cuarto contacto `409` · M1 | Ambas | Pendiente |
| CA-2 | `create-emergency-contact.dto.spec.ts` · `contacts.test.ts` · e2e › nombre de 41 · M1 | Ambas | Pendiente |
| CA-3 | `emergency-contact.service.spec.ts` › editar y borrar · M1 | Ambas | Pendiente |
| CA-4 | e2e › contactos de otro usuario `404` | Automatizada | Pendiente |
| CA-5 | `updates.service.spec.ts` · `messages.spec.ts` › bienvenida · e2e › webhook · M1 | Ambas | Pendiente |
| CA-6 | `emergency-contact.service.spec.ts` › prueba `409` y `429` · e2e · M1 | Ambas | Pendiente |
| CA-7 | `bot-api.sender.spec.ts` › `403` · `alerts.service.spec.ts` › `UNREACHABLE` · e2e · M2 | Ambas | Pendiente |
| CA-8 | `contacts.test.ts` › `contactosActivos` · M3 | Ambas | Pendiente |
| CA-9 | `contacts.test.ts` · M3 | Ambas | Pendiente |
| CA-10 | M3 (permiso concedido y negado) · M10 | Manual | Pendiente |
| CA-11 | `inactivity.test.ts` › preguntar a los 10 min · M4 | Ambas | Pendiente |
| CA-12 | `inactivity.test.ts` › "Estoy bien" reinicia · M4 | Ambas | Pendiente |
| CA-13 | `inactivity.test.ts` · M10 | Ambas | Pendiente |
| CA-14 | `alerts.service.spec.ts` › crear · `messages.spec.ts` › alerta · e2e · M5 | Ambas | Pendiente |
| CA-15 | `safetySync.test.ts` › sin red queda en la bandeja · M6 | Ambas | Pendiente |
| CA-16 | `alerts.service.spec.ts` › reenvío 15 min / 200 m · e2e · M5 | Ambas | Pendiente |
| CA-17 | `alerts.service.spec.ts` › entregas · M5 | Ambas | Pendiente |
| CA-18 | `return-time.job.spec.ts` · e2e › hora de regreso vencida · M8 | Ambas | Pendiente |
| CA-19 | `return-time.job.spec.ts` › terminada y cambiada · `sessions.service.spec.ts` · M8 | Ambas | Pendiente |
| CA-20 | `sessions.service.spec.ts` › ubicación más reciente · `outbox.test.ts` · M8 | Ambas | Pendiente |
| CA-21 | `returnTime.test.ts` › "avisaría a las" · M9 | Ambas | Pendiente |
| CA-22 | `alerts.service.spec.ts` › resolver al terminar · e2e · M9 | Ambas | Pendiente |
| CA-23 | `safetySync.test.ts` › marca la sesión recibida · M8 | Ambas | Pendiente |
| CA-24 | M7 | Manual | Pendiente |
| CA-25 | `alerts.service.spec.ts` › cancelar · e2e · M5 | Ambas | Pendiente |
| CA-26 | M9 | Manual | Pendiente |
| CA-27 | `alerts.service.spec.ts` › una activa · e2e › repetir alerta · M7 | Ambas | Pendiente |
| CA-28 | `safety.controller.spec.ts` › guard · e2e › `401` y `404` | Automatizada | Pendiente |

### Casos manuales

En el emulador con el **development build nuevo** (T12), el backend local en `TELEGRAM_MODE=polling` con el bot de desarrollo, y Telegram en un teléfono que hace de contacto. Para no esperar los 10 minutos reales, `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES` acorta los tiempos (T17). Para la hora de regreso, un script de prueba adelanta `returnBy` en la base.

**M1 — Contactos e invitación**
1. Pantalla principal → "Seguridad". Agregar "Mamá" con el nombre vacío y luego con 41 caracteres. 2. Agregarlo con un nombre válido y compartir la invitación. 3. En el teléfono de prueba, abrir el enlace en Telegram y tocar "Iniciar". 4. Volver a "Seguridad". 5. "Enviar mensaje de prueba". 6. Agregar dos contactos más e intentar un cuarto. 7. Editar el nombre de uno y quitar otro. 8. Cerrar sesión y entrar en otro emulador.
- **Esperado:** (1) mensaje junto al campo, sin guardar. (2) "Pendiente de aceptar" y el menú de compartir del sistema. (3) el contacto recibe la bienvenida con mi nombre. (4) aparece "Activo". (5) llega la prueba y la app dice que se envió. (6) no deja agregar el cuarto. (7) los cambios se guardan. (8) se ven los mismos contactos.

**M2 — Contacto que bloquea al bot**
1. En Telegram, bloquear al bot desde el teléfono de prueba. 2. "Enviar mensaje de prueba". 3. Compartir de nuevo la invitación, desbloquear y aceptarla.
- **Esperado:** (2) falla y el contacto queda "No recibe mensajes". (3) vuelve a "Activo".

**M3 — Al iniciar una actividad**
1. Sin contactos activos, abrir "Nueva actividad". 2. Con un contacto activo, abrirla de nuevo. 3. Iniciar y negar el permiso en segundo plano. 4. Repetir y concederlo.
- **Esperado:** (1) aviso de que no se puede avisar a nadie, con enlace a "Seguridad", y se puede iniciar igual. (2) "Seguridad activa" con el nombre del contacto y la hora de regreso opcional. (3) explicación previa; graba con la pantalla encendida y avisa que la detección solo funciona con la app abierta. (4) graba con la notificación "SendaBC está grabando tu actividad".

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
