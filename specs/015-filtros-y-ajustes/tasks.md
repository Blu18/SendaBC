# 015 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de `frontend/lib/` sin imports de React Native incluyen sus pruebas Vitest (constitución 6.1).

**T2 detiene el trabajo:** nada visual (T8 a T16) se programa antes de que el usuario apruebe el diseño en Figma (CA-22). Mientras tanto pueden avanzar la lógica pura, la base local y el estado (T3 a T7).

## Antes de empezar

- Hecho (2026-11-22): la rama `015-filtros-y-ajustes` sale del final de `014-resumen-bitacora`, que todavía no está fusionada en `master`. Al fusionar la 014, esta rama solo agrega lo de la 015.
- Tener la sesión de Figma conectada al MCP.

## Fase A — Figma

- [x] T1 — En "SendaBC — Diseño", página Pantallas, crear la sección "Filtros y ajustes (spec 015)", en claro y oscuro (plan, Fase A):
  - **Mis actividades:**
    - sin filtros y con el botón fijo;
    - con filtros activos (chips y "Quitar filtros");
    - el panel de filtros;
    - sin resultados;
    - la lista vacía con el texto nuevo (D8);
    - con letra grande.
  - **Explorar y detalle de ruta:** en 3D y en 2D, con el botón de vista, y los chips con su sombra completa.
  - **Inicio:** con la tarjeta de "Últimos 7 días".

  Agregar al Sistema de diseño "Control deslizante de rango" y "Panel de filtros". Usar los textos y formatos de la app. Revisar el contraste de los pares de color nuevos en la tabla de Figma. (CA-22)

  Hecho (2026-11-22): sección [Filtros y ajustes (spec 015)](https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX?node-id=99-6901) de la página Pantallas. Son 11 marcos por modo (22 en total):
  - **Mis actividades:** sin filtros, con filtros, panel de filtros, sin resultados, vacía, y el panel con letra grande.
  - **Explorar rutas:** en 3D y en 2D.
  - **Detalle de ruta:** en 3D y en 2D.
  - **Inicio:** con la tarjeta de la semana.

  En el Sistema de diseño, la sección "Filtros y ajustes (spec 015)" tiene cinco componentes:
  - `Icono/filter-variant`;
  - `Control deslizante de rango`, con las variantes "Con rango" y "Sin filtro";
  - `Chip de filtro activo`;
  - `Filtro de rango`;
  - `Panel de filtros`.

  Decisiones de diseño, pendientes de aprobación:
  - **Botón "Filtros":** en el encabezado de Mis actividades, con un contador de filtros activos. No aparece en la lista vacía.
  - **Fila de filtros activos:** debajo del encabezado. Cada chip lleva una "×" para quitar ese filtro, y la fila termina en "Quitar filtros" (botón de texto).
  - **Panel:** tipo de actividad (chips que bajan de renglón), mes (chips que se deslizan de lado), distancia y altura más alta. Abajo, "Quitar filtros" y "Ver N actividades" lado a lado; con letra grande van uno debajo del otro, primero "Ver N actividades".
  - **Filtro sin elegir:** un control deslizante en sus límites dice "Cualquiera" (RN-8).
  - **Sin resultados:** aviso "Ninguna actividad coincide" / "Prueba con otros filtros o quítalos para ver todas tus actividades." y el botón "Quitar filtros".
  - **Lista vacía:** "Toca "Empezar actividad" para grabar la primera.", como en Inicio (D8).
  - **Botón de vista:** dice la vista a la que se cambia, como en la grabación. En Explorar va arriba del botón de centrar; en el detalle, en la esquina del mapa.
  - **Chips de Explorar:** cada uno con su sombra media, sin recorte (en el Figma anterior, las filas también recortaban).

  Notas:
  - El 3D usa la ilustración del relieve de "Mapa de grabación", sin la posición ni el rumbo. El 2D en oscuro sigue con el mapa claro, porque "Mapa (referencia)" no tiene variante oscura, como en Rutas.
  - No hay pares de color nuevos: los chips y el contador usan `onPrimary / primary`, el valor del rango `primary / surface`, el riel `border / surface` y la tarjeta de la semana los de texto sobre `surface`. Todos están ya en `CONTRAST_PAIRS` y en la tabla de Figma.
  - Para la letra grande, los componentes del marco se desligaron y el texto se agrandó al 130 %. Es una ilustración: el resto de la app no cambia.
- [x] T2 — Compartir el enlace y las capturas, y anotar en el historial de la spec la aprobación del usuario o los cambios que pida. **Detiene T8 a T16.** (CA-22)

  Hecho (2026-11-22): el usuario aprobó el diseño de T1 sin cambios. Ya se pueden programar T8 a T16.

## Fase B — Lógica pura y base local

- [ ] T3 — `lib/activity/filters.ts`: `ActivityFilters`, `filterActivities`, `filterLimits`, `normalizeRange`, `availableMonths`, `activeFilterLabels` y `activeFilterCount` (plan, "Hooks / estado"). Pruebas en `filters.test.ts`:
  - **Uno por uno:** por tipo; por mes en hora local, con una actividad a las 23:30 del último día; por distancia y por cumbre con los extremos incluidos.
  - **Sin dato:** una actividad sin distancia o sin cumbre queda fuera solo con su filtro activo.
  - **Combinados:** varios filtros a la vez, y ningún resultado.
  - **Límites:** redondeados al paso, y un rango en los límites pasa a `null` (RN-8).
  - **Meses:** los disponibles, en orden y con año si no es el actual.
  - **Totales:** `groupByMonth` sobre las filtradas cuenta solo esas.
  - **Etiquetas:** los textos de los chips con los formatos de la spec 004.

  Las pruebas deben pasar con `TZ=UTC` y `TZ=America/Tijuana`. (CA-2, CA-3, CA-4, CA-5, CA-6, CA-9, RN-3, RN-4, RN-8)
- [ ] T4 — SQLite v7 en `lib/db/schema.ts`: `peak_altitude_meters` y `peak_calculated`. En `lib/db/activities.ts`:
  - `peakAltitudeMeters` en `Activity` y en `ACTIVITY_COLUMNS`;
  - `savePeak` y `listActivityIdsMissingPeak`.

  Prueba de la migración desde la v6 con el patrón de `pasosPendientes`, y pruebas de `savePeak` y `listActivityIdsMissingPeak` en `activities.test.ts`. (CA-5, RN-5)
- [ ] T5 — `lib/db/activityMetrics.ts`:
  - **`finalizeMetrics`:** también guarda la cumbre de `activityProfile`, o `null` sin perfil.
  - **`computeMissingPeaks()` (nuevo):** sigue con las demás si una falla.
  - **Llamadas:** en `App.tsx`, después de `computeMissingMetrics`. En la sincronización, después de recuperar actividades y antes de avisar que cambiaron los datos.

  Pruebas, con los mismos dobles que `activities.test.ts`:
  - la cumbre guardada es la `cumbre.altitudM` del perfil;
  - una actividad de menos de 200 m queda con `null` y `peak_calculated = 1`.

  (CA-5, RN-5)
- [ ] T6 — Mapa:
  - `lib/map/viewMode.ts`: `siguienteVista` recibe si se permite "Sin mapa". Pruebas en `viewMode.test.ts`: los mapas de rutas alternan 3D y 2D aunque la prueba de batería esté activa.
  - `TERRAIN_EXAGGERATION` pasa de `RecordingMap` a `lib/map/camera.ts`.

  La grabación no cambia. (CA-12, CA-13)
- [ ] T7 — `context/ActivityFiltersContext.tsx` en `App.tsx`, que se vacía al cerrar sesión. En `activityHistory.hook.ts`, agregar `filtered`, `limits` y `months`; `sections` ahora agrupa las filtradas. `tsc` sin errores; la verificación es manual (M2 y M3). (CA-6, CA-9, CA-10)

## Fase C — Interfaz (después de T2)

- [ ] T8 — `components/ui/RangeSlider.tsx` (D4):
  - dos extremos con `PanResponder` que no se cruzan, con paso y los valores visibles;
  - cada extremo `adjustable` con su valor y `increment` y `decrement`;
  - área táctil mínima;
  - no suelta el gesto mientras se arrastra.

  Según el componente aprobado en Figma. (CA-4, CA-5, CA-17)
- [ ] T9 — `components/activity/ActivityFiltersSheet.tsx`: `Modal` desde abajo con tipo, mes, distancia y altura, "Quitar filtros" y "Ver N actividades". Los cambios se aplican al momento. (CA-1, CA-2, CA-3, CA-4, CA-5, CA-7)
- [ ] T10 — `activityHistoryPage.tsx`:
  - el botón "Filtros" en el encabezado, con el número de filtros activos;
  - la fila de chips de filtros activos con "Quitar filtros";
  - la lista con `sections` filtradas;
  - el `Notice` de sin resultados con "Quitar filtros".

  (CA-1, CA-7, CA-8, CA-9)
- [ ] T11 — `activityHistoryPage.tsx`: `BottomBar` con "Empezar actividad", que navega a `Activity` como en `mainPage`. Cambiar el texto de la lista vacía (D8) y el comentario que decía que no había botón. Comprobar que "Listo" regresa a Mis actividades sin cambiar el resumen. (CA-19, CA-20, RN-6)
- [ ] T12 — `RouteMap.tsx`: props `view` y `onViewChange`. En 3D:
  - `RasterDemSource`, `Terrain` y sombreado;
  - la cámara con `PITCH_3D`;
  - el encuadre con `setCamera` (`bounds`, `padding` y `pitch`).

  Con el estilo local, sin 3D. (CA-12, CA-14, CA-16)
- [ ] T13 — `exploreRoutesPage.tsx` y `routeDetailPage.tsx`: estado `view` que empieza en `'3D'`, y `MapViewToggle` donde diga Figma. El nombre accesible del botón dice la vista actual y a cuál cambia. (CA-12, CA-13, CA-15, CA-17, RN-7)
- [ ] T14 — Chips de Explorar: espacio para la sombra `medium` dentro de cada `ScrollView` y margen negativo para que no se muevan (D7). (CA-18)
- [ ] T15 — `WeekSummary` dentro de `Card` en `mainPage` (D9). Si Figma usa un par de color nuevo, agregarlo a `CONTRAST_PAIRS`. (CA-21)
- [ ] T16 — Revisar el contraste de los pares de color nuevos de T8 a T15 en `CONTRAST_PAIRS` y en la tabla de Figma, para que `contrast.test.ts` siga pasando. (CA-21, CA-23)

## Cierre

- [ ] T17 — Emulador:
  - compilar el APK de desarrollo x86_64 desde `C:\dev\sbc`;
  - recuperar en el emulador la cuenta de prueba de la 014, con sus 200 actividades;
  - correr M1 a M6 y M8 a M12, y anotar los resultados abajo.

  Si la imagen no tiene TalkBack, esa parte de M8 pasa al S9+.
- [ ] T18 — S9+: M7 y M13 (relieve real y tiempos), con Metro y el APK de desarrollo arm64 que ya tiene. Si algún tiempo no cumple, se anota y se propone el ajuste antes de cambiar el código (plan, "Riesgos").
- [ ] T19 — Cerrar la spec: estado, historial y `specs/roadmap.md`.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | M1 | Manual (emulador) | Pendiente |
| CA-2 | `filters.test.ts` › tipo; M1 | Automatizada + manual | Pendiente |
| CA-3 | `filters.test.ts` › mes en hora local y meses disponibles; M1 | Automatizada + manual | Pendiente |
| CA-4 | `filters.test.ts` › distancia, extremos y sin distancia; M1 | Automatizada + manual | Pendiente |
| CA-5 | `filters.test.ts` › cumbre; `activities.test.ts` y pruebas de `computeMissingPeaks` › cumbre guardada; M1 | Automatizada + manual | Pendiente |
| CA-6 | `filters.test.ts` › combinados; M2 | Automatizada + manual | Pendiente |
| CA-7 | M2 | Manual (emulador) | Pendiente |
| CA-8 | `filters.test.ts` › sin resultados; M2 | Automatizada + manual | Pendiente |
| CA-9 | `filters.test.ts` › totales de las filtradas; M2 | Automatizada + manual | Pendiente |
| CA-10 | M3 | Manual (emulador) | Pendiente |
| CA-11 | M4 | Manual (emulador) | Pendiente |
| CA-12 | `viewMode.test.ts`; M5 | Automatizada + manual | Pendiente |
| CA-13 | M5 | Manual (emulador) | Pendiente |
| CA-14 | M7 | Manual (S9+) | Pendiente |
| CA-15 | M5 | Manual (emulador) | Pendiente |
| CA-16 | M6 | Manual (emulador) | Pendiente |
| CA-17 | M8 | Manual (emulador o S9+) | Pendiente |
| CA-18 | M9 | Manual (emulador) | Pendiente |
| CA-19 | M10 | Manual (emulador) | Pendiente |
| CA-20 | M10 | Manual (emulador) | Pendiente |
| CA-21 | M11; `contrast.test.ts` | Automatizada + manual | Pendiente |
| CA-22 | T2: aprobación anotada en el historial de la spec | Manual | Cumplido (2026-11-22) |
| CA-23 | M12; `contrast.test.ts` | Automatizada + manual | Pendiente |

Los 23 CA de la spec están cubiertos por al menos una tarea y una forma de verificarse. Los requisitos no funcionales se verifican en M8 (accesibilidad), M4 (offline) y M7 y M13 (3D y tiempos).

### Casos manuales

Salvo que se indique otra cosa: emulador `Pixel_8_Pro` con el APK de desarrollo x86_64, Metro y el backend local, con la cuenta de prueba de la 014 (200 actividades de tres tipos en 15 meses) ya recuperada.

**M1 — Cada filtro por separado**
1. Abrir la pestaña Actividades y el panel de filtros.
2. Elegir "Ciclismo", luego quitarlo.
3. Elegir un mes del año anterior, luego quitarlo.
4. Mover el control de distancia a 10–20 km, luego regresarlo a sus límites.
5. Mover el control de altura más alta a 800–1200 m. Abrir el resumen de dos actividades de la lista.
- **Esperado:** (1) el panel tiene tipo, mes, distancia y altura más alta. Sin filtros, la lista es la de la 014. (2) Solo salidas en bici. (3) Solo actividades de ese mes, y solo se ofrecen meses con actividades. (4) Solo actividades de 10 a 20 km, y los dos valores se ven; en los límites, vuelven todas. (5) La cumbre de cada resumen abierto está entre 800 y 1200 m.

**M2 — Filtros combinados y sin resultados**
1. Elegir "Senderismo" y distancia 5–10 km.
2. Revisar la fila de filtros activos y los encabezados de mes. Sumar a mano un mes.
3. Agregar un mes que no tenga caminatas de esa distancia.
4. Tocar "Quitar filtros".
- **Esperado:** (1) solo caminatas de 5 a 10 km. (2) La fila muestra los dos filtros, y el botón "Filtros" dice 2. Cada encabezado cuenta y suma solo las actividades mostradas, y coincide con la suma a mano. (3) Aparece el mensaje de que ninguna coincide, con "Quitar filtros", distinto del de lista vacía. (4) La lista vuelve completa con una sola acción.

**M3 — Los filtros duran lo que la app abierta**
1. Elegir "Carrera". Ir a Inicio y volver a Actividades.
2. Abrir el resumen de una actividad y volver.
3. Cerrar la app desde recientes y abrirla de nuevo.
4. Elegir un filtro, cerrar sesión y entrar con otra cuenta.
- **Esperado:** (1 y 2) el filtro sigue. (3) La lista empieza sin filtros. (4) La otra cuenta empieza sin filtros.

**M4 — Filtros sin conexión**
1. Poner el emulador en modo avión (`adb shell cmd connectivity airplane-mode enable`).
2. Filtrar por tipo, mes, distancia y altura.
- **Esperado:** los filtros funcionan igual que en M1, sin errores ni avisos.

**M5 — Mapa 2D y 3D en Explorar y el detalle**
1. Abrir Explorar.
2. Tocar el botón de vista; tocarlo otra vez.
3. En 3D: cambiar el filtro de tipo, mover el mapa, "Buscar en esta zona", centrar en mi ubicación (con posiciones simuladas) y tocar una ruta.
4. Con una ruta seleccionada en 3D, cambiar a 2D.
5. Abrir el detalle de la ruta y repetir el paso 2. Salir y volver a entrar a Explorar.
- **Esperado:** (1) el mapa empieza en 3D, inclinado, con las rutas encuadradas. (2) Cambia a 2D y vuelve a 3D en la misma zona, con las mismas rutas. (3) Todo funciona igual que en 2D. (4) La ruta sigue seleccionada, con su tarjeta, y los filtros no cambian. (5) El detalle empieza en 3D y alterna igual. Al volver a entrar, Explorar empieza en 3D otra vez.

**M6 — 3D sin conexión**
1. Con modo avión, abrir Explorar y el detalle de una ruta guardada.
2. Alternar entre 2D y 3D.
- **Esperado:** la app no falla. El mapa se comporta como la grabación sin conexión (spec 010): rutas dibujadas sobre el fondo que haya, sin relieve si no hay datos de terreno, y el aviso de mapa no disponible si aplica.

**M7 — Relieve real y tiempos del 3D (S9+)**
1. Abrir Explorar cerca de la sierra de Ensenada con conexión.
2. Medir, en tres aperturas, el tiempo hasta ver las rutas encuadradas, en 3D. Cambiar a 2D, salir y medir en 2D (adb y capturas, como 014 M7).
3. Abrir el detalle de una ruta con subida.
- **Esperado:** (1 y 3) en 3D, montañas y cañones con su relieve, como al grabar. La ruta se dibuja sobre el relieve, sin quedar oculta. (2) Abrir en 3D no tarda visiblemente más que en 2D. Si la diferencia se nota, se anota (plan, "Riesgos").

**M8 — Lector de pantalla y letra grande**
1. Con TalkBack, recorrer el panel de filtros y ajustar cada extremo de distancia y altura sin arrastrar.
2. Recorrer la fila de filtros activos, el botón fijo y el botón de vista del mapa.
3. Poner la letra al máximo, abrir la app de nuevo y revisar Mis actividades, el panel y Explorar.
- **Esperado:** (1) cada extremo se anuncia con su valor ("Distancia mínima, 5 km") y sube o baja un paso con los gestos de ajuste. Cada chip anuncia si está seleccionado. (2) Los chips activos se anuncian con su valor, y el botón de vista con la vista actual y a cuál cambia. (3) Ningún texto se corta ni se encima, y las áreas táctiles no se achican.

**M9 — Sombra de los chips de Explorar**
1. En claro y en oscuro, abrir Explorar y mirar las filas de tipo y de radio.
2. Deslizar cada fila de lado.
3. Tocar el mapa justo debajo de los chips.
- **Esperado:** (1 y 2) cada chip tiene su sombra completa alrededor, sin una línea recta horizontal que la corte. (3) El mapa responde al toque (plan, "Riesgos").

**M10 — Empezar desde Mis actividades**
1. Abrir la pestaña Actividades y desplazarse hasta el final.
2. Tocar "Empezar actividad", grabar unos segundos con posiciones simuladas y detener.
3. En el resumen, tocar "Listo". Tocar atrás.
4. Repetir el paso 2 desde Inicio y tocar "Listo".
5. Con una cuenta sin actividades, abrir la pestaña.
- **Esperado:** (1) el botón queda fijo abajo y la última fila se ve completa sobre él. (2) La grabación empieza como desde Inicio. (3) "Listo" regresa a Mis actividades, con la actividad nueva arriba. Atrás no vuelve al resumen ni a la grabación. (4) Desde Inicio, "Listo" regresa a Inicio, como antes. (5) La lista vacía tiene el texto nuevo y el botón.

**M11 — Tarjeta de las métricas de Inicio**
1. En claro y en oscuro, abrir Inicio con actividades en la semana y sin ellas.
- **Esperado:** "Últimos 7 días" va en una tarjeta con sombra baja, como las demás, y sus textos se leen bien en los dos modos.

**M12 — Comparación con Figma**
1. En claro, comparar con la sección "Filtros y ajustes (spec 015)" de Figma: Mis actividades (sin y con filtros, panel, sin resultados, vacía), Explorar y el detalle en 3D y 2D, e Inicio.
2. Repetir en oscuro.
- **Esperado:** cada pantalla coincide con el diseño aprobado en los dos modos.

**M13 — Tiempos con 200 actividades (S9+)**
1. Instalar con Metro el código de la 015 sobre la app que ya tiene las 200 actividades, abrirla y medir cuánto tarda `computeMissingPeaks` (log de Metro).
2. Cerrar y abrir la app, tocar Actividades y medir hasta ver la lista.
3. Aplicar y quitar filtros, y mover los controles deslizantes.
- **Esperado:** (1) se anota el tiempo, y la app se puede usar mientras corre. (2) La lista aparece como en 014 M7. En el build de desarrollo se anota el tiempo; el límite de 1 s se mide con el de entrega en la 012. (3) La lista se actualiza sin pausas visibles.

## Commits propuestos

Mínimo 3 en la semana (constitución 8.3):

1. `docs(015): spec, plan y tareas de filtros y ajustes`: spec, plan, tareas, roadmap y el cambio de la spec 004.
2. `docs(015): diseño de filtros y ajustes en Figma`: T1 y T2.
3. `feat(015): filtros de actividades y cumbre en la base local`: T3 a T5 y T7, con sus pruebas.
4. `feat(015): filtros en Mis actividades y botón para empezar`: T8 a T11.
5. `feat(015): mapa 2D y 3D en rutas`: T6, T12 y T13.
6. `fix(015): sombra de los chips y tarjeta de la semana`: T14 a T16.
7. `test(015)` o `fix(015)` según M1 a M13 (T17 y T18), y `docs(015): cierre de la spec` (T19).

## Resultado de los casos manuales

Sin correr todavía.

## Pendientes conocidos

Ninguno por ahora.
