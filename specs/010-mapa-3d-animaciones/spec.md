# 010 — Mapa 3D al grabar y animaciones de la interfaz

- **Estado:** Implementada (2026-11-06; cerrada 2026-11-20)
- **Semana:** 9
- **Autor(es):**
- **Fecha:** 2026-11-05

## Contexto y objetivo

Hoy la pantalla de grabación solo muestra números: quien va en la sierra no ve dónde está ni por dónde ha pasado. La spec 003 dejó el mapa en vivo para las specs 006/007, pero ninguna lo incluyó, así que esta spec lo agrega, con una vista en 3D que muestra el relieve real del terreno y ayuda a orientarse. Además, la app responde a los toques y cambia de pantalla casi sin movimiento: la spec 009 unificó su aspecto, pero un botón presionado solo cambia de tono al instante y las pestañas saltan de una a otra. Las animaciones confirman que el toque se registró y dejan claro de dónde viene y a dónde va el usuario.

Corresponde al pulido de la semana 9 y amplía lo que la spec 009 dejó fuera (estilo de mapas). Se hace antes de 011-estabilidad para que la prueba de campo la cubra. El mapa va primero y las animaciones después. Ninguna de las dos mejoras puede afectar la grabación: sigue sin depender de la red (constitución 2.1).

## Historias de usuario

- **HU-1:** Como usuario que graba una actividad, quiero ver en un mapa 3D con relieve mi posición y el recorrido que llevo, para orientarme sin salir de la pantalla de grabación.
- **HU-2:** Como usuario en la sierra sin señal, quiero que la grabación siga funcionando igual aunque el mapa no cargue, para no perder mi actividad.
- **HU-3:** Como usuario, quiero que los botones y elementos táctiles respondan con una animación al presionarlos, para saber que mi toque se registró.
- **HU-4:** Como usuario, quiero que el paso entre pantallas y pestañas y la aparición de contenido sean animados, para entender qué cambió y a dónde me moví.
- **HU-5:** Como usuario sensible al movimiento, quiero que la app respete la opción de reducir animaciones de mi teléfono, para usarla sin molestias.
- **HU-6:** Como usuario que graba, quiero cambiar entre el mapa 3D y uno 2D, para ver el terreno cuando me sirve y tener una vista más simple y ligera cuando la prefiero.
- **HU-7:** Como usuario que graba, quiero mover y acercar el mapa y volver a mi posición, para mirar lo que hay más adelante sin perderme.

## Criterios de aceptación

### Mapa durante la grabación

- **CA-1 (HU-1):** Dado que inicié una actividad y hay conexión, cuando la pantalla de grabación muestra el mapa, entonces este se ve en perspectiva 3D y las montañas y cañones de la zona se distinguen por su relieve real, no como un plano inclinado.
- **CA-2 (HU-1):** Dado que estoy grabando y me muevo, cuando llega una nueva posición, entonces el marcador de mi posición se actualiza y el mapa me sigue sin que yo haga nada.
- **CA-3 (HU-1):** Dado que el mapa me sigue y avanzo, cuando cambio de dirección, entonces el mapa gira para que la dirección en la que avanzo quede hacia arriba de la pantalla. Si me detengo, conserva la última orientación.
- **CA-4 (HU-1):** Dado que estoy grabando, cuando avanzo, entonces el mapa dibuja el recorrido desde el primer punto de la actividad hasta mi posición actual, y el trazo crece conforme se registran puntos.
- **CA-5 (HU-1):** Dado que inicié una actividad y aún no hay ningún punto GPS, cuando miro el mapa, entonces un aviso indica que se está esperando la señal GPS y no se muestra una posición inventada.
- **CA-6 (HU-1):** Dada la pantalla de grabación durante una actividad, cuando la miro, entonces el mapa ocupa todo el ancho y todo el alto disponible de la pantalla, y las métricas están debajo de él, sin taparlo. "Pedir ayuda" y "Detener actividad" flotan sobre el mapa (spec 011, CA-30 y CA-35). El tiempo, la distancia y la elevación siguen siendo los textos más grandes y se leen a la distancia de un brazo, y "Detener actividad" y "Pedir ayuda" siguen al alcance del pulgar en la mitad inferior (spec 009, CA-12 y CA-13).
- **CA-7 (HU-1):** Dado que grabé con la pantalla bloqueada o con la app en segundo plano, cuando vuelvo a la pantalla de grabación, entonces el mapa muestra mi posición más reciente y el recorrido completo, incluidos los puntos registrados mientras no la veía.
- **CA-8 (HU-1):** Dado que no hay una actividad en curso, cuando abro la pantalla de grabación antes de "Iniciar actividad" o llego al resumen tras detenerla, entonces no se muestra mi posición en vivo ni se escucha el GPS por causa del mapa (constitución 3.5).
- **CA-9 (HU-1):** Dado el teléfono en modo oscuro, cuando grabo, entonces el mapa se ve en modo oscuro, tanto en 3D como en 2D; dado el teléfono en modo claro, se ve en modo claro. Si el usuario cambia el modo del teléfono durante la actividad, el mapa cambia sin interrumpir la grabación.

### Alternar entre 3D y 2D

- **CA-10 (HU-6):** Dado que estoy grabando, cuando toco el control de vista del mapa, entonces el mapa cambia entre 3D y 2D, conservando mi posición, el recorrido y si el mapa me está siguiendo.
- **CA-11 (HU-6):** Dado el mapa en 2D, cuando lo miro, entonces se ve desde arriba y sin relieve 3D, y CA-2, CA-3 y CA-4 se siguen cumpliendo.
- **CA-12 (HU-6):** Dada una actividad nueva, cuando se inicia, entonces el mapa empieza en 3D. Durante la actividad se conserva la vista elegida, también al bloquear la pantalla y volver.

### Gestos sobre el mapa

- **CA-13 (HU-7):** Dado que estoy grabando, cuando muevo, giro o acerco el mapa con los dedos, entonces el mapa responde y deja de seguirme, y la grabación continúa sin cambios.
- **CA-14 (HU-7):** Dado que el mapa dejó de seguirme, cuando toco el botón de volver a mi posición, entonces el mapa regresa a mi posición y vuelve a seguirme y a girar según mi dirección.

### Sin conexión y fallos del mapa

- **CA-15 (HU-2):** Dado el teléfono en modo avión durante toda la actividad, cuando grabo, entonces los puntos y las métricas se registran igual que sin mapa, el recorrido se sigue dibujando, y un aviso indica que el mapa de fondo no está disponible sin conexión.
- **CA-16 (HU-2):** Dado que se pierde la conexión en medio de una actividad, cuando sigo grabando, entonces la pantalla no se bloquea ni muestra un error que me obligue a actuar; y cuando la conexión vuelve, el mapa de fondo se recupera sin reiniciar la actividad.
- **CA-17 (HU-2):** Dado que el mapa no se puede mostrar por cualquier causa, cuando estoy grabando, entonces la actividad continúa y puedo ver las métricas y usar "Detener actividad" y "Pedir ayuda".
- **CA-18 (HU-1, HU-2):** Dado un recorrido simulado de 10 minutos, cuando se graba con el mapa visible, entonces se registran los puntos que marcan las reglas de la spec 003 (RN-2), el tiempo se actualiza en vivo y el aviso "¿Estás bien?" de la spec 008 aparece por encima del mapa.

### Diseño

- **CA-19 (HU-1, HU-6, HU-7):** Dado el prototipo de Figma de la spec 009, cuando se revisa, entonces incluye la pantalla de grabación con el mapa, las métricas debajo y los controles de vista y de volver a mi posición, en modo claro y oscuro; y la aprobación del usuario queda en el historial de esta spec antes de programar esa pantalla.

### Animaciones

- **CA-20 (HU-3):** Dado cualquier elemento táctil habilitado de la app, cuando lo presiono, entonces muestra una animación mientras está presionado y vuelve suavemente a su estado normal al soltarlo, también si deslizo el dedo fuera para cancelar.
- **CA-21 (HU-3):** Dado un elemento táctil deshabilitado, cuando lo presiono, entonces no se anima.
- **CA-22 (HU-3):** Dado cualquier botón, cuando lo toco, entonces su acción empieza sin esperar a que termine la animación, y un doble toque en "Iniciar" sigue sin crear dos actividades (spec 003, CA-9).
- **CA-23 (HU-4):** Dada una pantalla, cuando abro otra o vuelvo atrás (con el botón o el gesto del sistema), entonces el cambio es animado y la vuelta se mueve en sentido contrario a la ida.
- **CA-24 (HU-4):** Dada la barra de pestañas, cuando cambio de pestaña, entonces el contenido cambia con una animación y el indicador de la pestaña activa se mueve o cambia de forma animada.
- **CA-25 (HU-4):** Dado un aviso, tarjeta o elemento de lista, cuando aparece o desaparece, entonces lo hace con una animación; y dado un chip, cuando cambia su selección, entonces el cambio es animado.
- **CA-26 (HU-4):** Dado el aviso "¿Estás bien?", cuando aparece, entonces entra con una animación y sus botones se pueden tocar desde el primer momento.
- **CA-27 (HU-5):** Dado el teléfono con la opción de reducir animaciones activa, cuando uso la app, entonces las animaciones de esta spec se omiten o se reducen a un cambio simple sin desplazamiento, incluidos los movimientos de cámara del mapa, y todo sigue funcionando.
- **CA-28 (HU-3, HU-4):** Dadas las animaciones y el mapa implementados, cuando se repiten los casos manuales de las specs 001 a 009, entonces todos siguen pasando, adaptando solo los pasos que cambien en la pantalla de grabación.

## Reglas de negocio y validaciones

- RN-1: El mapa solo se muestra en vivo entre "Iniciar actividad" y "Detener actividad". No cambia cuándo se escucha el GPS ni con qué frecuencia (spec 003, RN-2).
- RN-2: El mapa solo muestra datos: no decide nada sobre la actividad. La fuente de verdad sigue siendo la base local (constitución 2.1), y un fallo del mapa nunca detiene ni altera la grabación.
- RN-3: El trazo del mapa no incluye los puntos imprecisos que la spec 004 descarta para calcular la distancia, para que lo dibujado coincida con la distancia mostrada. Todos los puntos se siguen guardando (spec 003, RN-3).
- RN-4: Ninguna animación retrasa una acción. "Pedir ayuda", "Estoy bien" y "Detener actividad" responden de inmediato.
- RN-5: Las animaciones de botones, pantallas y contenido duran 300 ms como máximo.
- RN-6: Las animaciones usan los colores del sistema de diseño de la spec 009 y no cambian ningún flujo, validación ni mensaje de las specs 001 a 009.
- RN-7: `alert` se sigue reservando para el módulo de seguridad (spec 009, RN-5). Los avisos y controles del mapa cumplen el contraste de la spec 009 (CA-3) en modo claro y oscuro.
- RN-8: Los controles nuevos del mapa tienen un área de toque de al menos 48 × 48 dp (spec 009, CA-13) y etiqueta de accesibilidad.
- RN-9: La pantalla de grabación se programa solo después de aprobar su prototipo (CA-19). Las animaciones no requieren prototipo.
- RN-10: Se implementa primero el mapa y después las animaciones.

## Requisitos no funcionales

- **Offline:** grabar no depende de la red (CA-15 a CA-17). Las animaciones no usan recursos descargados.
- **Rendimiento:** el mapa y las animaciones no deben hacer que el tiempo o las métricas se atrasen o se traben, ni que las animaciones se vean entrecortadas en un teléfono de gama media.
- **Batería:** en el mismo teléfono y el mismo recorrido, de al menos 30 minutos, el consumo por hora con el mapa visible no supera al de grabar sin mapa en más de **30 %** en 3D ni de **15 %** en 2D. Se mide en 011-estabilidad; si no se cumple, se ajusta el mapa antes de cerrar esa spec.
- **Datos móviles:** el mapa de fondo solo se descarga para la zona por la que se pasa o que el usuario mira.
- **Costo:** el uso esperado del mapa durante el proyecto debe caber en la capa gratuita del proveedor, o el plan debe indicar el costo mensual esperado.
- **Privacidad:** la app no envía al backend más ubicación que la ya definida en las specs 005 y 008. Al pedir el mapa de fondo, el proveedor del mapa recibe la zona visible, igual que en "Explorar rutas".
- **Accesibilidad:** el mapa lleva etiqueta de accesibilidad, y la información que da no es la única forma de conocer el estado de la grabación (las métricas siguen como texto).

## Fuera de alcance

- Vista 3D en "Explorar rutas" y en el detalle de ruta: siguen con el mapa actual (no está en el roadmap).
- Ocultar el mapa durante la grabación: el mapa 2D es la opción ligera (no está en el roadmap).
- Recordar la vista 3D o 2D entre actividades (no está en el roadmap).
- Descargar mapas para usarlos sin conexión: 011-estabilidad.
- Medición de batería y rendimiento en una salida real: 011-estabilidad.
- Mostrar sobre el mapa de grabación las rutas publicadas o seguir una ruta del catálogo (no está en el roadmap).
- Mapa o reproducción animada del recorrido en el resumen o el historial (no está en el roadmap).
- Vibración al tocar botones y sonidos (no está en el roadmap).
- Pausar y reanudar la grabación (spec 003).

## Preguntas abiertas

Ninguna. Ver las decisiones resueltas en el historial. El proveedor del mapa se elige en el plan, comprobando que cumpla CA-1 y CA-9 en la zona de la Sierra de Juárez.

## Historial

- 2026-11-20 — Pasa a Implementada: la spec 011 cerró sus pendientes. Batería (CA-8, aceptada con el teléfono quieto), ubicación vieja (CA-3), `database is locked` (CA-13), zona sin red (CA-20, CA-21), regresión de CA-28 (011 CA-9 y CA-26) y 004 M3. El texto recortado al cambiar la letra con la app abierta queda aceptado (011, F8).
- 2026-11-06 — Cambios por la spec 011: CA-6 admite "Pedir ayuda" y "Detener actividad" como botones flotantes sobre el mapa (CA-30, CA-35). Aprobado por el usuario.
- 2026-11-06 — Implementada con pendientes, confirmado por el usuario: 27 de 28 CA verificados. CA-28 queda parcial: faltan casos de regresión de las specs 007, 008 y 009 (ver T25). La medición de batería pasa a 011-estabilidad.
- 2026-11-05 — Prototipo de la grabación con mapa aprobado por el usuario (CA-19): https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX. Ya se puede programar `activityPage` (RN-9).
- 2026-11-05 — En progreso: T1 hecha (pantalla de grabación con mapa en Figma).
- 2026-11-05 — Tareas escritas en `tasks.md`.
- 2026-11-05 — Plan aprobado por el usuario. Constitución v1.8.
- 2026-11-05 — Aprobada por el usuario.
- 2026-11-05 — Preguntas resueltas por el usuario: P1 se quiere el relieve real (CA-1) y alternar entre 3D y 2D (HU-6, CA-10 a CA-12); P2 el mapa gira según la dirección de avance (CA-3); P3 mapa a pantalla completa con las métricas debajo (CA-6); P4 sí hay gestos, con botón para volver a la posición (HU-7, CA-13 y CA-14); P5 se anima también el contenido y el aviso "¿Estás bien?" (CA-25 y CA-26), con máximo de 300 ms (RN-5); P6 el usuario delega el límite de batería, se fija en 30 % en 3D y 15 % en 2D; P7 el mapa sigue el modo oscuro (CA-9); P8 se actualiza primero el prototipo (CA-19, RN-9); P9 esta spec pasa a ser la 010, antes de 011-estabilidad y 012-entrega, con el mapa primero y las animaciones después (RN-10).
- 2026-11-05 — Creación.
