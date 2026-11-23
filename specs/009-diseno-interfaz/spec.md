# 009 — Diseño de la interfaz: prototipo en Figma e implementación en la app

- **Estado:** Implementada (cerrada 2026-11-20)
- **Semana:** 9
- **Autor(es):**
- **Fecha:** 2026-10-30

## Contexto y objetivo

Las pantallas de SendaBC se construyeron spec por spec (001 a 008) sin un diseño previo común. Ya existe una paleta con nombre (`frontend/lib/theme/colors.ts`), pero los tamaños de texto, espaciados y botones se repiten a mano en cada pantalla, algunas pantallas todavía usan colores sueltos, no hay logo ni tipografía definida y la app solo tiene modo claro. Antes de la prueba de campo y la demo final conviene definir un lenguaje visual único a partir de esa paleta, validarlo en un prototipo navegable en Figma y después aplicarlo a la app. Así se verá como un solo producto, se podrá leer al aire libre y será fácil de usar con una mano mientras se camina, corre o pedalea.

Corresponde al objetivo de la semana 9 del roadmap (pulido).

## Historias de usuario

- **HU-1:** Como equipo, queremos un sistema de diseño (colores en modo claro y oscuro, tipografía, espaciado, iconos, logo y componentes) documentado en Figma para que todas las pantallas se construyan con las mismas piezas.
- **HU-2:** Como equipo, queremos un prototipo navegable en Figma de las 14 pantallas y sus flujos para revisar y corregir el diseño antes de programarlo.
- **HU-3:** Como usuario, quiero que todas las pantallas de la app se vean y se comporten de forma consistente y que moverme entre sus secciones sea directo, para entenderla sin aprender cada pantalla por separado.
- **HU-4:** Como usuario que graba una actividad al aire libre, quiero leer las métricas y tocar los controles con facilidad, con sol directo y con una mano, para no detenerme a usar el teléfono.
- **HU-5:** Como usuario, quiero que la app use modo claro u oscuro según la configuración de mi teléfono, para usarla cómodamente de día y al amanecer o de noche.

## Criterios de aceptación

### Sistema de diseño en Figma

- **CA-1 (HU-1):** Dado el archivo de Figma del proyecto, cuando se abre su página de sistema de diseño, entonces contiene la paleta de `colors.ts` con los mismos nombres y valores en modo claro (fondo, texto, primario, secundario, datos, alerta, error y sus tonos), su equivalente en modo oscuro, la escala tipográfica y la escala de espaciado, con el uso de cada color indicado.
- **CA-2 (HU-1):** Dado el sistema de diseño, cuando se revisan sus componentes, entonces incluye al menos botón (primario, secundario, de texto y de peligro, con estados normal, presionado y deshabilitado), campo de texto (normal, con foco y con error), tarjeta, aviso/insignia de estado (incluida la de sincronización), encabezado de pantalla y la navegación principal, cada uno en modo claro y oscuro.
- **CA-3 (HU-1, HU-4, HU-5):** Dado cada par de color de texto y fondo que use el sistema de diseño, en modo claro y en modo oscuro, cuando se mide su contraste, entonces cumple al menos 4.5:1 para texto normal y 3:1 para texto grande y elementos gráficos (WCAG 2.1 AA).
- **CA-4 (HU-1):** Dado el sistema de diseño, cuando se revisa su página de identidad, entonces contiene una propuesta de logo de SendaBC (versión para fondo claro y para fondo oscuro, y una versión cuadrada usable como ícono) y una tipografía elegida, con su justificación y su licencia de uso libre.

### Prototipo navegable

- **CA-5 (HU-2):** Dado el prototipo en Figma, cuando se revisa su lista de pantallas, entonces existe un diseño, en modo claro y en modo oscuro, para cada una de las 14 pantallas actuales de la app: bienvenida, inicio de sesión, registro, inicio, grabación de actividad, resumen de actividad, historial, explorar rutas, publicar ruta, detalle de ruta, editar ruta, mis rutas, favoritas y contactos de emergencia, más el aviso "¿Estás bien?" de la spec 008.
- **CA-6 (HU-2, HU-3):** Dado el prototipo en modo presentación, cuando se recorre desde la bienvenida usando la navegación propuesta, entonces se pueden seguir sin salir del prototipo estos flujos: registro → inicio; inicio de sesión → inicio → grabar → finalizar → resumen; inicio → explorar rutas → detalle → favorita; publicar ruta; contactos de emergencia; y grabación → aviso "¿Estás bien?". Además, se llega a cualquiera de las 14 pantallas desde el inicio.
- **CA-7 (HU-2):** Dado el prototipo, cuando se revisan las pantallas con datos remotos o con estados variables, entonces muestran sus estados de carga, vacío, error y sin conexión cuando la funcionalidad original los define (por ejemplo, historial vacío, rutas sin conexión, actividad pendiente de sincronizar).
- **CA-8 (HU-2):** Dado el prototipo terminado, cuando el usuario (dueño del producto) lo revisa, entonces queda registrada su aprobación en el historial de esta spec antes de empezar la implementación en la app.

### Implementación en la app

- **CA-9 (HU-3):** Dada la app con el diseño implementado, cuando se recorre cada pantalla de CA-5, entonces sus colores, tipografía, espaciado, componentes y navegación coinciden con los del prototipo aprobado; las diferencias aceptadas quedan anotadas en `tasks.md`.
- **CA-10 (HU-3):** Dado el código de la app, cuando se revisan las pantallas y componentes, entonces los colores, tamaños de texto y espaciados se toman de una única definición compartida del sistema de diseño y no se repiten como valores sueltos.
- **CA-11 (HU-5):** Dado el teléfono en modo oscuro, cuando se abre la app y se recorren sus pantallas, entonces todas se muestran en modo oscuro; y dado el teléfono en modo claro, todas se muestran en modo claro. Si el usuario cambia el modo del teléfono con la app abierta, la app cambia sin reiniciarse.
- **CA-12 (HU-4):** Dada la pantalla de grabación de actividad, cuando el usuario la mira a la distancia de un brazo, entonces la distancia, el tiempo y la elevación son los textos más grandes de la pantalla y se leen sin acercar el teléfono.
- **CA-13 (HU-4):** Dado cualquier elemento táctil de la app, cuando se mide, entonces su área de toque es de al menos 48 × 48 dp, y el botón de iniciar/detener la grabación, "Pedir ayuda" y "Estoy bien" quedan al alcance del pulgar en la mitad inferior de la pantalla.
- **CA-14 (HU-1):** Dada la app instalada, cuando se abre, entonces la bienvenida muestra el logo aprobado y los textos usan la tipografía aprobada, también sin conexión.
- **CA-15 (HU-3):** Dado el diseño implementado, cuando se repiten los casos manuales de las specs 001 a 008, entonces todos siguen pasando, adaptando solo los pasos de navegación que cambien; el rediseño no cambia ningún otro comportamiento ya especificado.

## Reglas de negocio y validaciones

- RN-1: El rediseño cambia la apariencia y la forma de moverse entre pantallas, nada más. Ningún flujo, validación, mensaje de error ni regla de las specs 001 a 008 cambia por esta spec. Si el diseño propone un cambio de comportamiento, se trata como cambio a la spec correspondiente (con nota en su historial) o se deja para una spec futura.
- RN-2: Se puede cambiar la organización de la navegación (por ejemplo, una barra de pestañas inferior), siempre que las 14 pantallas sigan siendo alcanzables y los pasos de navegación de los casos manuales afectados se actualicen en sus `tasks.md`.
- RN-3: La paleta de modo claro es la de `frontend/lib/theme/colors.ts` y no se cambian sus valores base (fondo, texto, primario, secundario, datos, alerta). El modo oscuro usa variantes de esos mismos tonos. Los tonos marcados "fuera de la paleta base" (`textMuted`, `primaryDark`, `error`) sí pueden ajustarse o reemplazarse.
- RN-4: Un color de la paleta solo se usa en combinaciones que pasen CA-3. Hoy, sobre el fondo claro, el ocre (`secondary`, 3.3:1) solo sirve para texto grande, íconos y acentos, y el color de alerta (`alert`, 4.3:1) solo para texto grande o como fondo con texto blanco (5.1:1).
- RN-5: Se mantiene la separación de `colors.ts`: `alert` se reserva para el módulo de seguridad (inactividad, "¿Estás bien?", alertas) y `error` para errores de validación y acciones destructivas.
- RN-6: Los textos de la interfaz siguen en español.
- RN-7: La implementación en la app empieza solo después de la aprobación del prototipo (CA-8).
- RN-8: La app sigue el modo claro u oscuro del sistema; no se agrega un selector propio dentro de la app.

## Requisitos no funcionales

- **Legibilidad al aire libre:** contraste AA como mínimo (CA-3) en ambos modos; en la pantalla de grabación se prefiere más contraste que el mínimo.
- **Uso con una mano:** áreas de toque de 48 dp y acciones principales abajo (CA-13).
- **Accesibilidad:** los textos respetan el tamaño de letra del sistema sin cortarse ni encimarse; los íconos sin texto llevan etiqueta de accesibilidad.
- **Offline:** el diseño no depende de recursos descargados en tiempo de ejecución; la tipografía, el logo y los íconos van incluidos en la app (CA-14).
- **Rendimiento:** el rediseño no debe hacer más lenta la pantalla de grabación ni el mapa.

## Fuera de alcance

- Cambios de funcionalidad o nuevos flujos (no hay spec futura prevista; irían en una spec propia).
- Estilo de los mapas: las pantallas de rutas conservan el mapa estándar. La pantalla de grabación tiene su mapa desde la spec 010.
- Selector de tema dentro de la app (RN-8).
- Ícono de la app y pantalla de arranque configurados en el build final: van con 012-entrega (EAS Build), usando el logo de CA-4.
- Corrección de bugs, prueba de campo y pruebas unitarias pendientes: 011-estabilidad.
- Manual de usuario y capturas para la demo: 012-entrega (se harán ya con el diseño nuevo).
- Versión para tableta o web.

## Preguntas abiertas

Ninguna. Ver las decisiones resueltas en el historial.

## Historial

- 2026-11-20 — Pasa a Implementada: el único pendiente, 004 M3 en un teléfono con barómetro, se corrió en la spec 011 (M29). 009 M1 se repitió en un teléfono real en la 011 (M34).
- 2026-11-06 — "Fuera de alcance": la pantalla de grabación ya tiene mapa, por la spec 010 (T25).
- 2026-11-05 — Referencias actualizadas por la nueva numeración del roadmap: 010-mapa-3d-animaciones, 011-estabilidad y 012-entrega. Sin cambios de comportamiento.
- 2026-11-05 — Implementada con pendientes, confirmado por el usuario: 14 de 15 CA verificados. CA-15 queda parcial porque falta 004 M3 (teléfono con barómetro), pendiente desde antes del rediseño. El usuario acepta la diferencia 8 con el prototipo (Editar ruta sin chips de dificultad).
- 2026-11-03 — El usuario acepta las 7 diferencias con el prototipo anotadas en `tasks.md` (CA-9).
- 2026-10-30 — Prototipo en Figma aprobado por el usuario (CA-8): https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX. Sin cambios pedidos, salvo el estilo de los avisos, que ya se había aplicado en T3. Ya puede empezar la fase B (RN-7).
- 2026-10-30 — CA-13 corregida al diseñar T4: la grabación no tiene pausa (spec 003), solo "Iniciar actividad" / "Detener actividad". El control que va abajo es ese botón, además de "Pedir ayuda" (spec 008).
- 2026-10-30 — En progreso: T1 hecha (archivo de Figma con páginas, variables y estilos de texto).
- 2026-10-30 — Plan aprobado por el usuario. Constitución v1.7.
- 2026-10-30 — Aprobada por el usuario.
- 2026-10-30 — Preguntas resueltas por el usuario: P1 se conserva la paleta de `colors.ts` y se propone logo y tipografía (RN-3, CA-4); P2 el prototipo lo hace Claude con el MCP de Figma; P3 modo claro y oscuro (HU-5, CA-11); P4 las 14 pantallas (CA-5); P5 se puede cambiar la navegación (RN-2); P6 sin preferencia de fuente ni íconos, se proponen en el sistema de diseño; P7 numeración 009 (semana 9), 010-estabilidad y 011-entrega; P8 los mapas quedan fuera. Se agrega RN-4 porque `secondary` y `alert` no alcanzan 4.5:1 sobre el fondo claro.
- 2026-10-30 — Creación.
- 2026-11-22 — Por las pruebas de casos límite en el emulador: en todas las pantallas con formulario y botones abajo (inicio de sesión, registro, publicar y editar ruta, cambiar correo, cambiar contraseña y borrar cuenta), el contenido se acomoda al teclado para que los botones queden a la vista. Aprobado por el usuario.
