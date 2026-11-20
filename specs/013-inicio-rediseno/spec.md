# 013 — Rediseño de la pantalla de inicio

- **Estado:** En progreso
- **Semana:** 10
- **Autor(es):**
- **Fecha:** 2026-11-20

## Contexto y objetivo

La pestaña Inicio creció por acumulación: cada spec le sumó una pieza (botón de nueva actividad en la 003, resumen de seguridad en la 008, mapas sin conexión y avatar de perfil en la 011, cerrar sesión desde la 002). Hoy es una lista de tarjetas sin jerarquía que no dice nada de la actividad del usuario ni de lo que ofrece la comunidad: las rutas publicadas (specs 006 y 007) solo se descubren entrando a la pestaña Rutas.

El objetivo es que Inicio sea el punto de partida antes de salir: empezar a grabar en un toque, ver cómo voy en los últimos días y descubrir rutas cercanas y populares sin abrir el mapa. Va en la semana 10, **antes** de la entrega (spec 012), para que sea la primera pantalla de la demo.

De paso, Explorar rutas y el detalle de ruta pasan a usar el mismo mapa que la grabación (spec 010). Hoy usan otro proveedor, así que la app muestra dos estilos de mapa distintos.

## Historias de usuario

- **HU-1:** Como usuario, quiero empezar una actividad desde Inicio con un solo toque, para no perder tiempo al llegar al punto de salida.
- **HU-2:** Como usuario, quiero ver en Inicio mis últimas actividades y un resumen de los últimos 7 días, para saber cómo voy sin abrir el historial.
- **HU-3:** Como usuario, quiero ver en Inicio rutas publicadas cerca de mí, para decidir a dónde ir sin abrir el mapa.
- **HU-4:** Como usuario, quiero ver en Inicio las rutas más populares (las que más gente guarda en favoritas), para descubrir las que recomienda la comunidad.
- **HU-5:** Como usuario, quiero que Inicio me diga si me faltan contactos de emergencia o tengo actividades sin subir, y que me lleve a los mapas sin conexión, para prepararme antes de quedarme sin señal.
- **HU-6:** Como usuario, quiero que Inicio funcione sin conexión con lo que hay en el teléfono, para usarla en el campo.
- **HU-7:** Como usuario, quiero encontrar las opciones de mi cuenta (incluido cerrar sesión) en mi perfil y no mezcladas con lo que uso para salir.
- **HU-8:** Como equipo, queremos elegir el diseño de Inicio entre varias propuestas antes de programarlo.
- **HU-9:** Como usuario, quiero que los mapas de rutas se vean igual que el mapa de la grabación, para reconocer el terreno y las rutas sin cambiar de estilo entre pantallas.

## Criterios de aceptación

### Empezar una actividad

- **CA-1 (HU-1):** Dado que abro la app con sesión iniciada, cuando veo Inicio, entonces la acción para empezar una actividad es el elemento principal y está visible sin desplazarme, en un teléfono de 360 dp de ancho con el tamaño de letra predeterminado.
- **CA-2 (HU-1):** Dado Inicio, cuando toco la acción de empezar, entonces llego a la pantalla de grabación igual que hoy (spec 003), sin pasos intermedios nuevos.

### Mis actividades

- **CA-3 (HU-2):** Dado que tengo actividades terminadas en este teléfono, cuando veo Inicio, entonces veo las 3 más recientes (o las que haya, si son menos), de la más nueva a la más vieja, cada una con su tipo, fecha, distancia, duración y un mapa en miniatura con su recorrido. Tipo, fecha, distancia y duración tienen el mismo valor y formato que en el historial (spec 004).
- **CA-4 (HU-2):** Dada una de esas actividades, cuando la toco, entonces se abre su resumen (spec 004), igual que desde el historial.
- **CA-5 (HU-2):** Dado Inicio, cuando lo veo, entonces hay un acceso al historial completo.
- **CA-6 (HU-2):** Dado que tengo actividades terminadas en los últimos 7 días, cuando veo Inicio, entonces veo su total: número de actividades, distancia, duración y elevación ganada (RN-4). Sin ninguna en ese periodo, los totales salen en cero junto a una invitación a empezar.
- **CA-7 (HU-2):** Dado que no tengo ninguna actividad, cuando veo Inicio, entonces veo un mensaje para empezar la primera en lugar de la lista.
- **CA-8 (HU-2, HU-6):** Dado que no tengo conexión ni la zona descargada, cuando veo una actividad reciente, entonces su miniatura sigue mostrando la forma del recorrido, aunque no tenga el fondo del mapa.

### Rutas cerca de mí

- **CA-9 (HU-3):** Dado que di permiso de ubicación y tengo conexión, cuando veo Inicio, entonces veo hasta 5 rutas publicadas cuyo punto de inicio está a 25 km o menos de mí, de la más cercana a la más lejana (mismas reglas que spec 006, CA-3 y RN-1). Cada una muestra su nombre, tipo, distancia, dificultad (si la tiene) y qué tan lejos está su inicio.
- **CA-10 (HU-3):** Dado que no hay rutas publicadas en 25 km, cuando veo Inicio, entonces veo un mensaje que lo dice y un acceso a explorar el mapa (spec 006).
- **CA-11 (HU-3):** Dado que no di permiso de ubicación, cuando veo Inicio, entonces en lugar de las rutas cercanas veo un aviso que explica por qué no aparecen y cómo darlo. La app no pide el permiso al abrir Inicio.
- **CA-12 (HU-3):** Dado Inicio con rutas cercanas, cuando toco el acceso para ver más, entonces se abre la pestaña Rutas (spec 006).

### Rutas populares

- **CA-13 (HU-4):** Dado que tengo conexión, cuando veo Inicio, entonces veo hasta 5 rutas publicadas con más favoritas, de más a menos (RN-6). Cada una muestra su nombre, tipo, zona, distancia, dificultad (si la tiene) y cuántas personas la tienen en favoritas.
- **CA-14 (HU-4):** Dadas dos rutas con el mismo número de favoritas, cuando aparecen en la lista, entonces va primero la publicada más recientemente.
- **CA-15 (HU-4):** Dado que ninguna ruta tiene favoritas, cuando veo Inicio, entonces la sección de populares no aparece, en lugar de mostrar una lista en cero.
- **CA-16 (HU-3, HU-4):** Dada una ruta cercana o popular, cuando la toco, entonces se abre su detalle (spec 007), donde puedo guardarla en favoritas.
- **CA-17 (HU-4):** Dado que guardo o quito una ruta de favoritas, cuando vuelvo a Inicio, entonces el número de favoritas de esa ruta ya refleja el cambio.

### Listo para salir

- **CA-18 (HU-5):** Dado que no tengo contactos de emergencia activos, cuando veo Inicio, entonces veo un aviso que lo indica y me lleva a configurarlos (spec 008, CA-8). Con contactos activos, veo a quién se avisaría, como hoy. Si la lista no se pudo cargar, no aparece el aviso de "sin contactos".
- **CA-19 (HU-5):** Dado que tengo actividades sin subir, cuando veo Inicio, entonces veo cuántas son. Sin ninguna pendiente, no aparece ese aviso.
- **CA-20 (HU-5):** Dado Inicio, cuando quiero descargar un mapa para grabar sin señal, entonces llego a las zonas sin conexión (spec 011, CA-32) desde Inicio. Inicio no avisa si hay o no zonas descargadas.

### Sin conexión

- **CA-21 (HU-6):** Dado que no tengo conexión, cuando abro Inicio, entonces veo la acción de empezar, mis últimas actividades, el total de 7 días y las actividades sin subir, con los datos del teléfono, en el mismo tiempo que con conexión.
- **CA-22 (HU-6):** Dado que no tengo conexión, cuando veo Inicio, entonces las secciones de rutas cercanas y populares muestran que se necesita conexión, sin ocupar la pantalla con errores, y se actualizan solas al volver la red (spec 011, F7).
- **CA-23 (HU-6):** Dado que el perfil no se pudo cargar, cuando abro Inicio, entonces la pantalla se puede usar completa; solo el saludo y el avatar usan un valor genérico.

### Cuenta

- **CA-24 (HU-7):** Dado Inicio, cuando lo recorro, entonces no está el botón "Cerrar sesión"; está en mi perfil, al que llego con el avatar de Inicio (spec 011, CA-42).
- **CA-25 (HU-7):** Dado mi perfil, cuando cierro sesión con actividades sin subir, entonces veo el mismo aviso que hoy (spec 005, CA-24) y, al confirmar, regreso a la bienvenida sin poder volver atrás (spec 002, CA-6).

### Diseño y accesibilidad

- **CA-26 (HU-8):** Dadas las propuestas de diseño de Inicio, cuando el usuario elige una, entonces esa queda en el archivo de Figma "SendaBC — Diseño" en modo claro y oscuro, incluidos los estados vacío, sin conexión y sin permiso de ubicación, y se anota la elección en el historial de esta spec. No se programa la pantalla antes de esa elección.
- **CA-27 (HU-8):** Dado Inicio en modo claro y en modo oscuro, cuando lo comparo con el diseño elegido en Figma, entonces coincide en estructura, orden y componentes, y usa solo piezas del sistema de diseño de la spec 009.
- **CA-28 (HU-1 a HU-7):** Dado un lector de pantalla, cuando recorro Inicio, entonces cada sección tiene encabezado, cada elemento tocable tiene nombre (las miniaturas se describen con el tipo y la distancia de la actividad) y el orden de lectura sigue el visual. Contrastes y áreas de toque cumplen la spec 009.
- **CA-29 (HU-1 a HU-7):** Dado el tamaño de letra más grande del sistema, cuando abro Inicio, entonces ningún texto se corta ni se encima.

### Mapa de rutas

- **CA-30 (HU-9):** Dado Explorar rutas o el detalle de una ruta, cuando veo el mapa, entonces tiene el mismo proveedor y estilo que el mapa de la grabación (spec 010), en modo claro y oscuro.
- **CA-31 (HU-9):** Dado Explorar rutas con el mapa nuevo, cuando repito sus casos (spec 006, CA-1 a CA-17), entonces todos se cumplen igual: recorridos y marcadores, selección, "Buscar en esta zona", radio, sin permiso y sin conexión.
- **CA-32 (HU-9):** Dado el detalle de una ruta con el mapa nuevo, cuando lo abro, entonces veo su recorrido completo y su inicio como hoy (spec 007), también para una ruta consultada sin conexión (spec 011, CA-53 a CA-60).
- **CA-33 (HU-9):** Dada la app terminada, cuando reviso sus pantallas, entonces ninguna usa ya el mapa del proveedor anterior.
- **CA-34 (HU-9):** Dada una zona descargada (spec 011, CA-32), cuando abro Explorar rutas o el detalle de una ruta sin conexión dentro de esa zona, entonces veo el fondo del mapa igual que al grabar. Fuera de las zonas descargadas, el mapa sin red se comporta como hoy.

## Reglas de negocio y validaciones

- RN-1: Inicio solo muestra datos; no cambia el estado de ninguna actividad ni dispara una sincronización distinta a la que ya existe (spec 005).
- RN-2: Mis actividades y el total de 7 días usan las actividades terminadas del usuario con sesión iniciada guardadas en este teléfono, subidas o no. Una actividad en grabación no cuenta.
- RN-3: Los totales suman las métricas ya calculadas de cada actividad (spec 004); Inicio no las recalcula. La elevación ganada suma la de cada actividad, sea de barómetro o de GPS.
- RN-4: "Últimos 7 días" son las 7 × 24 h anteriores al momento en que se muestra Inicio. Una actividad cuenta si empezó dentro de ese periodo.
- RN-5: Solo se muestran rutas publicadas; nunca borradores ni archivadas (spec 006, CA-3). Mis propias rutas pueden aparecer con su marca "Tuya" (spec 006, CA-6).
- RN-6: La popularidad de una ruta es el número de cuentas distintas que la tienen en favoritas. Las populares se toman de todas las rutas publicadas, sin importar la distancia.
- RN-7: La cercanía usa la misma medida que Explorar rutas (spec 006, RN-1), con un radio fijo de 25 km.
- RN-8: El número de favoritas de una ruta se muestra, pero nunca quién la guardó.
- RN-9: El cambio de mapa no cambia ningún criterio de las specs 006 y 007; solo el proveedor, el estilo y el fondo sin red en las zonas descargadas (CA-34). Esto amplía la spec 011, RN-8 (las zonas descargadas ya no se usan solo al grabar); se anota en su historial al implementar. Las miniaturas de Inicio usan el mismo estilo de mapa.

## Requisitos no funcionales

- **Offline:** lo de CA-21 se lee del teléfono; ninguna sección local espera a la red para mostrarse.
- **Rendimiento:** las secciones locales se muestran en menos de 1 s con 200 actividades guardadas en el S9+. Con conexión normal, rutas cercanas y populares aparecen en menos de 2 s.
- **Privacidad:** la ubicación se usa solo para buscar rutas cercanas mientras Inicio está abierta, con el permiso de primer plano ya existente (constitución 3.5); no se guarda ni se envía fuera de esa búsqueda.
- **Batería y datos:** las miniaturas no deben hacer que Inicio tarde más en abrirse ni descargar mapas que no se pidieron.
- **Accesibilidad:** áreas de toque de al menos 48 dp, contraste AA y movimiento reducido respetado (specs 009 y 010).

## Fuera de alcance

- Estadísticas por mes, gráficas, récords personales o metas → no está en el roadmap.
- Filtrar o cambiar el radio de las rutas cercanas desde Inicio → eso se hace en Explorar rutas (spec 006).
- Rutas populares por zona, temporada o tipo de actividad → no está en el roadmap.
- Guardar en favoritas directamente desde Inicio → se hace en el detalle de la ruta (spec 007).
- Clima, pronóstico o avisos de la zona → no está en el roadmap.
- Avisar que no hay zonas de mapa descargadas → decidido en P6: Inicio solo da acceso.
- Cambiar el comportamiento de Explorar rutas o del detalle de ruta → solo cambian el mapa y su fondo sin red (RN-9).
- Descargar zonas desde Explorar o desde el detalle → se siguen descargando desde Mapas sin conexión (spec 011).
- Rediseñar otras pestañas → no está en el roadmap (la 009 ya cubrió el diseño general).
- Manual de usuario y capturas para la entrega → spec 012 (entrega).

## Preguntas abiertas

- [x] **P1 — Alcance:** Inicio muestra rutas populares (más favoritas) y rutas cercanas, además de empezar y mis actividades. HU-3, HU-4, CA-9 a CA-17.
- [x] **P2 — Diseño:** no existe; se generan tres propuestas y el usuario elige una. HU-8, CA-26, CA-27.
- [x] **P3 — Resumen:** últimos 7 días, con número de actividades, distancia, duración y elevación ganada. CA-6, RN-4.
- [x] **P4 — Actividades recientes:** las últimas 3, con mapa en miniatura. CA-3, CA-8.
- [x] **P5 — Cerrar sesión:** se mueve al perfil. CA-24, CA-25.
- [x] **P6 — Mapas sin conexión:** Inicio solo da acceso. CA-20.
- [x] **P7 — Orden:** la 013 va antes de la 012.
- [x] **P8 — "Actividades" populares y cercanas:** son **rutas publicadas**. HU-3, HU-4.
- [x] **P9 — Cantidades:** hasta 5 cercanas en 25 km y hasta 5 populares. CA-9, CA-13.
- [x] **P10 — Alcance de populares:** todo Baja California, sin importar la distancia. RN-6.
- [x] **P11 — Miniatura sin red:** por ahora, solo la forma del recorrido sobre un fondo liso (CA-8). Decisión provisional: el usuario la confirma o la cambia al ver el diseño implementado.
- [x] **P12 — Diseño:** el elegido parte de una cuarta propuesta, D · A + C: métricas de 7 días y botón fijo de C; Cerca de ti, Tus actividades, Populares y Listo para salir de A, en ese orden. Confirmada por el usuario. CA-26.
- [x] **P13 — Zonas descargadas en Explorar y en el detalle:** sí, se ven sin red. CA-34, RN-9. Pregunta original: con el mismo mapa que la grabación, las zonas descargadas (spec 011) podrían verse también en Explorar y en el detalle sin red. Hoy está fuera de alcance (011, RN-8). ¿Se agrega o se queda fuera?

## Historial

- 2026-11-20 — Creación.
- 2026-11-20 — Se resuelven P1 a P7: se agregan rutas cercanas y populares (HU-3, HU-4), las 3 actividades recientes con miniatura, el total de 7 días con elevación, tres propuestas de diseño (HU-8) y cerrar sesión en el perfil. Se abren P8 a P11.
- 2026-11-20 — Tres propuestas de diseño para elegir (CA-26): A · Tablero, B · Mapa primero y C · Bitácora, en https://claude.ai/artifact/9JEBgHotaEnwPYLK5HvDeh. La elegida se pasa a Figma en el plan.
- 2026-11-20 — Se resuelven P8 a P11 (P11, provisional). Se agrega el cambio del mapa de Explorar y del detalle de ruta al de la grabación (HU-9, CA-30 a CA-33, RN-9). Se pide una cuarta propuesta, D · A + C (P12). Se abre P13.
- 2026-11-20 — El usuario confirma la propuesta D · A + C (P12). Se resuelve P13: las zonas descargadas se ven en Explorar y en el detalle sin red (CA-34, RN-9). Sin preguntas abiertas; lista para que el usuario la apruebe.
- 2026-11-20 — Aprobada por el usuario.
- 2026-11-20 — En progreso. Inicio (propuesta D) en Figma, en claro y oscuro con sus estados (T1): https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX?node-id=57-3359. Falta la aprobación del usuario (T2, CA-26).
- 2026-11-20 — Prototipo de Inicio en Figma aprobado por el usuario (CA-26), sin cambios: https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX?node-id=57-3359. Ya se puede programar `mainPage` (T22).
