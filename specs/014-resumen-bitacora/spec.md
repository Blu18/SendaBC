# 014 — Resumen, bitácora y estilo con sombras en toda la app

- **Estado:** Implementada con pendientes (aprobada 2026-11-21; cerrada 2026-11-22)
- **Semana:** 10
- **Autor(es):**
- **Fecha:** 2026-11-21

## Contexto y objetivo

El resumen de una actividad (spec 004) es lo primero que el usuario ve al volver de una salida, y hoy es una tarjeta con seis cifras del mismo tamaño. La subida, que es lo que más se siente en una ruta de montaña, pesa lo mismo que la elevación perdida. Además, el resumen no muestra ni el recorrido ni la forma del terreno, aunque el teléfono ya guarda los puntos. "Mis actividades" es una lista plana: cada fila repite la insignia "Sincronizada" y usa el ícono del deporte, así que todas las salidas del mismo tipo se ven iguales.

El objetivo es que el resumen cuente cómo fue la salida (cuánto, por dónde y qué tanto se subió) y que Mis actividades sirva como bitácora: agrupada por mes y con cada salida reconocible por su recorrido. Usa el sistema de diseño de la spec 009 y la miniatura de recorrido de la spec 013, sin tipografía nueva. El único token nuevo es el color de las sombras (RN-11). El diseño elegido es la versión 3, con sombras: https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX?node-id=80-6835.

Al aprobar el diseño del resumen y la bitácora (versión 3), el usuario decidió llevar ese estilo a toda la app: tarjetas con sombra, barras fijas elevadas, íconos en círculo con tinte y listas agrupadas con divisores con sangría. Si solo dos pantallas lo tuvieran, la app se vería como dos productos distintos. Esta ampliación cambia solo la presentación de las demás pantallas; su comportamiento sigue siendo el de sus specs.

## Historias de usuario

- **HU-1:** Como usuario que acaba de terminar una salida, quiero ver primero la distancia y algo que la ponga en contexto, para saber de un vistazo cómo me fue.
- **HU-2:** Como usuario, quiero ver en el resumen el perfil de elevación de mi salida, con el punto más alto y lo que subí y bajé, para entender qué tan dura fue.
- **HU-3:** Como usuario, quiero ver en el resumen el recorrido que hice, para reconocer por dónde fui.
- **HU-4:** Como usuario, quiero ver mis actividades agrupadas por mes con el total de cada mes, para saber cuánto salí en cada uno.
- **HU-5:** Como usuario, quiero reconocer cada actividad de la lista por la forma de su recorrido y ver su estado de sincronización solo cuando requiere atención, para encontrar una salida sin leer cada fila.
- **HU-6:** Como usuario, quiero que el resumen y Mis actividades funcionen sin conexión, como hoy, para consultarlos en el campo.
- **HU-7:** Como equipo, queremos aprobar el diseño en Figma antes de programarlo.
- **HU-8:** Como usuario, quiero que todas las pantallas de la app tengan el mismo estilo que el resumen y la bitácora, para que la app se sienta coherente y fácil de leer.

## Criterios de aceptación

### Resumen: distancia y contexto

- **CA-1 (HU-1):** Dado el resumen de una actividad, cuando lo abro, entonces la distancia es la cifra más grande de la pantalla y está visible sin desplazarme, junto con el tipo de actividad, la fecha y hora de inicio y su estado de sincronización (spec 005). Valores y formatos son los mismos de la spec 004 (RN-1).
- **CA-2 (HU-1):** Dada una actividad que cumple una de las reglas de contexto (RN-3), cuando abro su resumen, entonces veo debajo de la distancia una sola línea que lo dice (p. ej. "Tu caminata más larga de octubre").
- **CA-3 (HU-1):** Dada una actividad que no cumple ninguna regla de contexto, cuando abro su resumen, entonces no aparece la línea, sin dejar un hueco.

### Resumen: perfil de elevación

- **CA-4 (HU-2):** Dada una actividad con altitudes registradas, cuando abro su resumen, entonces veo su perfil de elevación a todo el ancho de la pantalla, de inicio a fin del recorrido, con la elevación ganada y la perdida escritas sobre él. Ambas cifras son las mismas que hoy muestra el resumen (spec 004, CA-10 y CA-11).
- **CA-5 (HU-2):** Dado el perfil de una actividad, cuando lo veo, entonces su punto más alto está marcado y muestra esa altitud en metros.
- **CA-6 (HU-2):** Dado un conjunto de altitudes de prueba con su máximo conocido, cuando se calcula el punto más alto, entonces coincide con el máximo esperado según RN-5.
- **CA-7 (HU-2):** Dada una actividad sin altitudes suficientes para dibujar el perfil (RN-6), cuando abro su resumen, entonces en lugar del perfil veo la elevación ganada y la perdida como cifras, sin gráfica vacía ni errores.
- **CA-8 (HU-2):** Dada una actividad, cuando abro su resumen, entonces sigue indicando si la elevación se midió con barómetro o se estimó con GPS (spec 004, CA-12 y CA-13), y cuántos puntos se registraron.

### Resumen: datos secundarios y recorrido

- **CA-9 (HU-1):** Dado el resumen, cuando lo veo, entonces debajo del perfil aparecen la duración y el ritmo promedio (senderismo y trail running) o la velocidad promedio (ciclismo), con los valores y formatos de la spec 004 (CA-4 a CA-6).
- **CA-10 (HU-3):** Dada una actividad con puntos de ubicación válidos, cuando abro su resumen, entonces veo una miniatura con la forma de su recorrido, con el mismo estilo y comportamiento sin red que las miniaturas de Inicio (spec 013, CA-3 y CA-8).
- **CA-11 (HU-3):** Dada una actividad sin recorrido (sin puntos válidos, o con distancia 0 porque no se movió), cuando abro su resumen, entonces no aparece la miniatura, sin dejar un hueco ni mostrar errores.
- **CA-12 (HU-1):** Dado el resumen, cuando lo veo, entonces "Publicar como ruta" y "Listo" funcionan igual que hoy (spec 004, CA-2; spec 007, CA-1 a CA-3), incluidos los casos en que no se puede publicar.

### Mis actividades

- **CA-13 (HU-4):** Dado que tengo actividades terminadas, cuando abro Mis actividades, entonces aparecen agrupadas por mes de inicio, del mes más reciente al más antiguo y, dentro de cada mes, de la más nueva a la más vieja.
- **CA-14 (HU-4):** Dado un mes con actividades, cuando veo su encabezado, entonces muestra el nombre del mes (y el año si no es el año en curso), el número de actividades y la suma de sus distancias.
- **CA-15 (HU-4):** Dado un conjunto de actividades de prueba en varios meses, cuando se agrupan, entonces cada una cae en el mes correcto según la hora local del teléfono (RN-8), y los totales de cada mes coinciden con los esperados.
- **CA-16 (HU-5):** Dada una actividad de la lista, cuando la veo, entonces muestra la miniatura de su recorrido, el tipo, la fecha, la distancia y la duración, con los mismos valores y formatos que hoy (spec 004, CA-20). Sin recorrido (sin puntos válidos, o con distancia 0), la fila muestra el ícono del deporte en lugar de la miniatura.
- **CA-17 (HU-5):** Dada una actividad sincronizada, cuando la veo en la lista, entonces no muestra insignia de sincronización. Dada una pendiente o que no se pudo subir (spec 005, CA-11), entonces sí la muestra, como hoy.
- **CA-18 (HU-4, HU-5):** Dada la lista, cuando toco una actividad, deslizo hacia abajo para sincronizar o no tengo actividades, entonces el comportamiento es el mismo de hoy (spec 004, CA-21 y CA-22; spec 005).

### Sin conexión y rendimiento

- **CA-19 (HU-6):** Dado que no tengo conexión, cuando abro un resumen o Mis actividades, entonces todo lo de esta spec se muestra con los datos del teléfono, salvo el fondo de mapa de las miniaturas (spec 013, CA-8).
- **CA-20 (HU-6):** Dadas 200 actividades guardadas, cuando abro Mis actividades en el S9+, entonces la lista se muestra en menos de 1 s y se desplaza sin saltos.

### Diseño y accesibilidad

- **CA-21 (HU-7):** Dada la propuesta de Figma, cuando el usuario la aprueba con sus estados (sin línea de contexto, sin perfil, sin recorrido, pendiente, no se pudo subir, lista vacía) en modo claro y oscuro, entonces se anota en el historial de esta spec. No se programa ninguna de las dos pantallas antes de esa aprobación.
- **CA-22 (HU-7):** Dadas las dos pantallas en modo claro y oscuro, cuando las comparo con el diseño aprobado, entonces coinciden en estructura, orden y componentes, y usan solo colores, tipografía y espaciados del sistema de la spec 009, más el token de sombra de RN-11.
- **CA-23 (HU-1 a HU-5):** Dado un lector de pantalla, cuando recorro el resumen, entonces el perfil se anuncia con un texto que dice la elevación ganada, la perdida y el punto más alto, y la miniatura con el tipo y la distancia. En Mis actividades, cada encabezado de mes se anuncia como encabezado con su total.
- **CA-24 (HU-1 a HU-5):** Dado el tamaño de letra más grande del sistema, cuando abro cualquiera de las dos pantallas, entonces ningún texto se corta ni se encima, incluidos los que van sobre el perfil.

### Estilo en toda la app

- **CA-25 (HU-8):** Dada cualquier pantalla de RN-12, en modo claro y oscuro, cuando la comparo con su diseño aprobado en Figma, entonces sigue las reglas de estilo de RN-13 y usa solo tokens del sistema de la spec 009 más el de sombra (RN-11).
- **CA-26 (HU-8):** Dada cualquier pantalla de RN-12, cuando repito los casos manuales de su spec original, entonces su comportamiento, sus textos, el orden de sus elementos y su navegación son los mismos de antes.
- **CA-27 (HU-7, HU-8):** Dado el rediseño en Figma de las pantallas de RN-12, en claro y oscuro y con sus estados, cuando el usuario lo aprueba, entonces se anota en el historial de esta spec. Ninguna pantalla de RN-12 se programa antes de esa aprobación.
- **CA-28 (HU-8):** Dadas las pantallas de RN-12, cuando reviso el contraste, entonces todos los pares de color siguen cumpliendo AA en los dos modos (spec 009, CA-3), y cada tarjeta se distingue del fondo por su color, no solo por la sombra.
- **CA-29 (HU-8):** Dado el S9+, cuando me desplazo por las listas con tarjetas con sombra (Inicio, Mis rutas, Mis favoritas, Seguridad), entonces no hay saltos ni pausas visibles. La grabación sigue dentro de los límites de batería de la spec 011.

## Reglas de negocio y validaciones

- RN-1: Esta spec solo cambia cómo se presentan los datos. Duración, distancia, elevación ganada y perdida, ritmo, velocidad y fuente de la elevación siguen siendo los que calcula y guarda la spec 004; no se recalculan.
- RN-2: El resumen y Mis actividades usan solo actividades terminadas del usuario de la sesión guardadas en el teléfono (spec 004, RN-6).
- RN-3: Reglas de la línea de contexto, en orden de prioridad: (1) es la primera actividad de ese tipo del usuario ("Tu primera salida en bici"); (2) es la de mayor distancia de ese tipo en su mes ("Tu caminata más larga de octubre"); (3) es la de mayor elevación ganada de ese tipo en su mes ("Tu caminata con más subida de octubre"). Las reglas 2 y 3 solo aplican si en ese mes hay al menos otra actividad del mismo tipo para comparar. Se comparan solo actividades terminadas del mismo usuario guardadas en el teléfono (RN-2), incluidas las recuperadas del servidor. En un empate gana la más antigua, para que la línea de una actividad no cambie cuando se graba otra igual.
- RN-4: Si una actividad cumple varias reglas de contexto, se muestra una sola línea: la de mayor prioridad (RN-3). La línea se calcula al abrir el resumen, así que puede cambiar si después se graba una actividad que la supera.
- RN-5: El perfil y el punto más alto usan la misma fuente de elevación que la actividad (barómetro o GPS, spec 004, RN-3), suavizada con los mismos umbrales de ruido que la elevación (spec 004, CA-11), para que un pico aislado no cuente como cumbre. El punto más alto se muestra como altitud sobre el nivel del mar, en metros enteros y marcado como aproximado ("1 412 m aprox."), porque con barómetro depende de la presión del día y con GPS tiene error propio.
- RN-6: El perfil se dibuja si la actividad tiene al menos 10 lecturas de altitud y 200 m de distancia. Por debajo de eso, el resumen muestra solo las cifras (CA-7). Una altitud GPS de exactamente 0 cuenta como desconocida: Android la entrega así cuando la ubicación no trae altitud.
- RN-10: Las actividades recuperadas del servidor (spec 005, HU-5) traen sus puntos, así que tienen perfil, punto más alto y miniatura como las grabadas en el teléfono. Las actividades con elevación estimada con GPS también muestran su perfil, aunque mientras no se corrija F5 puede salir exagerado (ver "Fuera de alcance"). Las lecturas del barómetro no se suben al servidor (spec 005), así que una actividad medida con barómetro y recuperada en otro teléfono dibuja su perfil y su punto más alto con la altitud GPS de sus puntos; las cifras de subida y bajada siguen siendo las guardadas.
- RN-7: La miniatura del recorrido usa los mismos puntos válidos que la de Inicio (spec 013).
- RN-8: El mes de una actividad es el de su hora de inicio en la zona horaria del teléfono. El total del mes suma las distancias ya guardadas de sus actividades.
- RN-11: Las tarjetas y las barras fijas de estas dos pantallas tienen sombra, como en el diseño elegido. El color de la sombra es un token nuevo del sistema de diseño, con valor para modo claro y oscuro (más opaco en oscuro, para que la elevación se note). Ningún texto ni elemento con contraste exigido depende de la sombra para distinguirse.
- RN-12: Pantallas que toman el estilo (además del resumen y Mis actividades):
  - **Cuenta:** bienvenida, inicio de sesión, registro y perfil.
  - **Inicio** (spec 013), con todos sus estados.
  - **Grabación:** antes de iniciar, grabando con el mapa y los botones flotantes (specs 010 y 011), alerta activa, sin permiso de ubicación y "¿Estás bien?".
  - **Rutas:** Explorar, detalle de ruta, publicar, editar, Mis rutas y Mis favoritas.
  - **Seguridad:** contactos de emergencia y sus estados.
  - **Mapas sin conexión** (spec 011).
- RN-13: Reglas del estilo:
  - **Sombra baja:** tarjetas y listas agrupadas que van sobre el fondo de la pantalla.
  - **Sombra media:** lo que flota sobre un mapa o sobre otro contenido, como la tarjeta de la ruta seleccionada en Explorar, los botones y paneles sobre el mapa de la grabación y las etiquetas flotantes.
  - **Sombra de barra:** las barras fijas de abajo (pestañas, acciones y "Empezar actividad") llevan una sombra hacia arriba en lugar del borde superior.
  - **Sin sombra:** botones, campos de texto, chips e insignias. Los avisos conservan la sombra que ya tenían desde la spec 009, ahora con la sombra baja.
  - **Íconos de tipo o de categoría:** van en un círculo con el color del ícono como tinte.
  - **Listas de filas de navegación** (Mis actividades, Mis rutas, Mis favoritas, Populares, Listo para salir y Cuenta en el perfil): van en una tarjeta por grupo, con divisores que empiezan después del ícono o la miniatura. Las tarjetas con acciones propias (contactos de emergencia, actividades recientes y rutas cercanas de Inicio) siguen separadas.
- RN-9: La línea de contexto, el perfil y la miniatura no cambian el estado de la actividad ni disparan sincronizaciones (constitución 2.3).

## Requisitos no funcionales

- **Offline:** todo se calcula con lo guardado en el teléfono (constitución, artículo 2). No hay cambios en el backend.
- **Rendimiento:** el resumen se abre en el mismo tiempo que hoy. Mis actividades cumple CA-20; los perfiles y las miniaturas no deben bloquear la primera presentación de la lista.
- **Batería y datos:** las miniaturas no descargan más fondos de mapa que los de Inicio (spec 013).
- **Accesibilidad:** contraste AA en ambos modos, también para el texto sobre el perfil; áreas de toque de al menos 48 dp; movimiento reducido respetado (specs 009 y 010).

## Fuera de alcance

- Arreglar la altitud del GPS en segundo plano (fallo F5) → spec 012 (entrega). Mientras tanto, el perfil de las actividades con elevación estimada con GPS hereda ese error; se acepta mostrarlo (P5).
- Récords personales, metas, gráficas por mes o estadísticas comparativas más allá de la línea de contexto → no está en el roadmap.
- Parciales por kilómetro, velocidad a lo largo del recorrido o mapa interactivo en el resumen → no está en el roadmap.
- Filtrar, buscar o borrar actividades desde Mis actividades → no está en el roadmap.
- Cambios en el cálculo de las métricas, en la sincronización o en publicar rutas → specs 004, 005 y 007, sin cambios. En particular, no se suben ni se recuperan las lecturas del barómetro.
- Cambiar el contenido, los textos, el orden o la navegación de las pantallas de RN-12 → solo cambia su estilo (CA-26). Cualquier otro cambio necesita su propia spec.
- Pantallas nuevas → ninguna; Mapas sin conexión ya existe (spec 011), solo le falta su diseño en Figma.
- Capturas para el manual y la demo → spec 012 (entrega).

## Preguntas abiertas

- [x] **P1 — Línea de contexto:** tres reglas con prioridad: primera de ese tipo, la más larga de ese tipo en el mes y la de más subida de ese tipo en el mes. Las dos últimas solo si hay otra del mismo tipo ese mes. RN-3, RN-4.
- [x] **P2 — Punto más alto:** altitud sobre el nivel del mar, marcada como aproximada. RN-5.
- [x] **P3 — Mínimo para el perfil:** 10 lecturas de altitud y 200 m de distancia. RN-6, CA-7.
- [x] **P4 — Actividades recuperadas:** se recuperan con sus puntos, así que tienen perfil y miniatura. RN-10.
- [x] **P5 — Perfil con elevación de GPS:** se muestra, aunque herede F5. RN-10.
- [x] **P6 — Orden:** la 014 va antes de la 012 (entrega), para que la demo muestre el resumen y la bitácora nuevos.
- [x] **P7 — Página "Prototipo" de Figma (spec 009):** se deja como histórico, con una nota; los flujos no cambian (CA-26).
- [x] **P8 — Pantallas viejas en Figma:** se borran el resumen, Mis actividades y la grabación en curso de la sección "Actividad" (009), reemplazados por las specs 010, 011 y 014. De la grabación vieja quedan "antes de iniciar" y "sin permiso de ubicación", que siguen vigentes y toman el estilo nuevo.
- [x] **P9 — Orden frente a la entrega:** la 014 va completa, con el estilo en toda la app, antes de la 012 (como en P6).

## Historial

- 2026-11-21 — Creación, a partir de la propuesta de diseño en Figma (sección "Propuesta — Resumen y bitácora").
- 2026-11-21 — Se resuelven P1 a P6 con el usuario: reglas de la línea de contexto (RN-3, RN-4), punto más alto aproximado sobre el nivel del mar (RN-5), mínimo para el perfil (RN-6), actividades recuperadas y de GPS con perfil (RN-10) y la 014 antes de la 012. Sin preguntas abiertas; lista para que el usuario la apruebe.
- 2026-11-21 — Aprobada por el usuario.
- 2026-11-21 — Al escribir el plan: RN-10 aclara que las actividades de barómetro recuperadas del servidor dibujan el perfil con la altitud GPS, porque las lecturas del barómetro no se sincronizan.
- 2026-11-21 — Plan aprobado por el usuario. Tareas en tasks.md.
- 2026-11-21 — El usuario elige la versión 3 del diseño, con sombras. Se agrega RN-11 (token de color para sombras) y se ajustan el contexto y CA-22. Las sombras son lo único nuevo en el sistema de diseño.
- 2026-11-21 — El usuario aprueba el diseño de Figma del resumen y Mis actividades (versión 3, CA-21): https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX?node-id=80-6835.
- 2026-11-21 — Ampliación del alcance a pedido del usuario: el estilo de la versión 3 se aplica a toda la app. Se agregan HU-8, CA-25 a CA-29, RN-12 y RN-13, se ajusta "Fuera de alcance" y se abren P7 a P9. La spec vuelve a Borrador hasta que el usuario apruebe la ampliación.
- 2026-11-21 — Se resuelven P7 a P9 con el usuario: la página "Prototipo" queda como histórico, se borran las pantallas viejas de "Actividad" y la 014 va completa antes de la 012. La ampliación queda lista para que el usuario la apruebe.
- 2026-11-21 — Ampliación aprobada por el usuario.
- 2026-11-21 — Plan de la ampliación aprobado por el usuario. Tareas T16 a T23 y casos M10 a M12 en tasks.md.
- 2026-11-21 — El usuario aprueba el diseño de Figma de todas las pantallas con el estilo de sombras (CA-27): Mapas sin conexión, Descargar zona y las subpantallas de la cuenta en https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX?node-id=90-6237, y el resto de la página Pantallas. Ya se puede programar.
- 2026-11-21 — En progreso: T3 (perfil de elevación de la actividad) hecha.
- 2026-11-21 — Ajuste del diseño aprobado, de acuerdo con el usuario, por contraste (CA-23, CA-28): el texto de la etiqueta de la línea de contexto pasa de ocre a `text`. Medía 3.87:1 en claro y ahora mide 9.91:1. La estrella y el tinte siguen en ocre. T6 hecha.
- 2026-11-21 — Por el caso M3 en el S9+: una actividad con puntos pero con distancia 0 mostraba la miniatura de un recorrido que no existe. CA-11 y CA-16 ahora tratan la distancia 0 igual que la falta de puntos válidos: en el resumen no hay miniatura y en la lista va el ícono del deporte.
- 2026-11-22 — Por el caso M6 en el S9+: una caminata recuperada del servidor, sin lecturas del barómetro y con todos sus puntos en altitud 0, dibujaba un perfil plano de "0 m aprox.". RN-6 ahora trata la altitud GPS de exactamente 0 como desconocida, así que esa actividad muestra las cifras (CA-7). Aprobado por el usuario.
- 2026-11-22 — Implementada con pendientes, por decisión del usuario. Todas las tareas hechas, salvo T14 en parte, y M1 a M7, M9, M10 y M11 aprobados en el S9+. Pasan a la 012 los casos M8 (CA-22 y CA-23), M12 (CA-29) y los pasos 3 y 5 de M5 (CA-17). Detalle en tasks.md, "Pendientes conocidos".
