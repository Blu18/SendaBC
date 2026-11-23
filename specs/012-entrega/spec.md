# 012 — Entrega: README, manual, build, despliegue, demo y descarte de actividades cortas

- **Estado:** Aprobada (2026-11-22)
- **Semana:** 10
- **Autor(es):** Diego Manzo Escalante
- **Fecha:** 2026-11-22

## Contexto y objetivo

Es el cierre del proyecto (semana 10 del roadmap). La app tiene que llegar a la demo instalada en un teléfono Android como cualquier app, sin herramientas de desarrollo, y conectada a un backend publicado que no se duerma. El repositorio tiene que poder levantarse siguiendo solo su README, y quien use la app tiene que contar con un manual. Esta spec también recoge lo que las specs 011, 013, 014 y 015 dejaron para la entrega (ver las notas de `roadmap.md`).

Además, hoy toda actividad se guarda al cerrarse, aunque no tenga recorrido (spec 003, CA-10; spec 004, CA-17). Si alguien inicia por error y detiene enseguida, o el GPS no fija posición, queda en Mis actividades, en Inicio y en el servidor una actividad con distancia 0. Esta spec define que una actividad con menos de 3 puntos válidos no se guarda, para que la bitácora de la demo y de los usuarios muestre solo actividades reales.

## Historias de usuario

- **HU-1:** Como evaluador o nuevo integrante del equipo, quiero un README con el que pueda entender el proyecto y levantarlo desde cero, para revisarlo o seguir desarrollándolo sin ayuda.
- **HU-2:** Como deportista, quiero un manual de usuario, para aprender a usar cada función de la app.
- **HU-3:** Como deportista, quiero instalar la app en mi teléfono Android sin herramientas de desarrollo, para usarla como cualquier otra app.
- **HU-4:** Como deportista, quiero que la app funcione con un servidor publicado y siempre disponible, para que mis actividades se suban y mis contactos reciban la alerta aunque nadie tenga una computadora encendida.
- **HU-5:** Como equipo, queremos una demo preparada, para mostrar el flujo completo de la app en la presentación.
- **HU-6:** Como equipo, queremos correr con el build de entrega los casos que quedaron pendientes en specs anteriores, para cerrarlas o dejar documentado lo que no se cumple.
- **HU-7:** Como deportista, quiero que una actividad que casi no registró recorrido no se guarde, y que la app me pregunte antes de descartarla, para que Mis actividades y mis totales muestren solo actividades reales sin perder una por error.
- **HU-8:** Como deportista, quiero que se apliquen las mismas reglas sin importar cómo termine la actividad (con "Detener", saliendo de la pantalla o al cerrarse la app), para que no aparezcan actividades vacías por otro camino.
- **HU-9:** Como deportista, quiero que la app se llame SendaBC y tenga su propio ícono en mi teléfono, para reconocerla entre mis apps.

## Criterios de aceptación

### README (HU-1)

- **CA-1 (HU-1):** Dado el repositorio clonado en una computadora sin el proyecto, cuando sigo solo el README, entonces puedo instalar las dependencias, configurar las variables de entorno, crear la base con las migraciones y levantar el backend y la app en modo desarrollo. No necesito pasos que no estén escritos ahí.
- **CA-2 (HU-1):** El README describe qué hace la app, su arquitectura (app, backend, base de datos), el stack de la constitución, la estructura de carpetas, la metodología Spec-Driven Development con la carpeta `specs/`, y cómo correr las pruebas y el linter. También dice cómo instalar el APK de entrega y cómo volver a compilarlo.
- **CA-3 (HU-1):** El README y el repositorio no contienen secretos (constitución 3.6). Cada variable de entorno necesaria aparece con su nombre, para qué sirve y un valor de ejemplo que no es real.

### Manual de usuario (HU-2)

- **CA-4 (HU-2):** El manual está en el repositorio, en Markdown, y el README lo enlaza. Explica, con capturas de la versión entregada, cómo registrarse, iniciar sesión, grabar una actividad, ver su resumen, usar Mis actividades y sus filtros, explorar rutas cercanas en el mapa 2D y 3D, publicar una ruta, marcar favoritas, agregar contactos de emergencia y cómo funciona la alerta por inactividad, descargar mapas para usar sin conexión y cambiar los ajustes.
- **CA-5 (HU-2):** El manual explica qué pasa sin conexión: que se puede grabar igual y que las actividades se suben solas al recuperar la red (spec 005). También explica que una actividad con muy poco recorrido no se guarda (CA-17).

### Build de entrega (HU-3)

- **CA-6 (HU-3):** Dado un teléfono Android sin la app ni herramientas de desarrollo, cuando instalo el APK que va adjunto en la entrega, entonces la app se instala y abre con su nombre, su ícono y su pantalla de arranque (CA-29 a CA-32).
- **CA-7 (HU-3, HU-4):** El APK de entrega se conecta solo al backend publicado, por HTTPS. No usa la dirección del túnel de desarrollo ni el modo de medición de batería de la spec 011 (RN-7).
- **CA-8 (HU-3):** Con el APK de entrega en el S9+, el flujo de la demo (CA-13) funciona de principio a fin, incluidos el mapa de grabación, Explorar en 2D y 3D y los mapas descargados.

### Nombre e ícono de la app (HU-9)

Hoy la app aparece en el teléfono como "frontend" y con el ícono genérico de la plantilla.

- **CA-29 (HU-9):** Dado el APK de entrega instalado, cuando veo la app en el lanzador, en las apps recientes, en los ajustes de Android y en los avisos de permisos, entonces se llama "SendaBC". No aparece "frontend" en ningún lugar visible para el usuario.
- **CA-30 (HU-9):** En el lanzador, el ícono de la app es la versión cuadrada del logo de SendaBC (spec 009, CA-4). Se ve completo, sin recortes, en las formas de ícono que usa Android (círculo, cuadrado redondeado), con el tema claro y oscuro del teléfono.
- **CA-31 (HU-9):** Las notificaciones de la app, como la de grabar con la pantalla bloqueada y la de inactividad (spec 008), muestran en la barra de estado un ícono de SendaBC que se distingue, no un cuadro vacío ni el ícono genérico.
- **CA-32 (HU-9):** Al abrir la app, la pantalla de arranque muestra el logo de SendaBC con un fondo acorde al modo claro u oscuro del teléfono (spec 009, CA-11).

### Despliegue (HU-4)

- **CA-9 (HU-4):** Dado el backend publicado, cuando la app hace cualquier petición después de varias horas sin uso, entonces responde con normalidad, sin que alguien tenga que despertarlo.
- **CA-10 (HU-4):** Dada una actividad en curso cuya hora de regreso ya pasó, cuando nadie toca la app, entonces los contactos de emergencia reciben el aviso por Telegram con el mismo margen que define la spec 008, aunque ninguna computadora del equipo esté encendida.
- **CA-11 (HU-4):** La base de datos publicada se puede recrear desde cero solo con las migraciones del repositorio, incluidos triggers y funciones (constitución 5.1).
- **CA-12 (HU-4):** La colección de Postman de la API pasa completa contra el backend publicado (constitución 6.3).

### Demo (HU-5)

- **CA-13 (HU-5):** Hay un guion escrito para la demo en vivo que recorre el flujo principal: iniciar sesión, ver Inicio, iniciar una actividad y detenerla, abrir el resumen de una actividad grabada antes, encontrarla en Mis actividades, explorar rutas, publicar una y mostrar un contacto de emergencia. El guion se ensayó una vez completo con el APK de entrega.
- **CA-14 (HU-5):** La cuenta de la demo tiene datos preparados: al menos una actividad real grabada antes de la demo, con su recorrido, actividades suficientes para que Inicio, Mis actividades y sus filtros se vean con contenido, y al menos una ruta publicada cerca del lugar de la demo.
- **CA-27 (HU-5):** En la demo, la alerta por inactividad llega por el bot real de Telegram a un contacto del equipo, desde el backend publicado y no con el modo log.

### Pendientes de specs anteriores (HU-6)

- **CA-15 (HU-6):** Con el APK de entrega se corren los casos que pasaron a esta spec y su resultado queda anotado en el `tasks.md` de su spec:
  - 014: M8 (TalkBack y los dos modos comparados con Figma), M12 (desplazamiento y prueba de batería de la 011) y los pasos 3 y 5 de M5.
  - 015: el recorrido con TalkBack de M8 (CA-17), el paso 4 de M3 (CA-10) y el paso 5 de M10 (CA-19).
  - 011: la prueba de batería con los límites de 30 % en 3D y 15 % en 2D.
- **CA-16 (HU-6):** Con el APK de entrega se observan y anotan los hallazgos que pasaron a esta spec: el cierre nativo al arrancar en el S9+ (015), P-B y P-E en la prueba de campo (013), y la caminata de diagnóstico de F5 con la pantalla bloqueada (011). Cada uno queda como corregido o como limitación conocida, con su motivo, y la spec de origen actualiza su estado. F5 queda como limitación conocida aunque la caminata lo confirme: se documenta en la 011 y en el manual (la elevación en teléfonos sin barómetro puede salir mayor a la real si se graba con la pantalla bloqueada).
- **CA-28 (HU-6):** Con la letra del sistema al 110 % en el S9+, cuando abro los filtros de Mis actividades, entonces "Ver N actividades" se lee completo en un solo renglón, sin cortarse (pendiente de la 015).

### Actividades con menos de 3 puntos válidos (HU-7, HU-8)

- **CA-17 (HU-7):** Dada una actividad en curso con menos de 3 puntos válidos, cuando presiono "Detener actividad", entonces la app me pregunta si quiero terminar, avisándome que la actividad no se guardará porque tiene muy poco recorrido. Puedo elegir seguir grabando o terminar sin guardar.
- **CA-18 (HU-7):** En la pregunta de CA-17, si elijo seguir grabando, la grabación continúa sin cambios. Si elijo terminar sin guardar, no se abre ningún resumen y vuelvo a la pantalla de "Nueva actividad".
- **CA-19 (HU-7):** Después de terminar sin guardar, la actividad no aparece en Mis actividades ni en Inicio, no cuenta en los totales de la semana (spec 013) y no se sube al servidor ni queda pendiente de subir (spec 005).
- **CA-20 (HU-7):** Dada una actividad en curso con 3 puntos válidos o más, cuando presiono "Detener actividad", entonces no hay pregunta: se guarda y se abre su resumen como hoy (spec 004, CA-1).
- **CA-21 (HU-8):** Dada una actividad en curso con menos de 3 puntos válidos, cuando intento salir de la pantalla, entonces la pregunta de la spec 003 (CA-15) también avisa que la actividad no se guardará. Si elijo terminar, se cumple CA-19.
- **CA-22 (HU-8):** Dado que la app se cerró con una actividad en curso que tiene menos de 3 puntos válidos, cuando vuelvo a abrir la app, entonces esa actividad se descarta sin ningún aviso y se cumple CA-19. No queda ninguna actividad en curso (spec 003, CA-10). Con 3 puntos válidos o más, se cierra y se guarda como hoy.
- **CA-23 (HU-7):** Dada una actividad descartada, entonces su sesión de seguridad también termina y mis contactos de emergencia no reciben ningún aviso por ella (spec 008).
- **CA-24 (HU-8):** Si al detener no se puede cerrar la actividad en el teléfono (spec 003, CA-12), la pantalla muestra el mismo aviso de hoy, y al volver a abrir la app se aplica CA-22.
- **CA-25 (HU-7):** Dadas actividades ya guardadas con menos de 3 puntos válidos, en el teléfono o en el servidor, cuando instalo la versión de entrega, entonces se borran una sola vez y dejan de aparecer en Mis actividades, en Inicio y en los totales. Esto vale para las pendientes de subir y para las que ya se habían subido.
- **CA-26 (HU-7):** El servidor rechaza una actividad con menos de 3 puntos válidos, aunque alguien intente subirla directamente o desde una versión anterior de la app. El mensaje de error está en español (constitución 4.3).

## Reglas de negocio y validaciones

- RN-1: Un punto es válido si cuenta para la distancia según los criterios de la spec 004 (por ejemplo, su precisión). La app y el servidor aplican el mismo criterio, igual que con la distancia (spec 011, RN-11).
- RN-2: Una actividad se guarda solo si al cerrarse tiene **3 puntos válidos o más**. Con 0, 1 o 2 se descarta, sin importar cuántos puntos inválidos tenga.
- RN-3: La regla se aplica igual en los tres cierres: "Detener actividad", salir de la pantalla grabando y el cierre al volver a abrir la app. Solo el cierre al abrir la app descarta sin preguntar ni avisar.
- RN-4: Descartar una actividad borra del teléfono la actividad y todo lo que se grabó con ella, como sus puntos y sus lecturas del barómetro. El descarte lo decide esta regla y nunca un fallo de red o del servidor (constitución 2.4).
- RN-5: El borrado de CA-25 ocurre una sola vez y solo afecta a las actividades con menos de 3 puntos válidos. Ninguna otra actividad cambia.
- RN-6: Los textos nuevos (la pregunta de CA-17 y CA-21 y el error de CA-26) están en español y no usan términos técnicos.
- RN-7: Esta regla cambia lo que dicen la spec 003 (CA-10 y CA-15) y la spec 004 (CA-17). Al aprobar esta spec, el cambio se anota en sus historiales.
- RN-8: El build de entrega y el backend publicado no contienen secretos en el repositorio ni en el README (constitución 3.6).

## Requisitos no funcionales

- **Disponibilidad:** el backend publicado no se duerme por falta de uso, porque la tarea de la hora de regreso corre cada minuto (spec 008).
- **Seguridad:** la app se comunica con el backend solo por HTTPS. Android bloquea el HTTP sin cifrar en el build de release (nota de la 014).
- **Offline:** descartar una actividad no depende de la red (constitución 2.1). Si la sesión de seguridad no se puede terminar en el servidor por falta de conexión, queda en la bandeja como hoy (spec 008).
- **Rendimiento:** terminar sin guardar regresa a "Nueva actividad" igual de rápido que hoy se abre el resumen (spec 004).
- **Accesibilidad:** la pregunta de CA-17 y CA-21 se lee con TalkBack.

## Fuera de alcance

- Publicar la app en Google Play o compilar para iOS. No está en el roadmap.
- Cambiar cómo se capturan o filtran los puntos del GPS (specs 003 y 004).
- Corregir F5 (altitud del GPS en segundo plano, spec 011). Queda como limitación conocida (CA-16) y no tiene spec prevista.
- Distribuir el APK por enlace de descarga. Se entrega como archivo adjunto.
- Un mínimo de distancia o de duración para guardar una actividad. Esta spec solo cuenta puntos válidos.
- El mínimo de 1.5 km para publicar una ruta, que sigue igual (spec 007, CA-3).
- Borrar a mano una actividad guardada. No está en el roadmap; quedaría para una spec posterior al proyecto.
- Funcionalidades nuevas. La semana 10 es la última del roadmap.

## Preguntas abiertas

- [x] **P1:** Hospedaje del backend → **Oracle Cloud Always Free** (máquina virtual siempre encendida, gratis). Es la única opción gratis que no se duerme (CA-9, CA-10). Render Free, Railway Free y Koyeb Free se duermen por falta de uso. La constitución hoy dice "Railway o Render", así que el plan lo justifica y propone el cambio en la tabla del stack (constitución 7.1).
- [x] **P2:** Entrega del APK → **archivo adjunto**. CA-6.
- [x] **P3:** Formato del manual → **Markdown en el repositorio**. CA-4.
- [x] **P4:** Demo → **en vivo**; la actividad que se muestra se graba antes. CA-13 y CA-14.
- [x] **P5:** F5 → **queda como limitación conocida**. CA-16.
- [x] **P6:** "Ver N actividades" en dos renglones → **se corrige**. CA-28.
- [x] **P7:** Alertas de la demo → **bot real de Telegram**. CA-27.
- [x] **P8:** Autor → **Diego Manzo Escalante**.
- [ ] **P9:** ¿Cuánto dura la demo y en qué fecha es? Sirve para planear el ensayo de CA-13.
- [x] **P10:** Diseño del ícono → **la versión cuadrada del logo de la spec 009** (CA-4), sin diseño nuevo. CA-30. Como el repositorio solo tiene los logos horizontales (`assets/brand`), la versión cuadrada se exporta del diseño de la 009.

## Historial

- 2026-11-22 — Creación. Se escribió primero como spec 016 ("cierre y no guardar actividades con menos de 3 puntos"). Al resolver sus preguntas, el usuario aclaró que "cierre" es la entrega, así que la regla de los 3 puntos pasa a esta spec. Decisiones del usuario sobre esa regla: solo cuentan los puntos válidos; "Detener" pregunta antes de descartar; las actividades cortas ya guardadas se borran; el servidor las rechaza y las pendientes se descartan; el cierre al abrir la app descarta en silencio; los historiales de las specs 003 y 004 se anotan al aprobar esta spec.
- 2026-11-22 — Resueltas P2 a P8: APK adjunto, manual en Markdown, demo en vivo con una actividad grabada antes, F5 como limitación conocida, se corrige "Ver N actividades" (nuevo CA-28), alerta por el bot real de Telegram (nuevo CA-27). P1 (hospedaje) sigue abierta; se agrega P9 (duración y fecha de la demo).
- 2026-11-22 — Resuelta P1: el backend se publica en Oracle Cloud Always Free, por decisión del usuario.
- 2026-11-22 — Se agregan HU-9 y CA-29 a CA-32, a pedido del usuario: la app se llama "SendaBC" (hoy aparece como "frontend") y tiene su propio ícono y pantalla de arranque (pendiente de la spec 009). Se agrega P10.
- 2026-11-22 — Resuelta P10: el ícono es la versión cuadrada del logo de la spec 009, por decisión del usuario.
- 2026-11-22 — Aprobada por el usuario. P9 (duración y fecha de la demo) queda abierta, sin bloquear el plan. Se anota el cambio de la regla de los 3 puntos en los historiales de las specs 003 y 004 (RN-7).
- 2026-11-22 — Plan aprobado por el usuario, junto con la constitución v1.11.
