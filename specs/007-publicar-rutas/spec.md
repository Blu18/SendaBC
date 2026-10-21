# 007 — Publicar rutas, detalle y favoritas

- **Estado:** Implementada (2026-10-21)
- **Semana:** 7
- **Autor(es):**
- **Fecha:** 2026-10-20

## Contexto y objetivo

Objetivo de la semana 7: **el usuario puede publicar como ruta una actividad que grabó, ver el detalle de cualquier ruta y guardar sus favoritas.**

Con la spec 006, el catálogo muestra rutas cercanas, pero solo tiene las rutas de ejemplo: nadie puede aportar las suyas. Esta spec cierra ese ciclo. Quien grabó un buen recorrido en la Sierra de Juárez puede compartirlo, y quien explora el mapa puede ver el recorrido completo y su perfil de elevación antes de salir, y guardar las rutas que le interesan para encontrarlas después.

## Historias de usuario

- **HU-1:** Como usuario, quiero publicar una de mis actividades como ruta pública, para que otras personas puedan encontrarla en el catálogo.
- **HU-2:** Como usuario que publica, quiero ponerle a la ruta un nombre, una descripción y su zona, para que otros sepan qué esperar.
- **HU-3:** Como usuario que explora rutas, quiero ver el detalle de una ruta (recorrido completo, perfil de elevación y sus datos) para decidir si es para mí.
- **HU-4:** Como usuario, quiero guardar rutas en favoritas y quitarlas, para no tener que volver a buscarlas.
- **HU-5:** Como usuario, quiero ver la lista de mis rutas favoritas y abrir cualquiera de ellas.
- **HU-6:** Como usuario que publica, quiero ver, editar, archivar y borrar las rutas que he publicado.

## Criterios de aceptación

### Publicar una actividad como ruta

- **CA-1 (HU-1):** Dada una actividad mía terminada, sincronizada y de al menos 1.5 km, cuando abro su resumen, entonces veo la opción "Publicar como ruta".
- **CA-2 (HU-1):** Dada una actividad que todavía no se sube a mi cuenta ("Pendiente de subir" o "No se pudo subir", spec 005), cuando abro su resumen, entonces no puedo publicarla y veo que primero tiene que subirse.
- **CA-3 (HU-1):** Dada una actividad de menos de 1.5 km, cuando abro su resumen, entonces no puedo publicarla y veo que una ruta debe medir al menos 1.5 km (RN-5).
- **CA-4 (HU-2):** Cuando elijo "Publicar como ruta", entonces veo un formulario con:
  - nombre (obligatorio);
  - descripción (opcional);
  - zona, ya llenada con la que la app deduce del inicio del recorrido y que puedo cambiar o borrar (RN-7);
  - la dificultad que calcula la app (RN-6), sin poder cambiarla;
  - los datos que se toman de la actividad sin poder cambiarlos: tipo, distancia, elevación ganada y recorrido;
  - un aviso de que el recorrido se publica completo, incluidos su inicio y su final.
- **CA-5 (HU-2):** Dado un nombre vacío o de más de 40 caracteres, o una descripción de más de 200, cuando intento publicar, entonces veo un mensaje en español junto al campo y no se publica nada (RN-4).
- **CA-6 (HU-1):** Dado un formulario válido y conexión, cuando confirmo, entonces veo que la ruta se publicó. A partir de ese momento aparece en "Explorar rutas" para cualquier usuario, con las reglas de la spec 006, y para mí con la marca "Tuya".
- **CA-7 (HU-1):** Dado que no hay conexión o el servidor falla, cuando confirmo, entonces veo un mensaje que lo explica, no se publica nada, lo que escribí no se pierde y puedo volver a intentarlo.
- **CA-8 (HU-1):** Dada una actividad que ya tiene una ruta mía (publicada o archivada), cuando abro su resumen, entonces no puedo publicarla otra vez y en su lugar veo "Ver ruta publicada" (RN-2). Si borré esa ruta, la actividad se puede publicar de nuevo como en CA-1.
- **CA-9 (HU-1):** Solo puedo publicar mis propias actividades. El servidor rechaza publicar una actividad de otra cuenta, una que no existe o una de menos de 1.5 km, aunque alguien lo intente directamente.

### Detalle de una ruta

- **CA-10 (HU-3):** Dada una ruta seleccionada en "Explorar rutas", cuando toco "Ver detalle" en su tarjeta, entonces se abre una vista con:
  - el recorrido completo en un mapa;
  - el nombre, el tipo, la zona, la dificultad, la distancia y la elevación ganada;
  - el autor y la descripción;
  - si hay permiso de ubicación, la distancia en línea recta desde mí hasta el inicio.
- **CA-11 (HU-3):** El detalle muestra el perfil de elevación de la ruta (altitud contra distancia recorrida). Esto incluye las rutas de ejemplo (RN-8).
- **CA-12 (HU-3):** El detalle de una ruta mía muestra la marca "Tuya" y, además, las opciones para editarla, archivarla o volver a publicarla, y borrarla (CA-22 a CA-25). El de una ruta de ejemplo dice "Por SendaBC" (spec 006, CA-19).
- **CA-13 (HU-3):** Dado que no hay conexión o el servidor falla, cuando abro el detalle, entonces veo un mensaje que lo explica y un botón "Reintentar", y no se queda cargando indefinidamente.
- **CA-14 (HU-3):** Dada una ruta archivada o borrada que no es mía, cuando intento abrir su detalle (por ejemplo, desde mis favoritas), entonces veo "Esta ruta ya no está disponible".

### Favoritas

- **CA-15 (HU-4):** Dado el detalle de una ruta publicada, cuando toco "Guardar en favoritas", entonces queda guardada en mi cuenta y el botón cambia a "Quitar de favoritas". Al tocarlo de nuevo, se quita.
- **CA-16 (HU-4):** Guardar varias veces la misma ruta no la duplica, y quitar una que ya no está en favoritas no da error.
- **CA-17 (HU-4):** Mis favoritas se guardan en mi cuenta: si inicio sesión en otro teléfono, las veo ahí.
- **CA-18 (HU-5):** Cuando toco "Mis favoritas" en la pantalla principal, entonces veo mis rutas guardadas con nombre, tipo, distancia y elevación ganada, la más reciente primero, y al tocar una se abre su detalle. Sin favoritas veo un mensaje que explica cómo guardarlas.
- **CA-19 (HU-5):** Dada una favorita cuya ruta se archivó o se borró, en "Mis favoritas" sigue en la lista con la marca "Ya no disponible". Al tocarla veo el mensaje de CA-14, y puedo quitarla de mis favoritas.
- **CA-20 (HU-5):** Las favoritas de un usuario solo las ve ese usuario.

### Mis rutas publicadas

- **CA-21 (HU-6):** Cuando toco "Mis rutas" en la pantalla principal, entonces veo las rutas que publiqué con nombre, tipo, distancia, fecha de publicación y su estado ("Publicada" o "Archivada"), la más reciente primero. Al tocar una se abre su detalle. Sin rutas veo un mensaje que explica cómo publicar una.
- **CA-22 (HU-6):** Dada una ruta mía, cuando la edito, entonces puedo cambiar su nombre, su descripción y su zona, con las mismas validaciones que al publicar (CA-5). El tipo, la dificultad, la distancia, la elevación y el recorrido no se pueden editar (RN-1). Los cambios se ven en el catálogo y en el detalle para todos.
- **CA-23 (HU-6):** Dada una ruta mía publicada, cuando la archivo, entonces deja de aparecer en "Explorar rutas" para todos y queda como "Archivada" en "Mis rutas". En las favoritas de los demás queda como "Ya no disponible" (CA-19).
- **CA-24 (HU-6):** Dada una ruta mía archivada, cuando toco "Volver a publicar", entonces vuelve a aparecer en "Explorar rutas" con los mismos datos y queda como "Publicada" en "Mis rutas". En las favoritas de los demás vuelve a estar disponible.
- **CA-25 (HU-6):** Dada una ruta mía, cuando elijo borrarla, entonces la app me pide confirmar. Al confirmar, la ruta desaparece del catálogo y de "Mis rutas", y en las favoritas de los demás queda como "Ya no disponible" (CA-19). La actividad de la que salió sigue en mi historial y se puede volver a publicar (CA-8).
- **CA-26 (HU-6):** Solo quien publicó una ruta puede editarla, archivarla o borrarla. El servidor rechaza esas acciones si vienen de otra cuenta. Las rutas de ejemplo de SendaBC no las puede cambiar ningún usuario.

### Acceso

- **CA-27 (HU-1, HU-3, HU-4, HU-6):** Publicar, ver el detalle, usar favoritas y administrar mis rutas requieren sesión iniciada, igual que el resto de la app.

## Reglas de negocio y validaciones

- RN-1: Una ruta publicada conserva el tipo, la distancia, la elevación ganada y el recorrido de la actividad de la que sale. El catálogo no los recalcula (spec 006, RN-3).
- RN-2: Una actividad tiene como máximo una ruta a la vez, publicada o archivada. Si esa ruta se borra, la actividad se puede publicar de nuevo.
- RN-3: La distancia y la elevación se muestran con el mismo formato que en el resumen de actividad (spec 004, RN-1).
- RN-4: El nombre es obligatorio, sin contar los espacios del principio y del final, y tiene como máximo 40 caracteres. La descripción es opcional y tiene como máximo 200 caracteres.
- RN-5: Solo se puede publicar una actividad de al menos 1.5 km.
- RN-6: La dificultad la calcula la app a partir de la distancia y la elevación ganada de la ruta, con la misma regla para todas las rutas, incluidas las de ejemplo. Quien publica no la elige. La ruta queda en el nivel más alto que alcance por distancia o por elevación:

  | Dificultad | Senderismo y trail running | Ciclismo |
  |---|---|---|
  | Fácil | hasta 8 km y hasta 300 m | hasta 15 km y hasta 400 m |
  | Moderada | hasta 15 km y hasta 700 m | hasta 35 km y hasta 900 m |
  | Difícil | hasta 30 km y hasta 1 500 m | hasta 75 km y hasta 1 800 m |
  | Extrema | más de 30 km o más de 1 500 m | más de 75 km o más de 1 800 m |

  Ejemplos: 12 km con 200 m de senderismo es Moderada (por la distancia); 6 km con 900 m de trail running es Difícil (por la elevación); 35 km con 500 m de ciclismo es Moderada.
- RN-7: La zona es opcional y tiene como máximo 40 caracteres. La app la propone según dónde empieza el recorrido; si no puede deducirla, el campo queda vacío.
- RN-8: Todas las rutas tienen perfil de elevación: las publicadas desde una actividad, con la altitud que el GPS registró en cada punto (las lecturas del barómetro se quedan en el teléfono, spec 005, CA-8), y las de ejemplo, con las altitudes de su traza original.
- RN-9: Las rutas de ejemplo de SendaBC se pueden ver a detalle y guardar en favoritas igual que cualquier otra ruta.

## Requisitos no funcionales

- **Offline-first:** publicar, ver el detalle, cambiar favoritas y administrar mis rutas necesitan conexión. Grabar actividades sigue funcionando sin conexión (constitución 2.1).
- **Privacidad:** el recorrido se publica completo, incluidos su inicio y su final, y el formulario lo avisa (CA-4). La publicación no muestra el correo del autor, solo su nombre.
- **Datos móviles:** el recorrido completo y el perfil de elevación se descargan solo al abrir el detalle, no en el mapa del catálogo (spec 006).
- **Rendimiento:** con conexión normal, el detalle de una ruta de 3 horas se muestra en menos de 2 segundos.

## Fuera de alcance

- Mostrar el detalle o las favoritas sin conexión, y mapas sin conexión → **009-estabilidad**.
- Recortar el inicio y el final del recorrido por privacidad → no está en el roadmap (decisión P6: se publica completo).
- Avisos o notificaciones sobre rutas (por ejemplo, cuando alguien guarda una ruta mía) → no está en el roadmap.
- Comentarios, calificaciones y fotos de rutas → no está en el roadmap.
- Navegación guiada o seguir una ruta en vivo → no está en el roadmap.
- Moderación o denuncia de rutas publicadas por otros → no está en el roadmap.
- Una lista de rutas cercanas además del mapa y buscar por nombre o región (spec 006) → no está en el roadmap.
- Compartir una ruta fuera de la app (enlace o redes sociales) → no está en el roadmap.

## Preguntas abiertas

Resueltas el 2026-10-20:

- [x] **P1 — Dificultad:** la **calcula la app** (RN-6, CA-4).
- [x] **P2 — Publicar dos veces:** una actividad se publica **solo una vez** (RN-2, CA-8).
- [x] **P3 — Largo de los textos:** nombre, **máximo 40**; descripción, **máximo 200** (RN-4, CA-5).
- [x] **P4 — Editar, archivar o borrar:** quien publica **puede editar, archivar y borrar**; en las favoritas de los demás queda como **"Ya no disponible"** (CA-19, CA-22 a CA-25).
- [x] **P5 — Perfil de las rutas de ejemplo:** **sí deben tener perfil de elevación** (RN-8, CA-11).
- [x] **P6 — Privacidad del inicio y el final:** se publica **completo** (requisitos no funcionales, CA-4).
- [x] **P7 — Mínimo para publicar:** **1.5 km** (RN-5, CA-1, CA-3).
- [x] **P8 — Dónde se entra:** por ahora, **botones en la pantalla principal** (CA-18, CA-21).
- [x] **P9 — Zona:** **la deduce la app y se puede cambiar** (RN-7, CA-4).

Resueltas el 2026-10-20 (segunda ronda):

- [x] **P10 — Volver a publicar una archivada:** **sí** (CA-24).
- [x] **P11 — Publicar de nuevo tras borrar:** **sí**; una actividad tiene como máximo una ruta a la vez (RN-2, CA-8, CA-25).
- [x] **P12 — Regla de dificultad:** la tabla propuesta se acepta para senderismo y trail running; el ciclismo lleva umbrales propios (RN-6).

- [x] **P13 — Umbrales de ciclismo:** los propuestos con **5 km menos** de distancia en cada nivel: 15, 35 y 75 km; la elevación queda igual (RN-6).

No quedan preguntas abiertas.

## Historial

- 2026-10-21 — Implementada: los 27 CA verificados con pruebas automáticas (backend, e2e y frontend) y los casos manuales M1–M8 en el emulador.
- 2026-10-20 — En progreso: T1 (migración `20261020000000_routes_publish`) aplicada.
- 2026-10-20 — Corrección al escribir el plan: RN-8 decía que el perfil usa la altitud del barómetro o del GPS, pero en el servidor solo existe la del GPS de cada punto (spec 005, CA-8). El perfil usa esa.
- 2026-10-20 — Aprobada por el usuario.
- 2026-10-20 — Se resuelve P13: los umbrales de ciclismo bajan 5 km en cada nivel (15, 35 y 75 km). Sin preguntas abiertas; la spec queda lista para aprobación.
- 2026-10-20 — Se resuelven P10–P12: una ruta archivada se puede volver a publicar (CA-24), una actividad con su ruta borrada se puede publicar de nuevo (RN-2) y la regla de dificultad queda en RN-6, con umbrales propios para ciclismo pendientes de confirmar (P13). Se renumeran CA-24 a CA-27.
- 2026-10-20 — Se resuelven P1–P9: dificultad calculada, una publicación por actividad, nombre de 40 y descripción de 200 caracteres, editar, archivar y borrar con "Ya no disponible" en favoritas, perfil de elevación también en las rutas de ejemplo, recorrido completo con aviso, mínimo de 1.5 km, botones en la pantalla principal y zona deducida y editable. Surgen P10–P12.
- 2026-10-20 — Creación.
