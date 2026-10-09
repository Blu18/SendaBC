# 005 — Sincronización offline-first de actividades

- **Estado:** Aprobada (2026-10-08)
- **Semana:** 5
- **Autor(es):**
- **Fecha:** 2026-10-08

## Contexto y objetivo

Objetivo de la semana 5: **una actividad grabada sin señal se sincroniza correctamente al recuperar conexión.**

Hoy las actividades (spec 003) y sus métricas (spec 004) solo existen en el teléfono: si se pierde o se reinstala la app, se pierden. Además, el catálogo de rutas (006), la publicación (007) y la alerta por inactividad (008) necesitan que las actividades estén en el servidor. En la sierra casi nunca hay señal, así que la subida tiene que esperar a que la haya, sin que el usuario tenga que acordarse.

## Historias de usuario

- **HU-1:** Como usuario, quiero que mis actividades terminadas se suban solas a mi cuenta cuando haya internet, sin tener que hacer nada.
- **HU-2:** Como usuario, quiero saber qué actividades ya están guardadas en mi cuenta y cuáles siguen solo en el teléfono, y poder pedir que se sincronicen en ese momento.
- **HU-3:** Como usuario, quiero que una conexión que se corta a la mitad no me haga perder ni duplicar actividades.
- **HU-4:** Como usuario, quiero que mis actividades lleguen al servidor tal como las vi en el resumen (mismas métricas y mismo recorrido).
- **HU-5:** Como usuario que reinstaló la app o cambió de teléfono, quiero recuperar mis actividades guardadas en mi cuenta.
- **HU-6:** Como usuario, quiero que me avisen si cierro sesión con actividades que todavía no se subieron.

## Criterios de aceptación

### Subida automática

- **CA-1 (HU-1):** Dada una actividad terminada con sus métricas calculadas y una conexión disponible (Wi-Fi o datos móviles), la app la sube sin intervención del usuario en cualquiera de estos momentos: al terminar la actividad, al abrir la app y al recuperar la conexión.
- **CA-2 (HU-1):** Dadas varias actividades pendientes (p. ej. 5 grabadas en un fin de semana sin señal), cuando hay conexión, todas se suben.
- **CA-3 (HU-1):** Una actividad en grabación, o terminada pero con métricas aún sin calcular, nunca se sube.
- **CA-4 (HU-1):** La sincronización no bloquea la app: puedo navegar e iniciar una actividad nueva mientras se suben otras.

### Resultado en el servidor

- **CA-5 (HU-4):** Dada una actividad subida, el servidor la guarda asociada a mi cuenta con su tipo, inicio, fin, todos sus puntos (ubicación, altitud, precisión, hora y orden), las métricas calculadas en el teléfono (distancia, duración, elevación ganada y perdida) y la fuente de la elevación (barómetro o GPS), con los mismos valores que muestra el resumen. El servidor no recalcula las métricas.
- **CA-6 (HU-4):** El recorrido de la actividad queda guardado en el servidor de forma que se puedan hacer consultas geográficas sobre él (base para las rutas cercanas de la spec 006).
- **CA-7 (HU-1):** Una actividad de 3 horas (≈ 5 400 puntos) se sube correctamente.
- **CA-8 (HU-4):** Las lecturas crudas del barómetro no se suben; se quedan en el teléfono.

### Fallos y reintentos

- **CA-9 (HU-3):** Si no hay conexión o el servidor no responde, la actividad sigue pendiente, sus datos en el teléfono no cambian y la app vuelve a intentarlo esperando 30 s, luego 1 min, 2 min, 4 min… hasta un máximo de 15 min entre intentos, sin límite de intentos. Recuperar la conexión, abrir la app o deslizar en "Mis actividades" (CA-16) intenta de inmediato.
- **CA-10 (HU-3):** Si la misma actividad llega dos veces al servidor (p. ej. el servidor la guardó pero la respuesta se perdió y la app la reenvió), el servidor no la duplica y la app la marca como sincronizada.
- **CA-11 (HU-3):** Si el servidor rechaza una actividad por datos inválidos (p. ej. fin anterior al inicio o coordenadas fuera de rango), esa actividad deja de reintentarse automáticamente, se marca como "No se pudo subir" y las demás actividades pendientes se suben normalmente.
- **CA-12 (HU-3):** Si mi sesión expira durante la sincronización, ninguna actividad se pierde ni se marca como sincronizada; se suben cuando vuelvo a iniciar sesión.
- **CA-13 (HU-3):** Una actividad solo se marca como sincronizada cuando el servidor confirma que la guardó.

### Estado visible y sincronización manual

- **CA-14 (HU-2):** En "Mis actividades" y en el resumen de cada actividad veo su estado: "Pendiente de subir", "Sincronizada" o "No se pudo subir".
- **CA-15 (HU-2):** Cuando una actividad termina de subirse mientras tengo abierta la lista, su estado se actualiza sin salir de la pantalla.
- **CA-16 (HU-2):** Cuando deslizo hacia abajo en "Mis actividades", la app sincroniza en ese momento: sube las pendientes (incluidas las marcadas "No se pudo subir") y descarga las que falten (CA-20). Mientras tanto se ve un indicador de carga. Sin conexión, el indicador desaparece y se muestra un mensaje de que no hay conexión.

### Propiedad y seguridad

- **CA-17 (HU-1):** Solo se suben las actividades cuyo dueño es el usuario de la sesión. Las de otra persona que haya usado el mismo teléfono esperan a que esa persona inicie sesión.
- **CA-18 (HU-1):** El servidor asocia cada actividad a la cuenta del token con que se envió, nunca a un usuario indicado en los datos enviados. Sin token válido responde `401` y no guarda nada.
- **CA-19 (HU-1):** Las actividades sin dueño (grabadas antes de la spec 003, T1) se quedan solo en el teléfono: no se suben ni se borran.

### Recuperar actividades

- **CA-20 (HU-5):** Dado que inicio sesión en un teléfono que no tiene mis actividades (reinstalación u otro teléfono) y hay conexión, mis actividades guardadas en el servidor aparecen en "Mis actividades" con estado "Sincronizada".
- **CA-21 (HU-5):** El resumen de una actividad recuperada muestra los mismos datos que tenía en el teléfono original: tipo, fecha y hora, duración, distancia, elevación ganada y perdida, ritmo o velocidad, número de puntos y fuente de la elevación.
- **CA-22 (HU-5):** Una actividad que ya existe en el teléfono no se duplica al recuperar.
- **CA-23 (HU-5):** Después de recuperarlas, las actividades y sus resúmenes se pueden consultar sin conexión.

### Cierre de sesión

- **CA-24 (HU-6):** Dado que tengo N actividades sin subir, cuando presiono "Cerrar sesión", la app me avisa ("Tienes N actividades sin subir. Se subirán cuando vuelvas a iniciar sesión.") y me deja cancelar o cerrar sesión de todas formas. Si cierro sesión, las actividades se conservan en el teléfono. Con 0 pendientes no hay aviso.

## Reglas de negocio y validaciones

- RN-1: El identificador generado en el teléfono (`client_generated_id`) identifica la actividad de forma única en el servidor; es lo que permite detectar reenvíos (CA-10) y evitar duplicados al recuperar (CA-22).
- RN-2: Las actividades son inmutables después de terminar: no hay ediciones que sincronizar, solo altas. Si el servidor ya tiene una actividad con ese identificador, la versión del servidor se conserva.
- RN-3: Estados de una actividad en el teléfono: `RECORDING` → `PENDING_SYNC` → `SYNCED` (constitución 2.3). "No se pudo subir" es una marca sobre `PENDING_SYNC`, no un estado nuevo del ciclo. Las actividades recuperadas del servidor entran directamente como `SYNCED`.
- RN-4: Sincronizar nunca borra datos del teléfono (constitución 2.4).
- RN-5: El servidor valida cada actividad: tipo válido, fin igual o posterior al inicio (una actividad que se cerró sin puntos dura 0 s, spec 003 CA-10), latitudes entre −90 y 90, longitudes entre −180 y 180, secuencia de puntos sin repetir, métricas no negativas y fuente de elevación válida.
- RN-6: Una actividad recuperada no tiene lecturas del barómetro en el teléfono (CA-8); sus métricas son las guardadas en el servidor y no se recalculan.

## Requisitos no funcionales

- Offline-first: grabar y consultar actividades nunca depende de la sincronización (constitución 2.1).
- Red: se sincroniza con Wi-Fi y con datos móviles, solo con la app abierta. Subir una actividad de 3 h debe usar del orden de 1 MB o menos.
- Seguridad: todas las peticiones de sincronización van autenticadas (constitución 3.3) y por HTTPS en producción.
- Batería: no se hacen intentos mientras el teléfono no tiene conexión.

## Fuera de alcance

- Sincronizar con la app cerrada (en segundo plano).
- Editar o borrar actividades (fuera del roadmap actual).
- Recuperar las lecturas crudas del barómetro (no se suben, CA-8).
- Publicar una actividad como ruta pública → **007-publicar-rutas**.
- Rutas cercanas y consultas geográficas → **006-rutas-cercanas** (esta spec solo deja el recorrido guardado de forma consultable).
- Enviar al servidor la ubicación en vivo durante la actividad para la alerta por inactividad → **008-alerta-inactividad**.

## Preguntas abiertas

Resueltas el 2026-10-08:

- [x] **P1:** Actividades sin dueño → **se quedan en el teléfono**. CA-19.
- [x] **P2:** Lecturas crudas del barómetro → **no se suben**. CA-8, RN-6.
- [x] **P3:** Fuente de la elevación → **se guarda en el servidor**. CA-5, RN-5.
- [x] **P4:** Sincronización manual → **deslizando hacia abajo en "Mis actividades"**. CA-16.
- [x] **P5:** Reintentos → **30 s, 1 min, 2 min… hasta un máximo de 15 min, sin límite de intentos**. CA-9.
- [x] **P6:** Recuperar actividades al reinstalar o cambiar de teléfono → **sí, incluido en esta spec**. HU-5, CA-20 a CA-23.
- [x] **P7:** Cerrar sesión con pendientes → **avisar con el número de actividades**. HU-6, CA-24.
- [x] **P8:** Red → **Wi-Fi y datos móviles**. CA-1, requisitos no funcionales.

## Historial

- 2026-10-09 — RN-5: el fin puede ser igual al inicio. Una actividad que se cierra al abrir la app sin haber recibido puntos queda con fin = inicio (spec 003, CA-10) y no debe quedar como "No se pudo subir" para siempre.
- 2026-10-08 — Aprobada por el usuario.
- 2026-10-08 — Se resuelven las preguntas abiertas P1–P8: se agregan sincronización manual, recuperación de actividades y aviso al cerrar sesión.
- 2026-10-08 — Creación.
