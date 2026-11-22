# 015 — Filtros de actividades, mapa 3D en rutas y ajustes de diseño

- **Estado:** Aprobada
- **Semana:** 10
- **Autor(es):**
- **Fecha:** 2026-11-22

## Contexto y objetivo

Con la spec 014, Mis actividades muestra la bitácora por mes, pero con muchas actividades (200 en la cuenta de prueba) es difícil encontrar una salida concreta. Esta spec agrega filtros a esa lista. Además, trae a los mapas de rutas (Explorar y el detalle) la vista 3D que ya tiene la grabación (spec 010), corrige la sombra de los filtros de Explorar, agrega a Mis actividades el botón fijo para empezar una actividad y pone las métricas de Inicio en una tarjeta.

Como en las specs 009, 013 y 014, todo cambio visual se diseña primero en Figma ("SendaBC — Diseño"). El usuario lo aprueba o pide cambios, y solo después se programa. Va antes de 012-entrega, para que la demo lo muestre.

## Historias de usuario

- **HU-1:** Como usuario con muchas actividades, quiero filtrar Mis actividades por tipo, mes, distancia y altura más alta, para encontrar una salida sin recorrer toda la lista.
- **HU-2:** Como usuario que busca una ruta, quiero cambiar el mapa de rutas entre 2D y 3D, para ver el relieve de la zona cuando me sirve.
- **HU-3:** Como usuario, quiero que los filtros de Explorar se vean limpios, cada botón con su propia sombra, sin una línea que los corte.
- **HU-4:** Como usuario que revisa sus actividades, quiero empezar una nueva desde esa pantalla, sin volver a Inicio.
- **HU-5:** Como usuario, quiero que las métricas de la semana en Inicio vayan en una tarjeta, para distinguirlas del resto de la pantalla.
- **HU-6:** Como dueño del producto, quiero aprobar en Figma cada cambio visual antes de que se programe.

## Criterios de aceptación

### Filtros de Mis actividades

- **CA-1 (HU-1):** Dada la pestaña Actividades con actividades, cuando la abro, entonces veo un control para filtrar por tipo de actividad (senderismo, carrera, ciclismo), mes, distancia y altura más alta. Sin filtros, la lista es la misma de la spec 014.
- **CA-2 (HU-1):** Dado un filtro de tipo, cuando lo elijo, entonces la lista muestra solo actividades de ese tipo.
- **CA-3 (HU-1):** Dado un filtro de mes, cuando elijo un mes, entonces la lista muestra solo las actividades que empezaron en ese mes, en hora local. Solo se ofrecen meses que tienen actividades.
- **CA-4 (HU-1):** Dado el filtro de distancia, cuando muevo sus dos extremos (mínimo y máximo), entonces la lista muestra solo las actividades cuya distancia está entre los dos, incluidos, y se ven los dos valores elegidos. Una actividad sin distancia calculada no aparece mientras el filtro de distancia esté activo.
- **CA-5 (HU-1):** Dado el filtro de altura más alta, cuando muevo sus dos extremos (mínimo y máximo), entonces la lista muestra solo las actividades cuyo punto más alto está entre los dos, incluidos, y se ven los dos valores elegidos. El punto más alto es el mismo que marca el perfil del resumen (spec 014, CA-5). Una actividad sin perfil (spec 014, CA-7) no aparece mientras haya un filtro de altura.
- **CA-6 (HU-1):** Dados varios filtros a la vez, cuando los combino, entonces la lista muestra solo las actividades que cumplen todos.
- **CA-7 (HU-1):** Dados filtros activos, cuando miro la pantalla, entonces se ve cuáles están activos y puedo quitarlos todos con una sola acción.
- **CA-8 (HU-1):** Dados filtros que no dejan ninguna actividad, cuando se aplican, entonces aparece un mensaje que lo dice y ofrece quitar los filtros, distinto del mensaje de lista vacía de una cuenta sin actividades.
- **CA-9 (HU-1):** Dados filtros activos, cuando miro la lista, entonces sigue agrupada por mes, como en la spec 014, y cada encabezado de mes cuenta y suma solo las actividades filtradas.
- **CA-10 (HU-1):** Dados filtros activos, cuando salgo de la pestaña (a otra pestaña o al resumen de una actividad) y vuelvo, entonces los filtros siguen. Cuando cierro la app y la abro de nuevo, la lista empieza sin filtros.
- **CA-11 (HU-1):** Dado el teléfono sin conexión, cuando filtro, entonces los filtros funcionan igual, con las actividades guardadas en el teléfono.

### Mapa 2D y 3D en Explorar y en el detalle de ruta

- **CA-12 (HU-2):** Dado el mapa de Explorar o el del detalle de una ruta, cuando toco el control de vista, entonces el mapa cambia entre 2D y 3D, conservando la zona que estoy viendo, las rutas dibujadas, la ruta seleccionada y los filtros.
- **CA-13 (HU-2):** Dado que abro Explorar o el detalle de una ruta, cuando aparece el mapa, entonces empieza en 3D. La vista elegida no se recuerda: cada vez que se abre la pantalla vuelve a 3D.
- **CA-14 (HU-2):** Dado el mapa en 3D con conexión, cuando lo miro, entonces se ve en perspectiva y las montañas y cañones se distinguen por su relieve real, como al grabar (spec 010, CA-1). La ruta se dibuja sobre el relieve, sin quedar oculta por él.
- **CA-15 (HU-2):** Dado el mapa en 3D, cuando busco rutas, toco una, uso "Buscar en esta zona" o "centrar en mi ubicación", o abro el detalle, entonces todo funciona igual que en 2D (specs 006, 007 y 013).
- **CA-16 (HU-2):** Dado el teléfono sin conexión, cuando el mapa está en 3D, entonces la app no falla y se comporta como el mapa de grabación sin conexión (spec 010).
- **CA-17 (HU-2):** El control de vista tiene nombre accesible y anuncia la vista actual.

### Sombra de los filtros de Explorar

- **CA-18 (HU-3):** Dados los filtros de tipo y de radio sobre el mapa de Explorar, cuando los miro en claro y en oscuro, entonces cada botón tiene su propia sombra alrededor y ninguna sombra se ve cortada por una línea recta horizontal. Lo mismo al deslizar la fila de filtros de lado.

### Botón para empezar desde Mis actividades

- **CA-19 (HU-4):** Dada la pestaña Actividades, cuando la abro, entonces hay un botón "Empezar actividad" fijo abajo, igual al de Inicio, que no se mueve al desplazar la lista y no tapa la última fila.
- **CA-20 (HU-4):** Dado ese botón, cuando lo toco, entonces empieza una actividad igual que con el de Inicio. Al detenerla, "Listo" en el resumen regresa a Mis actividades, donde la actividad nueva ya aparece, y atrás no vuelve al resumen ni a la grabación (spec 004, CA-2).

### Tarjeta de las métricas de Inicio

- **CA-21 (HU-5):** Dado Inicio, cuando lo abro, entonces las métricas de "Últimos 7 días" (distancia, actividades, tiempo y subida) van en una tarjeta con sombra baja, como las demás tarjetas de la app (spec 014, RN-13), en claro y en oscuro, y sus textos siguen cumpliendo el contraste AA.

### Diseño en Figma

- **CA-22 (HU-6):** Dados los cambios visuales de esta spec (filtros de Mis actividades con sus estados, control de vista en Explorar y en el detalle, sombras de los filtros, botón fijo en Mis actividades y tarjeta de las métricas de Inicio), cuando el usuario aprueba el diseño en Figma, en claro y oscuro, entonces se anota en el historial de esta spec. Ninguno se programa antes de esa aprobación.
- **CA-23 (HU-1 a HU-5):** Dada la app implementada, cuando se compara con el diseño aprobado, entonces coincide en los dos modos.

## Reglas de negocio y validaciones

- RN-1: Los filtros de Mis actividades solo cambian lo que se muestra. No cambian, borran ni sincronizan actividades (constitución 2.3).
- RN-2: Todas las actividades del teléfono entran al filtro, sin importar su estado de sincronización.
- RN-3: Los meses se calculan en hora local, como la agrupación por mes de la spec 014.
- RN-4: Las distancias y altitudes de los filtros usan los mismos formatos y unidades de la spec 004.
- RN-5: La altura más alta de una actividad es la cumbre de su perfil (spec 014, RN-6), con las mismas reglas: no existe si la actividad no tiene perfil.
- RN-6: El botón fijo de Mis actividades no cambia el comportamiento de iniciar una actividad: es el mismo de Inicio. Solo cambia adónde regresa "Listo" (CA-20).
- RN-7: La vista 2D o 3D no cambia qué rutas se buscan ni cómo se filtran (spec 006).
- RN-8: Los controles deslizantes de distancia y altura van del valor más bajo al más alto entre las actividades del teléfono, igual para todos los tipos de actividad. Con los dos extremos en esos límites, el filtro está inactivo y no oculta ninguna actividad, ni siquiera las que no tienen distancia o perfil.

## Requisitos no funcionales

- **Rendimiento:** con las 200 actividades de la cuenta de prueba de la spec 014, aplicar o quitar un filtro actualiza la lista sin pausas visibles, y la lista sigue apareciendo en menos de 1 s (014, CA-20).
- **Offline:** los filtros funcionan sin red (CA-11).
- **Accesibilidad:** filtros y control de vista con nombre accesible y estado (seleccionado o no). Cada extremo de los controles deslizantes se anuncia con su valor y se puede ajustar con TalkBack, sin arrastrar. Todos con área táctil mínima del sistema de diseño y textos que crecen con la letra grande sin cortarse.
- **Mapa en 3D:** abrir Explorar y el detalle en 3D no debe hacerlos tardar visiblemente más que en 2D en el S9+.

## Fuera de alcance

- Buscar actividades por texto o por nombre: no está en el roadmap.
- Ordenar la lista por algo distinto de la fecha: no está en el roadmap.
- Filtrar por subida acumulada: se eligió la altura más alta (P2).
- Guardar los filtros al cerrar la app (P4) y recordar la vista 2D o 3D (P6): no está en el roadmap.
- Filtros nuevos en Explorar rutas (dificultad, distancia): la spec 006 define los de tipo y radio, y esta spec solo cambia su sombra.
- Vista 3D en la grabación: ya existe (spec 010).
- Los casos pendientes de la 014 (M8, M12 y parte de M5): pasan a 012-entrega.

## Preguntas abiertas

- [x] **P1 — Filtro de fecha:** se elige un mes (CA-3).
- [x] **P2 — "Altura":** es la altura más alta de la actividad, no la subida (CA-5, RN-5).
- [x] **P3 — Totales del mes con filtros:** cuentan solo las actividades filtradas (CA-9).
- [x] **P4 — Recordar los filtros:** a recomendación de Claude, aceptada por el usuario: siguen mientras la app está abierta y se quitan al cerrarla (CA-10). Así no se encuentra uno una lista incompleta sin saber por qué.
- [x] **P5 — Detalle de ruta:** la vista 2D y 3D va en Explorar y en el detalle (CA-12).
- [x] **P6 — Vista inicial:** 3D, sin recordar la última elegida (CA-13).
- [x] **P7 — Métricas de Inicio:** tarjeta con sombra baja, como las demás (CA-21).
- [x] **P8 — Orden:** antes de 012-entrega.
- [x] **P9 — Rangos de distancia y altura:** los elige el usuario con un control deslizante de mínimo y máximo (CA-4, CA-5, RN-8).

## Historial

- 2026-11-22 — Creación.
- 2026-11-22 — El usuario resuelve P1 a P8. Queda P9, sobre los rangos de distancia y altura.
- 2026-11-22 — El usuario resuelve P9: control deslizante con mínimo y máximo. No quedan preguntas abiertas.
- 2026-11-22 — Aprobada por el usuario.
- 2026-11-22 — Al escribir el plan: CA-20 decía "pasa exactamente lo mismo que con el de Inicio", pero "Listo" regresa a la pantalla anterior. El usuario eligió que, desde Mis actividades, "Listo" regrese a Mis actividades. Se actualizó también la spec 004 (CA-2).
- 2026-11-22 — Plan aprobado por el usuario, con los casos manuales en el emulador salvo lo que solo mide un teléfono real.
- 2026-11-22 — Tareas T1 a T19 y casos M1 a M13 en tasks.md.
