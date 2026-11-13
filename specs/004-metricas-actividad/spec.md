# 004 — Métricas de actividad y resumen

- **Estado:** Implementada con pendientes (aprobada 2026-10-05)
- **Semana:** 4
- **Autor(es):**
- **Fecha:** 2026-10-05

## Contexto y objetivo

Objetivo de la semana 4: **al finalizar una actividad, el usuario ve distancia, tiempo y elevación calculados.** Hoy la app solo informa cuántos puntos GPS guardó (spec 003), un dato que no le dice nada útil a quien sale a la sierra.

La altitud del GPS es poco precisa: puede variar decenas de metros con el teléfono quieto, lo que infla la elevación ganada. Por eso, en los teléfonos que tienen sensor de presión atmosférica (barómetro), la elevación debe calcularse con él.

Estas métricas corresponden a los campos de actividad del modelo de datos del servidor (distancia, duración, elevación ganada y perdida), que se suben en la sincronización (005) y se muestran en el catálogo de rutas (006–007).

## Historias de usuario

- **HU-1:** Como usuario, al detener una actividad quiero ver un resumen con la duración, la distancia, la elevación ganada y perdida y mi ritmo o velocidad promedio, para saber cuánto hice.
- **HU-2:** Como usuario de senderismo o trail running, quiero que la elevación sea confiable aunque el GPS sea impreciso en altitud, para comparar el esfuerzo entre rutas.
- **HU-3:** Como usuario sin señal, quiero ver mis métricas aunque no tenga internet.
- **HU-4:** Como usuario, quiero que una actividad interrumpida (app cerrada a la fuerza) también tenga sus métricas, para no perder el registro de lo que hice.
- **HU-5:** Como usuario, quiero ver la distancia y la elevación acumuladas mientras grabo, para saber cuánto llevo.
- **HU-6:** Como usuario, quiero ver la lista de mis actividades anteriores y abrir el resumen de cualquiera de ellas.

## Criterios de aceptación

### Resumen

- **CA-1 (HU-1):** Dada una actividad en curso, cuando presiono "Detener actividad", entonces veo una pantalla de resumen con el tipo de actividad, la fecha y hora de inicio, la duración, la distancia, la elevación ganada, la elevación perdida y el ritmo o la velocidad promedio.
- **CA-2 (HU-1):** Dado el resumen que aparece al detener, cuando presiono "Listo", entonces regreso a la pantalla principal y el botón atrás no me devuelve al resumen ni a la actividad terminada.
- **CA-3 (HU-3):** Con el teléfono en modo avión, el resumen se muestra completo igual que con conexión.

### Duración, ritmo y velocidad

- **CA-4 (HU-1):** La duración es el tiempo entre el inicio y el fin de la actividad, incluido el tiempo que estuve detenido.
- **CA-5 (HU-1):** En senderismo y trail running el resumen muestra el **ritmo promedio** en minutos por kilómetro (`12:30 /km`); en ciclismo muestra la **velocidad promedio** en km/h (`18.4 km/h`). Ambos se calculan con la distancia y la duración totales.
- **CA-6 (HU-1):** Dada una distancia de 0, el ritmo o la velocidad se muestran como `—` sin errores.

### Distancia

- **CA-7 (HU-1):** Dado un conjunto de puntos de prueba con distancia conocida, la distancia calculada coincide con la esperada con un error máximo de 1 %.
- **CA-8 (HU-1):** Los puntos con precisión horizontal peor que **20 m** no cuentan para la distancia.
- **CA-9 (HU-1):** Dado que permanezco quieto 5 minutos con la actividad grabando, la distancia aumenta **menos de 20 m**.
- **CA-25 (HU-1):** Un salto de ubicación imposible no suma a la distancia: si un punto implica una velocidad mayor a **50 m/s (180 km/h)** respecto al punto anterior (p. ej. el GPS entrega primero una ubicación guardada de otro lugar, o un brinco aislado de cientos de metros), ese tramo no cuenta y el recorrido continúa desde el punto nuevo.

### Elevación

- **CA-10 (HU-2):** La elevación ganada es la suma de las subidas del recorrido y la elevación perdida es la suma de las bajadas, ambas en valor positivo. Una no reduce a la otra.
- **CA-11 (HU-2):** Las variaciones de altitud menores al umbral de ruido no suman ni a la elevación ganada ni a la perdida. Umbral: **3 m** con barómetro y **10 m** con GPS. Dado un conjunto de lecturas de prueba que oscilan dentro del umbral sin subir ni bajar de verdad, ambas elevaciones son 0.
- **CA-12 (HU-2):** Dado un teléfono con barómetro, la elevación se calcula con los cambios de presión registrados durante la actividad, también con la pantalla apagada o la app en segundo plano, y el resumen indica "Elevación medida con barómetro".
- **CA-13 (HU-2):** Dado un teléfono sin barómetro, si el sistema no permite leerlo (p. ej. se negó el permiso de sensores de movimiento), o si sus lecturas no cubren la actividad (RN-7), la actividad se graba igual, la elevación se calcula con la altitud GPS y el resumen indica "Elevación estimada con GPS".
- **CA-14 (HU-2):** Las lecturas del barómetro se toman solo mientras hay una actividad grabando y se guardan en el teléfono junto con la actividad, sin necesidad de conexión.

### Métricas en vivo

- **CA-15 (HU-5):** Mientras grabo, la pantalla de actividad muestra, además del tiempo, la distancia y la elevación ganada acumuladas, actualizadas al recibir nuevos datos de ubicación o del barómetro.
- **CA-16 (HU-5):** Las métricas en vivo usan los mismos umbrales que el resumen (CA-8, CA-11). Cuando se detiene, el resumen se calcula con lo guardado en el teléfono (RN-4).

### Casos límite y persistencia

- **CA-17 (HU-1):** Dada una actividad con 0 o 1 punto válido, el resumen muestra distancia 0, elevación ganada y perdida 0 y ritmo o velocidad `—`, sin errores.
- **CA-18 (HU-3):** Al detener una actividad, sus métricas (duración, distancia, elevación ganada, elevación perdida y la fuente de la elevación) quedan guardadas en el teléfono junto a la actividad, para que la sincronización (005) las use sin recalcular.
- **CA-19 (HU-4):** Dada una actividad que se cerró automáticamente al abrir la app (spec 003, CA-10), sus métricas se calculan y guardan igual que si se hubiera detenido normalmente.

### Historial

- 2026-10-08 — Implementada con pendientes: T1–T20 hechas, 71 pruebas Vitest pasan y la mayoría de los CA se verificaron en el emulador. Faltan los casos M2, M3, M4, M5, M7 (paso 1) y M8 (ver `tasks.md`).
- 2026-10-06 — Se agrega CA-25 (saltos de ubicación imposibles), hallado al probar en el emulador: el primer punto fue la ubicación por defecto del emulador y la distancia sumó ~789 km. Aprobado por el usuario.
- **CA-20 (HU-6):** Desde la pestaña Actividades puedo abrir "Mis actividades": una lista de las actividades terminadas del usuario de la sesión, de la más reciente a la más antigua, con fecha, tipo, duración y distancia.
- **CA-21 (HU-6):** Cuando toco una actividad de la lista, veo su resumen con los mismos datos que en CA-1; el botón atrás me regresa a la lista.
- **CA-22 (HU-6):** Si no tengo actividades terminadas, la lista muestra un mensaje que invita a iniciar una.
- **CA-23 (HU-3, HU-6):** La lista y los resúmenes funcionan sin conexión.
- **CA-24 (HU-6):** Las actividades de otro usuario que haya iniciado sesión en el mismo teléfono no aparecen en mi lista.

## Reglas de negocio y validaciones

- RN-1: Formato en pantalla: duración `mm:ss` o `hh:mm:ss`; distancia en kilómetros con 2 decimales (`3.42 km`), o en metros si es menor a 1 km (`640 m`); elevación en metros enteros (`312 m`); ritmo `mm:ss /km`; velocidad en km/h con 1 decimal.
- RN-2: No hay pausa (spec 003), así que la duración, el ritmo y la velocidad incluyen el tiempo detenido.
- RN-3: La fuente de la elevación (barómetro o GPS) se decide por actividad, no por punto: una actividad no mezcla ambas fuentes.
- RN-4: Las métricas del resumen y del historial se calculan a partir de lo guardado en el teléfono, no de lo que se mostró en pantalla durante la grabación.
- RN-5: El ritmo o la velocidad promedio se derivan de la distancia y la duración; no se guardan como dato aparte.
- RN-6: El historial solo muestra actividades con dueño igual al usuario de la sesión. Las actividades grabadas antes de que existiera el dueño (spec 003, T1) no aparecen.
- RN-7: Las lecturas del barómetro cubren la actividad si los tramos de más de 60 s sin lecturas suman menos del 10 % de su duración, contando del inicio a la primera lectura y de la última al fin. Si no la cubren, toda la actividad usa GPS (RN-3).

## Requisitos no funcionales

- Offline: todo el cálculo y el historial ocurren en el teléfono (constitución 2.1).
- Rendimiento: el resumen de una actividad de 3 horas aparece en menos de 1 segundo tras presionar "Detener"; las métricas en vivo no deben hacer que la pantalla se trabe.
- Batería: la lectura del barómetro no debe tomarse con más frecuencia de la necesaria (del orden de una lectura por segundo como máximo).
- Privacidad: el barómetro solo se lee entre "Iniciar" y "Detener", igual que el GPS (constitución 3.5).

## Fuera de alcance

- Subir las métricas al backend → **005-sincronizacion**.
- Mapa del recorrido y perfil de elevación en el resumen → **007-publicar-rutas** (vista de detalle).
- Dificultad estimada de la ruta → **007-publicar-rutas**.
- Validar la precisión de distancia y elevación en una ruta real → **011-estabilidad** (prueba de campo). Aquí la precisión se verifica con datos de prueba.
- Borrar o editar actividades del historial (fuera del roadmap actual).
- Pausar y reanudar una actividad (fuera del roadmap actual).
- Altitud absoluta calibrada (altitud sobre el nivel del mar con barómetro).

## Preguntas abiertas

Resueltas el 2026-10-05:

- [x] **P1:** Elevación perdida → **sí**, como en el modelo de datos del servidor (`elevationLossMeters`). CA-1, CA-10, CA-18.
- [x] **P2:** Métricas en vivo → **sí**. HU-5, CA-15, CA-16.
- [x] **P3:** Umbral de precisión GPS → **20 m**. CA-8.
- [x] **P4:** Ruido con el teléfono quieto → **menos de 20 m en 5 minutos**. CA-9.
- [x] **P5:** Ruido de elevación → **3 m con barómetro, 10 m con GPS**. CA-11.
- [x] **P6:** Ritmo o velocidad promedio → **sí**: ritmo para senderismo y trail running, velocidad para ciclismo. CA-5, CA-6.
- [x] **P7:** Historial de actividades → **sí**, incluido en esta spec. HU-6, CA-20 a CA-24.

## Historial

- 2026-11-12 — CA-12 pide las lecturas también con la pantalla apagada; CA-13 y RN-7 nuevos: si las lecturas no cubren la actividad, se usa GPS. La spec 011 (prueba de campo, F3) encontró que con la pantalla apagada no llegaba ninguna lectura y la actividad quedaba con 0 m y fuente "barómetro". Aprobado por el usuario.
- 2026-11-05 — Referencias actualizadas por la nueva numeración del roadmap: 010-mapa-3d-animaciones, 011-estabilidad y 012-entrega. Sin cambios de comportamiento.
- 2026-11-01 — Pasos de navegación de los casos manuales actualizados a la barra de pestañas de la spec 009 (T19, CA-15). CA-20: "Mis actividades" se abre desde la pestaña Actividades, no desde un botón de la pantalla principal (spec 009, RN-2). La "pantalla principal" de CA-2 es la pestaña Inicio. Casos M1, M2 y M6 a M8.
- 2026-10-05 — Aprobada por el usuario.

- 2026-10-05 — Se resuelven las preguntas abiertas P1–P7: se agregan elevación perdida, ritmo/velocidad, métricas en vivo e historial.
- 2026-10-05 — Creación.
