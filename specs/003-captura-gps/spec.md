# 003 — Captura de GPS y guardado local

- **Estado:** Implementada (aprobada 2026-09-30)
- **Semana:** 3
- **Fecha:** 2026-09-30

## Contexto y objetivo

Objetivo de la semana 3: **la app registra una ruta con puntos GPS y la guarda localmente.** Es la base de las métricas (004), la sincronización (005) y la alerta por inactividad (008). En la sierra no suele haber señal, así que la grabación funciona sin conexión.

## Historias de usuario

- **HU-1:** Como usuario, quiero iniciar una actividad eligiendo su tipo (senderismo, trail running o ciclismo) para registrar mi recorrido.
- **HU-2:** Como usuario, quiero ver mientras grabo que la app está registrando (tiempo transcurrido y puntos capturados).
- **HU-3:** Como usuario, quiero detener la actividad y saber que quedó guardada en mi teléfono, aunque no tenga internet.
- **HU-4:** Como usuario, quiero entender qué pasa si no doy permiso de ubicación y cómo darlo.

## Criterios de aceptación

- **CA-1 (HU-1):** Desde la pantalla principal puedo abrir la pantalla "Actividad", elegir el tipo (por defecto Senderismo) y presionar "Iniciar actividad".
- **CA-2 (HU-4):** Si no he concedido el permiso, al presionar "Iniciar" la app pide el permiso de ubicación en primer plano con el texto de propósito de SendaBC.
- **CA-3 (HU-4):** Si niego el permiso, la actividad no inicia y veo un mensaje que lo explica. Si el sistema ya no permite volver a preguntar, el mensaje ofrece un botón para abrir los ajustes de la app.
- **CA-4 (HU-1):** Al iniciar, se crea en SQLite una actividad con `client_generated_id` (UUID v4), el tipo elegido, el usuario de la sesión, estado `RECORDING` y `startedAt`.
- **CA-5 (HU-2):** Mientras grabo, la pantalla muestra el tiempo transcurrido (mm:ss o hh:mm:ss) y el número de puntos capturados, actualizados en vivo.
- **CA-6 (HU-3):** Cada punto recibido se guarda en SQLite con latitud, longitud, altitud, precisión, hora del GPS y un número de secuencia creciente que empieza en 1. Si un punto no se pudo guardar, su número no se reutiliza y la secuencia puede tener un hueco (limitación aceptada, O2).
- **CA-7 (HU-3):** Con el teléfono en modo avión durante toda la actividad, los puntos se siguen guardando.
- **CA-8 (HU-3):** Al presionar "Detener actividad", se deja de escuchar el GPS, la actividad queda con `endedAt` y estado `PENDING_SYNC`, y la app muestra el resumen de la actividad (spec 004) con "N puntos registrados", donde N se lee de SQLite.
- **CA-9 (HU-1):** Un doble toque en "Iniciar" no crea dos actividades.
- **CA-10 (HU-3):** Si la app se cerró (o se salió de la pantalla) con una actividad en `RECORDING`, al volver a abrir la app esa actividad se cierra con `endedAt` igual a la hora de su último punto (o `startedAt` si no tiene puntos) y queda en `PENDING_SYNC`. Nunca quedan actividades huérfanas en `RECORDING`.
- **CA-11 (HU-2):** Mientras grabo, la pantalla no se apaga sola. Al detener la actividad (o salir de la pantalla), el teléfono vuelve a su comportamiento normal de apagado.
- **CA-12 (HU-3):** Si al detener no se puede cerrar la actividad en el teléfono, la grabación se detiene igual, la pantalla deja de mostrar "Detener actividad" y muestra "No se pudo cerrar la actividad. Se completará automáticamente al volver a abrir la app." con un botón "Volver". No se puede iniciar otra actividad desde esa pantalla, y la actividad se cierra al abrir la app (CA-10).
- **CA-13 (HU-3):** Si al iniciar el GPS entrega una ubicación guardada de antes de la actividad, no se guarda como punto, no suma distancia y no aparece en el recorrido (RN-5).
- **CA-14 (HU-3):** Si cambio el tamaño de letra del sistema mientras grabo, la actividad sigue en curso y no se pierde ningún punto.
- **CA-15 (HU-3):** Si intento salir de la pantalla mientras grabo, con la flecha o con el botón o gesto atrás del sistema, la app pregunta si quiero terminar la actividad. Si elijo seguir, la grabación continúa sin cambios; si elijo terminar, la actividad se cierra como en CA-10. "Detener actividad" no pregunta.
- **CA-16 (HU-1):** Si al presionar "Iniciar actividad" la actividad no se puede iniciar (por ejemplo, porque no se puede guardar en el teléfono), la pantalla sigue en "Nueva actividad", muestra "No se pudo iniciar la actividad. Intenta de nuevo." y "Iniciar actividad" sigue disponible para reintentar. No queda ninguna actividad en `RECORDING` ni se sigue escuchando la ubicación ni el barómetro (RN-1, constitución 3.5). Si la actividad ya se había creado, se cierra como en CA-10.

## Reglas de negocio

- RN-1: Solo puede haber una actividad en `RECORDING` a la vez.
- RN-2: Configuración del GPS: precisión alta, mínimo 5 m entre puntos y, en Android, mínimo 2 s.
- RN-3: Se guardan todos los puntos recibidos con su precisión, salvo la excepción de RN-5; el filtrado de puntos imprecisos para calcular métricas es parte de la spec 004.
- RN-4: Las actividades locales pertenecen al usuario de la sesión, para no mezclar datos si otra persona inicia sesión en el mismo teléfono.
- RN-5: Una ubicación con hora de más de 30 s antes de `startedAt` se descarta si la actividad aún no tiene puntos y lleva menos de 1 minuto en curso. Pasado ese minuto se acepta, para que un teléfono con el reloj desfasado respecto al GPS no pierda la grabación (constitución 2.1). Una ubicación descartada tampoco cuenta para la detección de inactividad ni se envía al servidor (spec 008).

## Requisitos no funcionales

- Offline: ninguna parte de esta spec hace peticiones de red (constitución 2.1).
- Privacidad: solo se escucha la ubicación entre "Iniciar" y "Detener" (constitución 3.5).
- Un error al guardar un punto no detiene la grabación.

## Fuera de alcance

- Grabación en segundo plano / con pantalla bloqueada (posible extensión; requiere permiso de ubicación en segundo plano y `TaskManager`).
- Pausar y reanudar.
- Mapa del recorrido en vivo (spec 010).
- Barómetro, distancia, elevación y resumen (spec 004).
- Subir la actividad al backend (spec 005).

## Preguntas abiertas

- [x] ¿Se mantiene la pantalla encendida durante la grabación? **Sí**: mientras no haya grabación en segundo plano, se usa `expo-keep-awake` solo entre "Iniciar" y "Detener" (ver CA-11).

## Historial

- 2026-11-09 — Se agrega CA-16. Al implementar la spec 011 (T39, M20) se vio que, si falla el inicio, la pantalla se queda en "Nueva actividad" sin avisar nada. Aprobado por el usuario.
- 2026-11-06 — "Fuera de alcance": el mapa de grabación quedó en la spec 010, no en las 006 y 007 (spec 010, T25).
- 2026-11-06 — Se agrega CA-15. En la spec 010 (T16) un toque accidental en la flecha terminó una actividad sin preguntar y sin forma de reanudarla. Aprobado por el usuario.
- 2026-11-06 — Se agrega CA-14. La spec 010 (T16) encontró que cambiar el tamaño de letra del sistema recreaba la pantalla y cerraba la actividad como huérfana. Aprobado por el usuario.
- 2026-11-06 — Se agregan CA-13 y RN-5, y RN-3 cambia para admitir esa excepción. La spec 010 (T16, M13) encontró que el GPS puede entregar al iniciar una ubicación guardada: quedaba como primer punto y, en un traslado en coche, sumaba kilómetros falsos. Aprobado por el usuario.
- 2026-11-01 — Pasos de navegación de los casos manuales actualizados a la barra de pestañas de la spec 009 (T19, CA-15). La grabación se abre con "Empezar" en la tarjeta "Nueva actividad" de la pestaña Inicio. CA-1 no cambia: la pestaña Inicio es la pantalla principal.
- 2026-10-16 — Casos M3 (permiso negado y bloqueado) y M8 (pantalla encendida, con Metro en `--no-dev`) aprobados en el emulador. Los 12 CA verificados; la spec pasa a Implementada.
- 2026-10-15 — Se cierran las observaciones de la revisión: O2 se acepta como limitación conocida (CA-6 pasa de secuencia "consecutiva" a "creciente"; el servidor solo exige que no se repita) y O3 se corrige con el nuevo CA-12.
- 2026-10-05 — Spec 004: el mensaje "Actividad guardada: N puntos" de CA-8 se reemplaza por la pantalla de resumen, que muestra el mismo N ("N puntos registrados"). La observación O1 queda corregida: `stop()` espera los guardados en curso antes de cerrar la actividad (004, T14).
- 2026-10-05 — Verificación de código: los 11 CA están implementados. Queda como *Implementada con pendientes* hasta ejecutar M1 y M3–M8 en un dispositivo; observaciones O1–O3 en `tasks.md`.
- 2026-10-01 — Tareas T1–T13 implementadas. Falta la verificación manual en dispositivo (M1–M8 en `tasks.md`).
- 2026-09-30 — Aprobada. Se resuelve la pregunta abierta: pantalla encendida durante la grabación (CA-11).
- 2026-09-30 — Spec creada. Parte de la funcionalidad ya estaba implementada (permiso, inicio/detención y guardado en SQLite desde la pantalla principal).
