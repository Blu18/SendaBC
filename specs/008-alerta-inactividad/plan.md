# 008 — Plan técnico

Estado: **Aprobado** (2026-10-22)

Spec: [spec.md](spec.md)

## Resumen

**Idea central:** hoy el servidor solo conoce una actividad cuando termina y se sincroniza (spec 005). Para que pueda avisar durante la actividad, esta spec agrega una **sesión de seguridad** (D1), que el teléfono registra al iniciar con el mismo `clientGeneratedId` de la actividad. La sesión guarda:
- la hora de regreso;
- la última ubicación recibida;
- si la actividad ya terminó.

Las alertas cuelgan de la sesión.

**Backend:** tres módulos nuevos.
- `emergency-contact`: los contactos de la cuenta (hasta tres), sus invitaciones de Telegram y el mensaje de prueba.
- `safety`: sesiones, ubicaciones, alertas por inactividad, SOS y hora de regreso, y su cancelación.
- `telegram`: el bot. Manda los mensajes con la Bot API de Telegram, que no cobra por mensaje (D2), y recibe el "Iniciar" del contacto por un webhook en producción o por consulta periódica en desarrollo (D12). En las pruebas, un emisor que solo registra reemplaza al real.

Una tarea programada cada minuto busca las sesiones cuya hora de regreso, más 30 minutos, ya pasó (D3).

**Frontend:**
- **Grabación en segundo plano:** con el permiso de ubicación en segundo plano (constitución 3.5, v1.5), la captura pasa a una tarea de `expo-task-manager` con el servicio en primer plano de Android (D4). Sin ese permiso, se graba como hasta ahora.
- **Detección:** la detección de inactividad es lógica pura.
- **"¿Estás bien?":** llega como notificación local programada que se puede responder con la pantalla bloqueada (D5).
- **Bandeja de salida en SQLite (v5):** guarda la sesión, las ubicaciones, las alertas y las cancelaciones. Se envía en cuanto hay red (D6).

Pantallas nuevas: "Seguridad" (contactos e invitaciones). En la grabación se agregan la tarjeta de seguridad, la hora de regreso, el SOS, el aviso de alerta activa y el modal "¿Estás bien?".

## Verificación contra la constitución

- [x] **Art. 1 La spec primero:** spec aprobada el 2026-10-22 y corregida al escribir este plan:
  - RN-6 ya no menciona "la ruta que sigue la actividad", y se agregó la hora de regreso pendiente de enviar (ahora CA-23);
  - el canal pasó de WhatsApp a Telegram por costo (P15).

  Todo está en el historial de la spec.
- [x] **Art. 2 Offline-first:**
  - Grabar, detectar la inactividad, preguntar "¿Estás bien?" y crear la alerta funcionan sin red. La alerta se guarda en la bandeja de SQLite con su `clientGeneratedId` (2.2) y se envía en cuanto hay conexión (CA-15).
  - La sesión de seguridad no cambia los estados de la actividad (2.3): la actividad sigue `RECORDING → PENDING_SYNC → SYNCED` como en la 005.
  - Un fallo al enviar nunca borra la bandeja (2.4).
- [x] **Art. 3.3 Seguridad:**
  - Todos los endpoints de la app usan `JwtAuthGuard` y toman al usuario del token. Contactos, sesiones y alertas de otra cuenta responden `404`.
  - **Excepción documentada:** el webhook de Telegram no lleva JWT, porque lo llama Telegram, no la app. Se autentica con el encabezado secreto de Telegram (`X-Telegram-Bot-Api-Secret-Token`) y solo puede vincular un contacto que traiga una invitación válida de un solo uso (D12).
- [x] **Art. 3.5 Ubicación (v1.5):**
  - El permiso en segundo plano se pide solo al iniciar una actividad con contactos activos, después de explicar para qué es (CA-10). La app funciona sin él.
  - La tarea de ubicación se detiene al terminar la actividad.
  - Al servidor solo llegan ubicaciones de una sesión activa, y a los contactos solo dentro de una alerta (RN-9).
- [x] **Art. 3.6 Secretos:** van en variables de entorno el token del bot (`TELEGRAM_BOT_TOKEN`), el secreto del webhook (`TELEGRAM_WEBHOOK_SECRET`) y el usuario del bot (`TELEGRAM_BOT_USERNAME`). `TELEGRAM_MODE` (`log`, `polling` o `webhook`) vale `log` por omisión fuera de producción.
- [x] **Art. 4 Contratos:** cada body se valida con DTOs de class-validator y mensajes en español. Códigos:
  - `400` validación;
  - `401` sin token, o webhook sin el secreto;
  - `404` no existe o es de otra cuenta;
  - `409` límite de tres contactos, prueba a un contacto que no está activo, o alerta que ya no está activa;
  - `429` mensajes de prueba demasiado seguidos.

  Los endpoints están documentados abajo.
- [x] **Art. 5 Datos:**
  - Migración `20261022000000_safety_module`.
  - La última ubicación de la sesión y la ubicación de cada alerta son `geography(Point, 4326)` en orden lng, lat (5.2).
  - Las fechas van en `timestamptz` (5.4).
  - SQLite pasa a la versión 5 con `PRAGMA user_version` (5.3).
  - Las columnas `users.emergencyContact*` y `emergency_alerts.activityId` se reemplazan. Una consulta de solo lectura del 2026-10-22 confirmó que están vacías: 0 usuarios con contacto, 0 alertas.
- [x] **Art. 6 Verificación:**
  - Vitest en el backend: DTOs, invitaciones, servicios, textos de los mensajes, webhook, tarea de la hora de regreso, y e2e con el emisor que solo registra.
  - Vitest en la lógica pura del frontend: detector de inactividad, validación del contacto, hora de regreso, bandeja y cliente de la API.
  - Casos manuales en el dispositivo, con un bot de prueba real.
  - Requests nuevas en Postman.
- [x] **Art. 7.1 Stack:** dependencias nuevas fuera del stack:
  - `expo-task-manager` (D4);
  - `@nestjs/schedule` (D3);
  - la Bot API de Telegram como servicio externo, sin librería (D2).

  `expo-notifications` ya está en el stack. Se agregaron a la tabla de la constitución (v1.6) al aprobarse el plan.

## Backend

### Endpoints

Con `JwtAuthGuard`, salvo el webhook.

**Contactos de emergencia**

| Método | Ruta | Request | Response | Errores |
|---|---|---|---|---|
| GET | `/emergency-contacts` | — | `200 EmergencyContact[]`, en orden de creación | — |
| POST | `/emergency-contacts` | `{ name }` | `201 EmergencyContact` (`PENDING`, con `inviteUrl`, CA-1) | `400` · `409` ya tiene tres (RN-3) |
| PATCH | `/emergency-contacts/:id` | `{ name }` | `200 EmergencyContact` | `400` · `404` |
| DELETE | `/emergency-contacts/:id` | — | `204` (la invitación deja de servir, CA-3) | `404` |
| POST | `/emergency-contacts/:id/test` | — | `200 { status: 'SENT' \| 'FAILED', error: string \| null }` (CA-6) | `404` · `409` el contacto no está activo · `429` si se envió uno al mismo contacto hace menos de 1 minuto |

```ts
EmergencyContact = {
  id: string; name: string;
  status: 'PENDING' | 'ACTIVE' | 'UNREACHABLE';   // "Pendiente de aceptar" / "Activo" / "No recibe mensajes" (CA-7)
  telegramName: string | null;                    // nombre visible del contacto en Telegram, al aceptar
  inviteUrl: string | null;                       // https://t.me/<bot>?start=<token>; null si está activo
  createdAt: string;
}
```

**Webhook de Telegram** (sin JWT, D12)

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| POST | `/telegram/webhook` | Encabezado `X-Telegram-Bot-Api-Secret-Token` | `Update` de Telegram | `200` siempre que el secreto sea válido (Telegram reintenta si no) | `401` secreto inválido |

Solo atiende `/start <token>`:
- **Token válido:** vincula el contacto (`ACTIVE`, guarda el `chat_id` y el nombre de Telegram), quita el token y responde con el mensaje de bienvenida (CA-5).
- **Token inválido, o la cuenta de Telegram ya es contacto de ese usuario (RN-3):** responde con un mensaje que explica que la invitación no es válida.
- **Cualquier otro mensaje:** responde con una explicación breve de qué es el bot.

**Sesiones de seguridad y alertas**

`:clientId` es el `clientGeneratedId` de la actividad (UUID v4, constitución 2.2). Las escrituras son idempotentes para que la bandeja pueda reintentarlas.

| Método | Ruta | Request | Response | Errores |
|---|---|---|---|---|
| PUT | `/safety/sessions/:clientId` | `{ type, startedAt, returnBy: string \| null }` | `200 SafetySession` (crea o actualiza la hora de regreso, CA-19, CA-23) | `400` (`returnBy` ≤ `startedAt`) · `404` si el id es de otra cuenta |
| GET | `/safety/sessions/:clientId` | — | `200 SafetySession` | `404` |
| POST | `/safety/sessions/:clientId/locations` | `{ latitude, longitude, recordedAt }` | `204` (se queda con la más reciente, CA-20) | `400` · `404` · `409` sesión terminada |
| POST | `/safety/sessions/:clientId/finish` | `{ endedAt }` | `200 SafetySession` (si había alerta por hora de regreso, la resuelve y avisa "ya terminó", CA-22) | `404` |
| POST | `/safety/sessions/:clientId/alerts` | `{ clientAlertId, reason: 'INACTIVITY' \| 'SOS', triggeredAt, latitude, longitude, locationAt }` (la ubicación va completa o en `null`: un SOS puede pedirse antes de la primera posición del GPS) | `201 SafetyAlert`, o `200` con la activa si ya había una (CA-27) | `400` · `404` |
| POST | `/safety/alerts/:id/cancel` | — | `200 SafetyAlert` (avisa "estoy bien", CA-25) | `404` · `409` ya no está activa |

```ts
SafetySession = {
  clientId: string; type: ActivityType; startedAt: string; returnBy: string | null;
  endedAt: string | null; lastLocationAt: string | null; activeAlert: SafetyAlert | null;
}
SafetyAlert = {
  id: string; reason: 'INACTIVITY' | 'SOS' | 'RETURN_TIME'; status: 'ACTIVE' | 'CANCELLED' | 'RESOLVED';
  triggeredAt: string; locationAt: string | null;
  deliveries: { contactName: string; status: 'SENT' | 'FAILED'; sentAt: string }[]; // CA-17
}
```

**Reglas del servidor:**
- **Alerta (`POST …/alerts`):** guarda la ubicación y le manda a cada contacto activo el texto de alerta (RN-6) seguido del pin de la ubicación (D10). El índice único parcial (una alerta `ACTIVE` por sesión) evita las duplicadas y responde con la existente (CA-27, RN-8). `clientAlertId` hace que un reintento devuelva la misma alerta.
- **Ubicaciones (`…/locations`):** se guarda la más reciente (D7). Si hay una alerta activa y pasaron 15 minutos o 200 m desde el último reenvío, se manda la ubicación actualizada a los contactos (CA-16, RN-11).
- **Terminar (`…/finish`):** la sesión queda terminada y deja de aceptar ubicaciones (RN-9). Si la alerta activa es por hora de regreso, se resuelve y se manda "ya terminó y está bien" (CA-22). Una alerta por inactividad o SOS sigue activa hasta que el usuario la cancele (CA-26 se lo pregunta).
- **Tarea programada (cada minuto):** busca las sesiones sin terminar, con `returnBy + 30 min < now()` y sin alerta activa, y crea una alerta `RETURN_TIME` con la última ubicación recibida (CA-18). La crea con una inserción condicionada al índice único, así que dos instancias o dos ejecuciones no la duplican. Tampoco la repite si ya avisó por esa hora de regreso (una alerta `RETURN_TIME` disparada después de `returnBy`): si el usuario la canceló, no vuelve a crearse cada minuto; si cambia la hora de regreso a una posterior, puede volver a avisar.
- **Contacto inalcanzable (CA-7, RN-13):** si Telegram responde `403` (el contacto bloqueó al bot o borró la conversación), el contacto pasa a `UNREACHABLE` y se le genera una invitación nueva para volver a compartirla.
- **Contactos:**
  - El límite de tres se comprueba en una transacción (RN-3).
  - `UNIQUE (userId, telegramChatId)` impide vincular la misma cuenta de Telegram dos veces.
  - La invitación es un token aleatorio de 32 bytes en base64url (43 caracteres, dentro de los 64 que permite el parámetro `start` de Telegram) y se borra al aceptarla.
  - Al mandar un mensaje se guarda una copia del nombre del contacto, así que borrar un contacto no cambia lo que ya se envió.

### Mensajes

Son textos armados por el servidor (`messages.ts`, puro y con pruebas), en HTML de Telegram, con los datos del usuario escapados. Ya no hacen falta plantillas aprobadas, como en WhatsApp.

| Mensaje | Cuándo | Contenido |
|---|---|---|
| Bienvenida | El contacto acepta la invitación (CA-5) | Quién lo registró y qué recibirá |
| Prueba | "Enviar mensaje de prueba" (CA-6) | Que es una prueba de SendaBC de parte del usuario |
| Alerta | Inactividad o SOS (CA-14, CA-24) | Nombre, motivo ("no respondió tras detenerse" / "pidió ayuda"), hora, tipo de actividad, hora de la ubicación y enlace al mapa; después, el pin de la ubicación |
| No regresó | Hora de regreso (CA-18) | Nombre, hora de regreso, tipo, hora de la ubicación, enlace al mapa; dice que puede deberse a falta de señal; después, el pin |
| Ubicación | Reenvío con alerta activa (CA-16) | Hora y pin de la ubicación |
| Cancelada | El usuario canceló (CA-25) | Que el usuario está bien |
| Terminó | Terminó después de una alerta por hora de regreso (CA-22) | Que el usuario terminó su actividad y está bien |

- El enlace es `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` (D10).
- Las horas se escriben en la zona `America/Tijuana`.
- Nunca se incluye el correo (RN-6).

### Módulos / archivos

- `backend/src/emergency-contact/`:
  - el módulo, el controlador y el servicio;
  - `dto/` (`CreateEmergencyContactDto` y `UpdateEmergencyContactDto`, solo `name`);
  - `invitation.ts`, que genera el token y arma el enlace.
- `backend/src/safety/`:
  - el módulo y el controlador;
  - `sessions.service.ts` (crear, actualizar, ubicación, terminar);
  - `alerts.service.ts` (crear, cancelar, reenviar la ubicación, resolver);
  - `return-time.job.ts` (`@Cron` cada minuto, D3);
  - `messages.ts`, que arma los textos y es puro;
  - `dto/`.
- `backend/src/telegram/`:
  - `telegram.module.ts`;
  - `telegram.sender.ts`, la interfaz `TelegramSender` con `sendMessage(chatId, html)` y `sendLocation(chatId, lat, lng)`, que devuelven `{ ok, messageId?, error?, blocked? }`;
  - `bot-api.sender.ts`, que usa `fetch` contra `api.telegram.org` con límite de tiempo;
  - `log.sender.ts`, que solo registra y se usa en desarrollo y pruebas (D2);
  - `telegram.controller.ts`, el webhook, con un guard que compara el secreto en tiempo constante;
  - `updates.service.ts`, que atiende `/start <token>`;
  - `polling.service.ts`, que llama a `getUpdates` solo en `TELEGRAM_MODE=polling` (D12).
- `backend/test/safety.e2e-spec.ts`, el e2e del ciclo completo con el emisor que solo registra y updates simulados del webhook.

### Cambios de esquema (Prisma)

Migración: `20261022000000_safety_module`.

```prisma
model EmergencyContact {            // emergency_contacts (nuevo)
  id             String        @id @default(uuid()) @db.Uuid
  userId         String        @db.Uuid     // onDelete: Cascade
  name           String
  status         ContactStatus              // PENDING, ACTIVE, UNREACHABLE
  inviteToken    String?       @unique      // null cuando está activo
  telegramChatId BigInt?
  telegramName   String?
  acceptedAt     DateTime?     @db.Timestamptz(6)
  createdAt      DateTime      @default(now()) @db.Timestamptz(6)
  updatedAt      DateTime      @updatedAt @db.Timestamptz(6)
  @@unique([userId, telegramChatId])
}

model SafetySession {               // safety_sessions (nuevo)
  id                String   @id @default(uuid()) @db.Uuid
  clientGeneratedId String   @unique @db.Uuid   // el de la actividad (constitución 2.2)
  userId            String   @db.Uuid           // onDelete: Cascade
  type              ActivityType
  startedAt         DateTime @db.Timestamptz(6)
  returnBy          DateTime? @db.Timestamptz(6)
  endedAt           DateTime? @db.Timestamptz(6)
  lastLocation      Unsupported("geography(Point, 4326)")?
  lastLocationAt    DateTime? @db.Timestamptz(6)
  alerts            EmergencyAlert[]
  @@index([endedAt, returnBy])
}

model EmergencyAlert {              // emergency_alerts (se rehace; estaba vacía)
  id                 String      @id @default(uuid()) @db.Uuid
  sessionId          String      @db.Uuid         // reemplaza a activityId
  clientGeneratedId  String?     @unique @db.Uuid // null en las del servidor (RETURN_TIME)
  reason             AlertReason                  // + RETURN_TIME_EXCEEDED
  status             AlertStatus                  // ACTIVE, CANCELLED, RESOLVED
  triggeredAt        DateTime    @db.Timestamptz(6)
  location           Unsupported("geography(Point, 4326)")?
  locationAt         DateTime?   @db.Timestamptz(6)
  lastForwardedAt    DateTime?   @db.Timestamptz(6)
  lastForwardedLocation Unsupported("geography(Point, 4326)")?
  resolvedAt         DateTime?   @db.Timestamptz(6)
  messages           AlertMessage[]
}

model AlertMessage {                // alert_messages (nuevo): cada envío por Telegram
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @db.Uuid
  alertId           String?  @db.Uuid   // null en la prueba y la bienvenida
  contactId         String?  @db.Uuid   // SetNull si se borra el contacto
  contactName       String             // copia al enviar
  kind              MessageKind        // WELCOME, TEST, ALERT, LOCATION, CANCELLED, FINISHED
  status            MessageStatus      // SENT, FAILED
  telegramMessageId BigInt?
  error             String?
  createdAt         DateTime @default(now()) @db.Timestamptz(6)
}
```

- Se quitan `users.emergencyContactName` y `users.emergencyContactPhone`, y `emergency_alerts.activityId`, `contactName` y `contactPhone`. Las tres tablas estaban vacías.
- `AlertStatus` pasa a `ACTIVE`, `CANCELLED` y `RESOLVED`. `PENDING`, `NOTIFIED` y `ACKNOWLEDGED`, del modelo de la semana 1, nunca se usaron.
- Índice único parcial escrito a mano en la migración: `CREATE UNIQUE INDEX ... ON emergency_alerts ("sessionId") WHERE status = 'ACTIVE'` (CA-27, D3).
- `Device` no cambia: "¿Estás bien?" es una notificación local y no necesita push remoto (D5).

## Frontend

### Lógica pura (`lib/safety/`, con pruebas Vitest)

| Archivo | Contenido |
|---|---|
| `contacts.ts` | `validarContacto` (RN-1, mismos casos que el DTO), etiquetas de estado ("Pendiente de aceptar", "Activo", "No recibe mensajes") y `contactosActivos` (CA-8, CA-9) |
| `inactivity.ts` | Detector: `evaluar(estado, punto, ahora)` devuelve `{ estado, accion: 'nada' \| 'programar-pregunta' \| 'preguntar' \| 'alertar' }`. El ancla se mueve solo con un punto a más de 30 m y con precisión ≤ 30 m (D8). Pregunta a los 10 min sin moverse y alerta 2 min después de preguntar (RN-4): la cuenta regresiva empieza al preguntar, para que la persona tenga sus 2 min aunque la tarea o la notificación lleguen tarde. Moverse más de 30 m durante la pregunta cuenta como respuesta |
| `returnTime.ts` | Opciones de hora de regreso (dentro de 1 a 12 h, en pasos de 15 min), validación (posterior al inicio) y "avisaría a las HH:MM" (+30 min, RN-10) |
| `outbox.ts` | Tipos y reglas de la bandeja: orden de envío (cronológico), qué se combina (de cada sesión, la última versión en el lugar de la primera; de las ubicaciones, la más reciente; una alerta y su cancelación sin enviar se descartan juntas) y qué fallos se reintentan (D6) |
| `messages.ts` | Textos del modal, de la notificación, de la invitación al compartir y de los avisos (CA-10, CA-21, CA-23 y el aviso del 911) |
| `api.ts` | Cliente de los endpoints, con el patrón `{ ok, data }` / `{ ok: false, failure }` de `lib/routes/api.ts` |

### Captura en segundo plano y notificaciones

- `lib/safety/locationTask.ts`: `TaskManager.defineTask` se registra en `index.ts`, antes de montar la app, como pide `expo-task-manager`. La tarea recibe los puntos de `Location.startLocationUpdatesAsync`:
  - los guarda en SQLite solo si están a 5 m o más del anterior, igual que la spec 003;
  - pasa cada punto por el detector, guarda su estado en SQLite y encola las ubicaciones para el servidor (cada 5 min; cada 1 min con una alerta activa, D7).
  - Opciones: `distanceInterval: 0` y `timeInterval: 10 s`, para que la tarea corra aunque la persona no se mueva (D5); `foregroundService` con una notificación "SendaBC está grabando tu actividad"; `pausesUpdatesAutomatically: false`; `activityType: Fitness`.
- `hooks/activity/activityTracker.hook.ts` decide el modo al iniciar:
  - **Con permiso en segundo plano:** usa la tarea, no mantiene la pantalla encendida y recibe los puntos para las métricas en vivo por un evento de la tarea.
  - **Sin permiso:** usa `watchPositionAsync` y `keep-awake` como hoy (CA-10). La detección corre igual, pero solo con la app abierta.
- `lib/safety/notifications.ts` (`expo-notifications`, D5):
  - canal de Android `seguridad`, de importancia alta, con sonido y vibración;
  - categoría con la acción "Estoy bien";
  - programa "¿Estás bien?" para la hora del ancla más 10 min y la reprograma cuando el ancla se mueve, como máximo una vez por minuto;
  - al tocar la acción, o al abrir la app desde la notificación, el detector se reinicia (CA-12).
- `app.json`:
  - el plugin de `expo-location` agrega `locationAlwaysAndWhenInUsePermission`, `isAndroidBackgroundLocationEnabled`, `isAndroidForegroundServiceEnabled` e `isIosBackgroundLocationEnabled`;
  - se agregan los plugins de `expo-notifications` y `expo-task-manager`.

  **Hay que generar un development build nuevo.**

### Bandeja de salida y sincronización de seguridad

- `lib/safety/safetySync.ts`: envía la bandeja en orden cronológico, con las reglas de `outbox.ts`. No se ordena por tipo: una alerta cancelada seguida de otra nueva debe llegar en ese orden (RN-8).
  - Es aparte del `syncEngine` de actividades (D6): intenta de inmediato al encolar, reintenta cada 30 s mientras haya red (con `expo-network` y `hayConexion` de la 005) y no usa la espera de hasta 15 min de la 005.
  - Se detiene con un `401`, igual que la 005.
- **Al terminar sin red, con hora de regreso:** se encola `finish` y se muestra el aviso de CA-21 con "avisaría a las HH:MM". Cuando se envía `finish`, el servidor manda el "ya terminó" si hacía falta (CA-22).

### Pantallas y navegación

- `pages/safety/emergencyContactsPage.tsx` (`EmergencyContacts`), CA-1 a CA-7:
  - la lista con el estado de cada contacto;
  - agregar o editar el nombre (formulario `components/safety/ContactForm.tsx`) y quitar con confirmación;
  - "Compartir invitación", con el `Share` de React Native, sin dependencias, en los pendientes y en los que no reciben mensajes;
  - "Enviar mensaje de prueba" con su resultado, en los activos;
  - el aviso de que SendaBC no sustituye al 911.

  La lista se vuelve a pedir al regresar a la pantalla, para ver los contactos que aceptaron mientras tanto. Se entra desde un botón "Seguridad" en `MainPage`.
- `pages/activity/activityPage.tsx`:
  - antes de iniciar, `components/safety/SafetyCard.tsx` muestra "Seguridad activa" con los nombres de los contactos activos, o el aviso sin contactos activos con un enlace a configurarlos (CA-8, CA-9);
  - `components/safety/ReturnTimePicker.tsx` ofrece botones de duración (1, 2, 3, 4, 6 y 8 h) y ajustes de ±15 min, sin una librería de selector de fecha (D9);
  - al iniciar con contactos activos y sin permiso en segundo plano, una explicación lleva a pedirlo (CA-10).
- **Durante la grabación**, en la misma pantalla:
  - el estado de seguridad;
  - la hora de regreso, con "enviada" o "pendiente de enviar" y la opción de cambiarla (CA-23, CA-19);
  - el botón SOS de mantener presionado 2 s (RN-7, CA-24);
  - con una alerta activa, un aviso con la hora, a quiénes se envió y "Cancelar alerta" (CA-17, CA-25).
- `components/safety/AreYouOkModal.tsx`: modal a pantalla completa con la cuenta regresiva de 2 min, un botón grande "Estoy bien", vibración y sonido (CA-11, CA-12).
- **Al detener:** si hay una alerta activa, se pregunta si se cancela (CA-26). Sin red y con hora de regreso, se muestra el aviso de CA-21.
- `App.tsx`: la ruta `EmergencyContacts` y el registro del manejador de notificaciones.

### Hooks / estado / almacenamiento local

- `hooks/safety/useEmergencyContacts.ts`: la query `['safety', 'contacts']` y sus mutaciones. Guarda una copia en SQLite para mostrar los contactos activos sin red al iniciar (CA-8).
- `hooks/safety/useSafetySession.ts`: el estado de la sesión de la actividad en curso (enviada o pendiente, alerta activa, entregas), la hora de regreso, SOS y cancelar.
- `hooks/safety/useAreYouOk.ts`: une el detector, las notificaciones y el modal.
- **SQLite v5:**
  - `safety_sessions` (`activity_local_id`, `client_generated_id`, `user_id`, `return_by`, `server_ack`, `location_queued_at` y la última alerta: `alert_client_id`, `alert_server_id`, `alert_triggered_at`, `alert_cancelled_at`);
  - `safety_detector` (el estado del detector por actividad);
  - `safety_outbox` (`id`, `kind`, `payload` JSON, `created_at`, `attempts`);
  - `emergency_contacts_cache`.

## Decisiones

| # | Decisión | Alternativas consideradas | Motivo |
|---|---|---|---|
| D1 | **Sesión de seguridad** en el servidor, aparte de `activities`, con el `clientGeneratedId` de la actividad | Crear la actividad en el servidor al iniciar; mandar las alertas solo al sincronizar | La 005 sube la actividad al terminar y sus estados no deben cambiar (2.3). Una tabla aparte no toca la sincronización y deja ligar la sesión con la actividad después, por el mismo id. |
| D2 | **Bot API de Telegram**, llamada con `fetch` sin librería. La interfaz `TelegramSender` tiene un emisor que solo registra, para desarrollo y pruebas | API de WhatsApp de Meta (~US$0.01 por mensaje, cuenta de negocio verificada, plantillas aprobadas); SMS (~US$0.10–0.18 por segmento a México); una librería de bots (`telegraf`, `node-telegram-bot-api`) | Telegram no cobra por mensaje y el bot se crea en minutos con @BotFather (spec, P15). Solo se usan unos cuantos métodos (`sendMessage`, `sendLocation`, `getUpdates`, `setWebhook`), que no justifican una librería (constitución 7.2). La interfaz deja agregar otro canal después sin rehacer el diseño. |
| D3 | **`@nestjs/schedule`** con una tarea cada minuto para la hora de regreso, e índice único parcial para no duplicar alertas | `pg_cron` en Supabase llamando a un webhook; un cron externo | Corre dentro del backend con el resto de la lógica y sus pruebas. El índice hace segura la ejecución en paralelo. **Requiere** que el backend esté siempre encendido: un plan gratuito que se duerme no correría la tarea (riesgos). |
| D4 | **`expo-task-manager`** con `Location.startLocationUpdatesAsync` y el servicio en primer plano de Android para grabar con la pantalla bloqueada. Sin permiso, `watchPositionAsync` y `keep-awake` como hoy | Seguir con la pantalla encendida (no cumple P6); una librería de geolocalización de terceros | Es lo que documenta `expo-location` 57 para segundo plano. Exige un development build nuevo. |
| D5 | "¿Estás bien?" como **notificación local programada** con `expo-notifications`; la cuenta regresiva y la alerta se evalúan en la tarea de ubicación, que corre cada 10 s aunque no haya movimiento | Push remoto desde el servidor (no hay red en la sierra); timers de JavaScript (se detienen con la app suspendida) | La notificación programada suena aunque la app esté suspendida. Con el servicio en primer plano de Android, la tarea sigue corriendo y puede crear la alerta a los 12 min sin que la persona toque nada. |
| D6 | **Bandeja de salida propia** en SQLite y un `safetySync` aparte del `syncEngine` | Agregar estos envíos al `syncEngine` de la 005 | Una alerta no puede esperar la espera de hasta 15 min de la 005, y estos envíos tienen otro orden y otra forma de combinarse. Comparten la detección de red y el manejo de `401`. |
| D7 | El teléfono manda su ubicación cada **5 min** (cada **1 min** con una alerta activa) y **el servidor decide** cuándo reenviarla a los contactos (15 min o 200 m, RN-11) | Que el teléfono decida y mande el reenvío | La regla vive en un solo lugar y se puede probar. Si se cancela la alerta, el servidor deja de reenviar aunque al teléfono le lleguen ubicaciones atrasadas. |
| D8 | El ancla del detector solo se mueve con puntos de precisión ≤ 30 m | Usar todos los puntos | Con mala señal, el ruido del GPS puede pasar de 30 m y hacer creer que la persona se mueve. Es más seguro preguntar de más que no preguntar. |
| D9 | Hora de regreso con **botones de duración** y ajustes de ±15 min | `@react-native-community/datetimepicker` | No agrega una dependencia, y elegir "dentro de 3 h" es más rápido en el punto de salida. |
| D10 | Cada aviso con ubicación lleva el **enlace universal de Google Maps** en el texto y, aparte, el **pin nativo de Telegram** (`sendLocation`) | Solo el enlace; una página propia | El pin se abre dentro de Telegram con un toque. El enlace sirve aunque la persona copie el texto a otra app. Ninguno necesita una página pública. |
| D11 | El contacto se vincula con un **enlace de invitación de un solo uso** (`t.me/<bot>?start=<token>`), que el usuario comparte por el medio que quiera | Pedir el teléfono del contacto (Telegram no deja que un bot le escriba a un número); que el contacto escriba un código | Es la forma en que Telegram deja que una persona inicie la conversación con un bot. El token aleatorio no se puede adivinar y se borra al usarlo. |
| D12 | El bot recibe el "Iniciar" por **webhook** en producción (con el secreto de Telegram) y por **`getUpdates`** en desarrollo, según `TELEGRAM_MODE` | Solo webhook; solo `getUpdates` | El webhook necesita una URL pública con HTTPS, que en desarrollo no hay. `getUpdates` funciona desde la máquina local, pero Telegram no lo permite con un webhook activo, y con dos instancias en producción se repartirían los mensajes. |

## Riesgos

- **Contactos sin Telegram:** en México mucha más gente usa WhatsApp. Si un contacto no instala Telegram o no acepta la invitación, no recibe avisos. La app lo deja claro con el estado "Pendiente de aceptar" y no considera la seguridad activa sin al menos un contacto activo (CA-9). Se aceptó al elegir Telegram (spec, P12 y P15).
- **El contacto silencia o archiva el chat:** Telegram entrega el mensaje, pero la persona puede no verlo a tiempo. El mensaje de bienvenida recomienda no silenciar el chat de SendaBC.
- **Webhook público:** en producción el backend necesita una URL con HTTPS para el webhook (la 010 lo despliega en Railway o Render). En desarrollo se usa `getUpdates`, y no puede haber un webhook activo al mismo tiempo para el mismo bot. Se recomienda un bot de desarrollo y otro de producción.
- **Backend dormido:** si el hospedaje duerme el backend cuando no hay tráfico (como los planes gratuitos de Render), la tarea de la hora de regreso no corre y el webhook tarda en responder. Para la 010 hace falta un plan siempre encendido. Está anotado en el roadmap.
- **Segundo plano en el sistema:**
  - Android puede matar el servicio con el ahorro de batería de algunos fabricantes. Se mitiga con la notificación permanente del servicio y se revisa en la prueba de campo (009).
  - En iOS, la tarea puede recibir pocos puntos con la persona quieta. **No hay un iPhone para probar.**
- **Barómetro en segundo plano:** la lectura del barómetro vive en el árbol de React y puede detenerse con la app suspendida. Eso dejaría huecos en la elevación (spec 004). Se revisa en el dispositivo; si pasa, la 009 decide si se usa la altitud del GPS.
- **Falsos positivos:** al preparar la salida en el punto de inicio o en una comida larga habrá "¿Estás bien?"; se responde con un toque. Los umbrales se revisan en la 009 (RN-4).
- **Permiso de notificaciones (Android 13+):** si se niega, "¿Estás bien?" solo se ve con la app abierta. La app lo pide junto con el de ubicación y lo dice si falta.
- **Hora del teléfono:** la hora de regreso se manda como fecha absoluta. Si el reloj del teléfono está mal, el aviso se corre. Es poco probable con la hora automática.

## Historial

- 2026-10-30 — Al correr los casos manuales de T18: la alerta por hora de regreso la crea el servidor y la app no la veía (CA-17). Durante la grabación, `useSafetySession` consulta `GET /safety/sessions/:clientId` cada 30 s; una alerta activa que el teléfono no conoce se guarda en SQLite con su id del servidor como id local (`sessionActions.adoptarAlerta`), así se muestra, se cancela y se pregunta al detener como las demás (CA-25, CA-26). La respuesta también da a quiénes se entregó la alerta.
- 2026-10-29 — Al implementar T18: la sesión de seguridad solo se crea con contactos activos (sin ellos no hay a quién avisar). `lib/safety/sessionActions.ts` la inicia, cambia la hora de regreso y la termina; una hora de regreso que ya no es válida al iniciar se descarta para que el servidor no rechace la sesión. Al cerrar las actividades huérfanas al abrir la app también se termina su sesión, para que el servidor no avise por la hora de regreso de una actividad que ya no sigue. La alerta activa muestra como destinatarios los contactos activos del teléfono.
- 2026-10-29 — Al implementar T17: además de la notificación programada de respaldo, la tarea muestra "¿Estás bien?" en cuanto el detector llega a los 10 min (Android 14 no da alarmas exactas por omisión). Lo que pide el detector, la respuesta desde la notificación y la alerta a los 12 min se atienden en `lib/safety/areYouOk.ts`, sin pantallas montadas; "Estoy bien" reinicia el detector en la misma cola que las ubicaciones. El modal lee el estado del detector en SQLite cada segundo. El permiso de notificaciones se pide al iniciar con contactos activos; sin él, en Android 13+ tampoco se ve la notificación del servicio que graba.
- 2026-10-26 — Al implementar T16: un solo procesador de ubicaciones (`lib/safety/recording.ts`) guarda los puntos, corre el detector y encola la ubicación en los dos modos; sin el permiso en segundo plano, `watchPositionAsync` pide un punto cada 2 s sin distancia mínima y un temporizador de 10 s hace correr el detector aunque no lleguen puntos. La tarea busca en SQLite la actividad en curso y usa `killServiceOnDestroy`: cerrar la app detiene la grabación, como en la spec 003. `safetySync` se configura en `SyncProvider` junto con el motor de la 005.
- 2026-10-23 — Al implementar T14: `safety_sessions` guarda también el usuario, cuándo se encoló la última ubicación y la última alerta. Cancelar una alerta la marca cancelada sin borrar sus ids, para que la bandeja pueda mandar la cancelación con el id del servidor aunque la alerta se haya enviado después; la cancelación se encola por `clientAlertId`.
- 2026-10-23 — Al implementar T13: la cuenta regresiva de "¿Estás bien?" empieza al preguntar y no a los 10 min exactos (una notificación programada puede retrasarse: Android 14 no da alarmas exactas por omisión); moverse más de 30 m durante la pregunta cuenta como respuesta (RN-4); la bandeja se envía en orden cronológico en lugar de por tipo, y una alerta y su cancelación que no se han enviado se descartan juntas.
- 2026-10-22 — Al implementar T8: la tarea no repite la alerta por una hora de regreso que ya avisó, aunque el usuario la haya cancelado; cambiar la hora a una posterior permite volver a avisar.
- 2026-10-22 — Al implementar T7: `latitude`, `longitude` y `locationAt` de una alerta pueden ir en `null`, las tres juntas (un SOS antes de la primera posición del GPS); una ubicación incompleta da `400`. El mensaje dice entonces que la app no registró ninguna ubicación.
- 2026-10-22 — Aprobado por el usuario. La constitución pasa a v1.6 con las dependencias nuevas en el stack.
- 2026-10-22 — El canal pasa de WhatsApp a Telegram (spec, P15): módulo `telegram` con webhook y `getUpdates`, contactos por invitación sin teléfono, D2 y D10 a D12 nuevas o reescritas, y referencias a los CA renumerados.
- 2026-10-22 — Creación.
