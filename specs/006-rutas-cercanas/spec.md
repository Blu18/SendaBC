# 006 — Catálogo de rutas cercanas en un mapa

- **Estado:** Implementada (2026-10-17)
- **Semana:** 6
- **Autor(es):**
- **Fecha:** 2026-10-16

## Contexto y objetivo

Objetivo de la semana 6: **el usuario puede ver rutas cercanas creadas por otros usuarios en un mapa.**

Hasta ahora SendaBC sirve para registrar lo que uno hace (specs 003–005). El catálogo es lo que le da valor a la comunidad: quien llega a Ensenada, Tecate o la Sierra de San Pedro Mártir quiere saber qué rutas hay cerca, de qué tipo son y qué tan largas y empinadas son, antes de salir. Esta spec cubre **descubrir** rutas; publicarlas, verlas a detalle y guardarlas como favoritas es la spec 007.

Como publicar llega hasta la 007, esta semana el catálogo se alimenta con un conjunto de **rutas de ejemplo** de Baja California.

## Historias de usuario

- **HU-1:** Como usuario, quiero ver en un mapa las rutas que hay cerca de donde estoy, para decidir a dónde salir.
- **HU-2:** Como usuario, quiero ver los datos básicos de una ruta (tipo, distancia, desnivel, dificultad y qué tan lejos está de mí) sin salir del mapa.
- **HU-3:** Como usuario que planea un viaje, quiero explorar otra zona moviendo el mapa y ampliar la distancia de búsqueda, para ver qué rutas hay allá.
- **HU-4:** Como usuario, quiero ver solo las rutas del tipo de actividad que me interesa.
- **HU-5:** Como usuario, quiero entender qué pasa si no doy permiso de ubicación, si no hay rutas cerca o si no tengo conexión.
- **HU-6:** Como equipo de desarrollo, queremos rutas de ejemplo reales de Baja California para construir y probar el catálogo antes de que los usuarios puedan publicar.

## Criterios de aceptación

### Mapa y rutas cercanas

- **CA-1 (HU-1):** Desde la pestaña Rutas puedo abrir "Explorar rutas" y veo un mapa centrado en mi ubicación actual, con las rutas cercanas ya buscadas.
- **CA-2 (HU-1):** Dado que hay rutas publicadas dentro del radio de búsqueda alrededor del centro del mapa, cada una aparece dibujada sobre el mapa con su recorrido y un marcador en su punto de inicio.
- **CA-3 (HU-1):** Solo aparecen rutas publicadas: los borradores y las rutas archivadas nunca se muestran.
- **CA-4 (HU-1):** Una ruta cuyo punto de inicio está fuera del radio de búsqueda no aparece.
- **CA-5 (HU-1):** Si hay más de **50** rutas dentro del radio, aparecen las 50 más cercanas al centro de la búsqueda.
- **CA-6 (HU-1):** Mis propias rutas publicadas también aparecen, con una marca **"Tuya"** en su tarjeta.

### Datos de una ruta

- **CA-7 (HU-2):** Cuando toco una ruta (su recorrido o su marcador), veo una tarjeta con su nombre, tipo de actividad, distancia, elevación ganada, dificultad (si la tiene) y la distancia en línea recta desde mi ubicación hasta su punto de inicio.
- **CA-8 (HU-2):** La ruta seleccionada se distingue de las demás en el mapa; al tocar otra ruta o una zona vacía del mapa, la selección cambia o desaparece.

### Explorar otra zona y radio de búsqueda

- **CA-9 (HU-3):** Cuando muevo o acerco el mapa a otra zona, aparece el botón "Buscar en esta zona"; al tocarlo se muestran las rutas cercanas al nuevo centro del mapa, con las mismas reglas de CA-2 a CA-6.
- **CA-10 (HU-3):** Hay un botón para volver a centrar el mapa en mi ubicación y buscar ahí.
- **CA-11 (HU-3):** Puedo cambiar el radio de búsqueda entre **5, 10, 25, 50 y 100 km**. Cada vez que abro "Explorar rutas" el radio es de **25 km**. Al cambiarlo, se vuelve a buscar en el centro actual del mapa.

### Filtro por tipo

- **CA-12 (HU-4):** Puedo elegir entre "Todas", "Senderismo", "Trail running" y "Ciclismo"; el mapa muestra solo las rutas del tipo elegido. Por defecto se muestran todas.

### Casos sin datos, sin permiso o sin conexión

- **CA-13 (HU-5):** Si no hay rutas publicadas en la zona buscada, veo el mensaje "No hay rutas publicadas cerca de aquí. Mueve el mapa o aumenta la distancia de búsqueda."
- **CA-14 (HU-5):** Si no concedo el permiso de ubicación, el mapa se abre mostrando todo el estado de **Baja California**, sin buscar todavía, con un aviso que explica que sin el permiso no se puede centrar en mí ni calcular la distancia hasta cada ruta. Puedo explorar moviendo el mapa y usando "Buscar en esta zona"; en la tarjeta no aparece la distancia hasta mí.
- **CA-15 (HU-5):** Si no hay conexión, veo un mensaje que explica que explorar rutas necesita internet, y no se queda cargando indefinidamente. No se muestran búsquedas anteriores (eso queda para la spec 009). Grabar actividades sigue funcionando sin conexión (constitución 2.1).
- **CA-16 (HU-5):** Mientras se buscan rutas se ve un indicador de carga; si la búsqueda falla por un error del servidor, veo un mensaje y puedo reintentar.

### Acceso

- **CA-17 (HU-1):** Explorar rutas requiere sesión iniciada, igual que el resto de la app.

### Rutas de ejemplo

- **CA-18 (HU-6):** El catálogo cuenta con al menos **12 rutas de ejemplo** publicadas, repartidas en al menos **4 zonas** de Baja California (por ejemplo Ensenada, Tecate, Sierra de Juárez y Sierra de San Pedro Mártir) e incluyendo los tres tipos de actividad.
- **CA-19 (HU-6):** Las rutas de ejemplo aparecen como creadas por **"SendaBC"**, no por un usuario real, y nunca llevan la marca "Tuya".
- **CA-20 (HU-6):** Las rutas de ejemplo se pueden cargar en una base vacía y quitar del catálogo sin afectar las rutas ni las actividades de los usuarios. Volver a cargarlas no las duplica.

## Reglas de negocio y validaciones

- RN-1: La cercanía se mide desde el punto de inicio de la ruta hasta el centro de la búsqueda, en metros sobre la superficie terrestre.
- RN-2: La distancia mostrada en la tarjeta (CA-7) es en línea recta hasta el inicio, no la distancia por camino.
- RN-3: Las rutas se muestran con los datos guardados al publicarlas; el catálogo no recalcula distancia ni desnivel.
- RN-4: Formato de distancias y elevación igual que en el resumen de actividad (spec 004, RN-1).
- RN-5: El radio de búsqueda nunca pasa de 100 km.

## Requisitos no funcionales

- Rendimiento: con conexión normal, las rutas de una zona aparecen en menos de 2 segundos, incluso con el radio de 100 km.
- Privacidad: la ubicación del usuario se usa solo para centrar el mapa y calcular distancias; no se guarda en el servidor por explorar rutas (constitución 3.5).
- Datos móviles: una búsqueda no debe descargar el recorrido completo de rutas que no se muestran.

## Fuera de alcance

- Publicar una actividad como ruta pública → **007-publicar-rutas**.
- Vista de detalle de una ruta (mapa completo, perfil de elevación, dificultad estimada) → **007-publicar-rutas**.
- Guardar rutas como favoritas → **007-publicar-rutas**.
- Mostrar búsquedas anteriores o mapas sin conexión → **009-estabilidad**.
- Una lista de rutas además del mapa.
- Navegación guiada paso a paso o seguir una ruta en vivo.
- Buscar rutas por nombre o por región.

## Preguntas abiertas

Resueltas el 2026-10-16:

- [x] **P1:** Origen de las rutas → **rutas de ejemplo** de Baja California, publicadas; la publicación real llega en la 007. HU-6, CA-18 a CA-20.
- [x] **P2:** Radio → **25 km por defecto, modificable hasta 100 km**. CA-11, RN-5.
- [x] **P3:** Máximo → **50 rutas**, las más cercanas. CA-5.
- [x] **P4:** Mis propias rutas → **sí**, con la marca "Tuya". CA-6.
- [x] **P5:** Sin permiso de ubicación → **mapa de todo Baja California**. CA-14.
- [x] **P6:** Sin conexión → **solo mensaje** hasta la spec 009. CA-15.
- [x] **P7:** Lista además del mapa → **no** en esta spec.

## Historial

- 2026-11-01 — Pasos de navegación de los casos manuales actualizados a la barra de pestañas de la spec 009 (T19, CA-15). CA-1: "Explorar rutas" es la pestaña Rutas (spec 009, RN-2). "Abrir" es entrar a la pestaña desde otra: vuelve a empezar centrada en el usuario, con 25 km y todas (CA-1, CA-11 y CA-12); al volver del detalle conserva el mapa. Casos M1, M4 y M7.
- 2026-10-17 — Implementada: los 20 CA verificados (pruebas automáticas y casos manuales M1–M8). Las rutas de ejemplo salen de trazas GPX reales (plan D8) y la app se prueba con un development build (plan D7).
- 2026-10-16 — En progreso: T1 (migración de `startPoint` a `geography`) aplicada.
- 2026-10-16 — Aprobada por el usuario.
- 2026-10-16 — Se resuelven las preguntas abiertas P1–P7: rutas de ejemplo, radio modificable, marca "Tuya" y mapa de Baja California sin permiso.
- 2026-10-16 — Creación.
