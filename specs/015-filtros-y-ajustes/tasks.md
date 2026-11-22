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

- [x] T3 — `lib/activity/filters.ts`: `ActivityFilters`, `filterActivities`, `filterLimits`, `normalizeRange`, `availableMonths`, `activeFilterLabels` y `activeFilterCount` (plan, "Hooks / estado"). Pruebas en `filters.test.ts`:
  - **Uno por uno:** por tipo; por mes en hora local, con una actividad a las 23:30 del último día; por distancia y por cumbre con los extremos incluidos.
  - **Sin dato:** una actividad sin distancia o sin cumbre queda fuera solo con su filtro activo.
  - **Combinados:** varios filtros a la vez, y ningún resultado.
  - **Límites:** redondeados al paso, y un rango en los límites pasa a `null` (RN-8).
  - **Meses:** los disponibles, en orden y con año si no es el actual.
  - **Totales:** `groupByMonth` sobre las filtradas cuenta solo esas.
  - **Etiquetas:** los textos de los chips con los formatos de la spec 004.

  Las pruebas deben pasar con `TZ=UTC` y `TZ=America/Tijuana`. (CA-2, CA-3, CA-4, CA-5, CA-6, CA-9, RN-3, RN-4, RN-8)

  Hecho (2026-11-22):
  - **`FilterableActivity`:** `filters.ts` trabaja con lo que necesita de una actividad, más `peakAltitudeMeters`, así no depende de que T4 agregue el campo a `Activity`.
  - **Funciones nuevas,** además de las del plan:
    - `NO_FILTERS`;
    - `normalizeFilters`, que ajusta los dos rangos a la vez;
    - los textos `formatFilterDistance`, `formatFilterAltitude`, `distanceRangeText` y `peakRangeText`, con "Cualquiera" sin filtro, como en Figma.
  - **`months.ts`:** el título del mes pasó a `monthTitle`, que usan `groupByMonth` y los chips de mes.
  - **Spec:** RN-4 pedía los formatos de la 004 ("5.00 km"). El diseño aprobado usa "5 – 20 km", así que RN-4 se corrigió primero, con nota en el historial.

  Hay 19 pruebas en `filters.test.ts`. Pasan con la zona local, `UTC` y `America/Tijuana`. El frontend pasa 895 pruebas y `tsc` no marca errores.
- [x] T4 — SQLite v7 en `lib/db/schema.ts`: `peak_altitude_meters` y `peak_calculated`. En `lib/db/activities.ts`:
  - `peakAltitudeMeters` en `Activity` y en `ACTIVITY_COLUMNS`;
  - `savePeak` y `listActivityIdsMissingPeak`.

  Prueba de la migración desde la v6 con el patrón de `pasosPendientes`, y pruebas de `savePeak` y `listActivityIdsMissingPeak` en `activities.test.ts`. (CA-5, RN-5)

  Hecho (2026-11-22):
  - **`schema.ts`:** paso 7 con `peak_altitude_meters REAL` y `peak_calculated INTEGER NOT NULL DEFAULT 0`.
  - **`Activity`:** ahora tiene `peakAltitudeMeters`, que se lee en `ACTIVITY_COLUMNS`.
  - **`savePeak`:** guarda la cumbre, o `null`, y marca la cumbre como calculada. El estado y las métricas no cambian.
  - **`listActivityIdsMissingPeak`:** devuelve las actividades terminadas de cualquier cuenta con la cumbre por calcular, como `listActivityIdsMissingMetrics`.
  - **Servidor:** `toUploadPayload` arma la carga campo por campo, así que la cumbre no se sube.

  Pruebas:
  - `schema.test.ts`: la base llega a v7, y una actividad de la v6 queda con la cumbre en `null` y por calcular.
  - `activities.test.ts`: cuatro casos nuevos (terminada y en grabación, `savePeak` con valor y con `null`, y recuperada del servidor).
  - Las actividades armadas a mano en las pruebas de `payload` y `syncEngine`, y la prueba de recuperar, se actualizaron con el campo nuevo.

  El frontend pasa 900 pruebas y `tsc` no marca errores.
- [x] T5 — `lib/db/activityMetrics.ts`:
  - **`finalizeMetrics`:** también guarda la cumbre de `activityProfile`, o `null` sin perfil.
  - **`computeMissingPeaks()` (nuevo):** sigue con las demás si una falla.
  - **Llamadas:** en `App.tsx`, después de `computeMissingMetrics`. En la sincronización, después de recuperar actividades y antes de avisar que cambiaron los datos.

  Pruebas, con los mismos dobles que `activities.test.ts`:
  - la cumbre guardada es la `cumbre.altitudM` del perfil;
  - una actividad de menos de 200 m queda con `null` y `peak_calculated = 1`.

  (CA-5, RN-5)

  Hecho (2026-11-22):
  - **`peakOf`:** calcula `activityProfile` con los mismos puntos, lecturas y fuente que el resumen (`elevationSource ?? 'GPS'`), así la cifra es la misma.
  - **`finalizeMetrics`:** reutiliza los puntos que ya leyó para las métricas.
  - **`computePeak(localId)` (nueva):** calcula la cumbre de una sola actividad. `computeMissingPeaks` la usa.
  - **Al abrir la app:** `computeMissingPeaks` corre en `App.tsx` después de `setLocalDataReady(true)`, sin bloquear la pantalla. La lista toma las cumbres al recibir el foco. Si el usuario ya está en Mis actividades cuando termina, las ve al volver a la pestaña. Se mide en M13.
  - **En la sincronización:** `lib/sync/index.ts` pasa al motor `insertDownloadedWithPeak`, que guarda la actividad recuperada y calcula su cumbre antes de que el motor avise que cambiaron los datos. Si la cumbre falla, la actividad queda guardada con la cumbre pendiente para la siguiente apertura. El motor (`syncEngine.ts`) no cambió.

  Tres pruebas nuevas en `activityMetrics.test.ts`:
  - la cumbre guardada coincide con la del perfil del resumen;
  - menos de 200 m queda calculada y en `null`;
  - `computeMissingPeaks` calcula solo las pendientes y una sola vez, no cambia nada más y no toca la que se graba.

  El frontend pasa 903 pruebas y `tsc` no marca errores.
- [x] T6 — Mapa:
  - `lib/map/viewMode.ts`: `siguienteVista` recibe si se permite "Sin mapa". Pruebas en `viewMode.test.ts`: los mapas de rutas alternan 3D y 2D aunque la prueba de batería esté activa.
  - `TERRAIN_EXAGGERATION` pasa de `RecordingMap` a `lib/map/camera.ts`.

  La grabación no cambia. (CA-12, CA-13)

  Hecho (2026-11-22):
  - **`siguienteVista(view, allowNone)`:** el segundo parámetro ahora dice si se permite "Sin mapa".
  - **`MapViewToggle`:** recibe `allowNone`, que por defecto es `BATTERY_TEST`, así que la grabación queda igual. Explorar y el detalle pasarán `allowNone={false}` en T13.
  - **`TERRAIN_EXAGGERATION` (1.5):** está ahora en `lib/map/camera.ts` y `RecordingMap` la importa de ahí.
  - **Prueba nueva** en `viewMode.test.ts`: sin "Sin mapa" se alterna entre 3D y 2D.

  El frontend pasa 904 pruebas y `tsc` no marca errores.
- [x] T7 — `context/ActivityFiltersContext.tsx` en `App.tsx`, que se vacía al cerrar sesión. En `activityHistory.hook.ts`, agregar `filtered`, `limits` y `months`; `sections` ahora agrupa las filtradas. `tsc` sin errores; la verificación es manual (M2 y M3). (CA-6, CA-9, CA-10)

  Hecho (2026-11-22):
  - **`ActivityFiltersProvider`:** guarda los filtros en memoria y ofrece `setFilters` (con una función que recibe los actuales) y `clearFilters`. Se vacía cuando cambia `userId`, al cerrar sesión o al entrar otra cuenta.
  - **En `App.tsx`:** el proveedor va dentro de `SyncProvider` y alrededor de `Navigation`, así que los filtros siguen al cambiar de pestaña o al abrir un resumen.
  - **`useActivityHistory`:** además de `activities`, devuelve `filtered`, `sections` (que ahora agrupa las filtradas), `limits` y `months` (calculados con todas), y `filters`.
  - **`filters`:** son los elegidos ajustados a los límites actuales con `normalizeFilters`. Por eso un rango que quedó fuera, porque cambiaron las actividades, se corrige solo.

  `tsc` no marca errores y el frontend pasa 904 pruebas. Mis actividades todavía no muestra los filtros (T9 y T10).

## Fase C — Interfaz (después de T2)

- [x] T8 — `components/ui/RangeSlider.tsx` (D4):
  - dos extremos con `PanResponder` que no se cruzan, con paso y los valores visibles;
  - cada extremo `adjustable` con su valor y `increment` y `decrement`;
  - área táctil mínima;
  - no suelta el gesto mientras se arrastra.

  Según el componente aprobado en Figma. (CA-4, CA-5, CA-17)

  Hecho (2026-11-22):
  - **Lógica pura en `lib/ui/rangeSlider.ts`:** `fractionOf`, `valueAtFraction` (ajusta al paso y a los límites), `moveThumb` (los extremos no se cruzan ni salen) y `stepThumb` (un paso, para TalkBack). Tiene 6 pruebas en `rangeSlider.test.ts`.
  - **Componente:** riel `border` de 4 dp, rango en `primary` y perillas de 24 dp en `surface` con borde `primary` de 3 dp y sombra `low`, como el componente de Figma. Cada perilla tiene un área táctil de `touchMin`.
  - **Riel a todo el ancho:** como en Figma, el riel ocupa el ancho del bloque. Las áreas táctiles se salen media perilla por cada lado, y un margen negativo las deja dentro del contenedor, porque en Android un toque fuera del padre no llega.
  - **Arrastre:** cada perilla tiene su `PanResponder`, creado una vez, que lee los valores actuales por una referencia. `onPanResponderTerminationRequest` devuelve `false`, así que el panel no se desplaza mientras se arrastra.
  - **TalkBack:** cada perilla es `adjustable`, con su nombre ("Distancia mínima") y su valor como texto ("5 km"), y las acciones `increment` y `decrement`.

  `tsc` no marca errores y el frontend pasa 910 pruebas. Todavía no se ve en pantalla: lo usa el panel de T9, y se verifica en M1 y M8.
- [x] T9 — `components/activity/ActivityFiltersSheet.tsx`: `Modal` desde abajo con tipo, mes, distancia y altura, "Quitar filtros" y "Ver N actividades". Los cambios se aplican al momento. (CA-1, CA-2, CA-3, CA-4, CA-5, CA-7)

  Hecho (2026-11-22):
  - **Estructura:** `Modal` transparente que sube desde abajo, sin animación si el sistema reduce el movimiento. El fondo está oscurecido al 40 % y cerrarlo con atrás o tocando el fondo cierra el panel.
  - **Contenido**, en el orden de Figma:
    - el asa, "Filtros" como encabezado y el botón de cerrar;
    - tipo de actividad: chips "Todas" y los tres tipos, que bajan de renglón;
    - mes: "Todos" y los meses con actividades, que se deslizan de lado;
    - distancia y altura más alta, cada una con su rango elegido o "Cualquiera", el `RangeSlider` y sus límites.
  - **Sin datos:** sin límites (ninguna actividad tiene ese dato), ese filtro no aparece.
  - **Botones:** "Quitar filtros" y "Ver N actividades" lado a lado. Con `fontScale` de 1.3 o más, van uno debajo del otro, primero "Ver N actividades", como el marco de letra grande. "Ver 1 actividad" va en singular.
  - **Cambios al momento:** cada cambio pasa por `onChange`. Los rangos se guardan con `normalizeRange`, así que en los límites el filtro queda inactivo (RN-8).
  - **Altura máxima:** el panel mide hasta el 90 % de la pantalla y su contenido se desplaza; los botones quedan fijos abajo, sobre el área segura.

  **Ajuste a Figma:** el panel tenía un radio de 24 sin variable. Se enlazó a `Radio/lg` (16), igual que la hoja de "¿Estás bien?", porque la app no tiene un radio de 24. Se aplicó al componente y a los dos marcos de letra grande.

  `tsc` no marca errores y el frontend pasa 910 pruebas. Todavía no se abre desde ninguna pantalla (T10); se verifica en M1, M2 y M8.
- [x] T10 — `activityHistoryPage.tsx`:
  - el botón "Filtros" en el encabezado, con el número de filtros activos;
  - la fila de chips de filtros activos con "Quitar filtros";
  - la lista con `sections` filtradas;
  - el `Notice` de sin resultados con "Quitar filtros".

  (CA-1, CA-7, CA-8, CA-9)

  Hecho (2026-11-22):
  - **`FiltersButton` (nuevo):** el ícono `filter-variant` y, con filtros, un contador en `primary` en la esquina. El lector de pantalla oye "Filtros, 2 activos". No aparece si no hay actividades, como en Figma.
  - **`ActiveFilterChip` (nuevo):** el chip en `primary` con la "×". Tocarlo quita solo ese filtro ("Quitar filtro: Senderismo"). La fila de chips baja de renglón y termina en "Quitar filtros" (`TextBtn`).
  - **Lista:** usa las `sections` filtradas del hook (T7), así que los totales de cada mes cuentan solo las filtradas.
  - **Sin resultados:** con actividades pero sin coincidencias, aparece el `Notice` "Ninguna actividad coincide" con "Quitar filtros" (`BgBtn`), en lugar del aviso de lista vacía. La ayuda "Desliza hacia abajo para sincronizar." solo aparece si hay filas.
  - **Panel:** `ActivityFiltersSheet` se abre con el botón y recibe los filtros, los límites, los meses y el número de filtradas.
  - **Tokens:** el contador usaba un padding de 5 y un alto de línea de 18. La prueba de valores sueltos (009) no los permite, así que pasaron a `spacing.xs` y al alto de línea de `caption`.

  `tsc` no marca errores, el frontend pasa 910 pruebas y `expo export` para Android compila. El Metro del puerto 8082, abierto desde ayer, no veía los archivos nuevos ("Unable to resolve"): hay que reiniciarlo con `--clear` antes de probar en el teléfono. Se verifica en M1, M2, M3 y M8.
- [x] T11 — `activityHistoryPage.tsx`: `BottomBar` con "Empezar actividad", que navega a `Activity` como en `mainPage`. Cambiar el texto de la lista vacía (D8) y el comentario que decía que no había botón. Comprobar que "Listo" regresa a Mis actividades sin cambiar el resumen. (CA-19, CA-20, RN-6)

  Hecho (2026-11-22):
  - **Botón fijo:** `BottomBar` con fondo `background` y `PrimaryButton` "Empezar actividad", igual que en Inicio. Va fuera de la `FlatList`, entre la lista y la barra de pestañas, así que no se mueve ni tapa la última fila.
  - **Lista vacía:** el texto ahora es `Toca "Empezar actividad" para grabar la primera.` (D8, aprobado en Figma), y el comentario que justificaba no tener botón se cambió.
  - **"Listo", revisado en el código:** `activityPage` reemplaza la grabación por el resumen (`navigation.replace`) y "Listo" usa `goBack()`. Desde esta pestaña regresa a Mis actividades, y atrás no vuelve ni al resumen ni a la grabación. El resumen no cambió. `useFocusEffect` recarga la lista con la actividad nueva.

  `tsc` no marca errores, el frontend pasa 910 pruebas y `expo export` para Android compila. Se verifica en M10.
- [x] T12 — `RouteMap.tsx`: props `view` y `onViewChange`. En 3D:
  - `RasterDemSource`, `Terrain` y sombreado;
  - la cámara con `PITCH_3D`;
  - el encuadre con `setCamera` (`bounds`, `padding` y `pitch`).

  Con el estilo local, sin 3D. (CA-12, CA-14, CA-16)

  Hecho (2026-11-22):
  - **Solo la prop `view`** (`"3D"` o `"2D"`, por defecto `"2D"`), sin `onViewChange`: el botón y el estado son de la pantalla (T13), así que el mapa no necesita avisar.
  - **En 3D:**
    - `RasterDemSource` y `Terrain` con `TERRAIN_EXAGGERATION`, y el sombreado del estilo, igual que `RecordingMap`;
    - el relieve va antes de las capas de la pantalla, así que las rutas quedan encima y siguen el terreno;
    - con el estilo local (sin red y sin zona descargada, o si el estilo falla), `is3D` es falso y el mapa queda plano.
  - **Encuadre:** `fitBounds` pasó a `setCamera` con `bounds`, `padding` y `pitch` juntos. La inclinación se lee de una referencia, porque el handle se crea una vez. El primer encuadre (`defaultSettings`) también lleva la inclinación.
  - **Cambio de vista:** solo anima la inclinación. El centro y el acercamiento no cambian, así que la zona, las rutas y la selección se quedan (CA-12).

  `tsc` no marca errores, el frontend pasa 910 pruebas y `expo export` para Android compila. El encuadre con inclinación es un riesgo del plan: se revisa en M5 (emulador) y el relieve en M7 (S9+).
- [x] T13 — `exploreRoutesPage.tsx` y `routeDetailPage.tsx`: estado `view` que empieza en `'3D'`, y `MapViewToggle` donde diga Figma. El nombre accesible del botón dice la vista actual y a cuál cambia. (CA-12, CA-13, CA-15, CA-17, RN-7)

  Hecho (2026-11-22):
  - **Explorar:**
    - `view` empieza en `"3D"`. `ExploreRoutes` se monta otra vez en cada apertura (`key`), así que vuelve a 3D (CA-13).
    - A la derecha, el botón de vista y debajo "Centrar en mi ubicación", como en Figma.
    - La fila de acciones del mapa pasó de un botón centrar en posición absoluta a tres columnas: espacio, "Buscar en esta zona" al centro y la columna de la derecha. Así los dos botones quedan dentro de su contenedor, porque en Android un toque fuera del padre no llega.
    - La búsqueda, la selección y los filtros no cambiaron (RN-7).
  - **Detalle de ruta:** el mapa va dentro de una vista de 280 dp con el botón arriba a la derecha. Queda fuera del mapa accesible, para que TalkBack lo encuentre. También empieza en 3D en cada apertura.
  - **`MapViewToggle`:** las dos pantallas pasan `allowNone={false}`. El nombre accesible ahora dice la vista actual y a cuál cambia ("Mapa en 3D. Cambiar a 2D"), también en la grabación, donde antes decía "Cambiar el mapa a 2D". RN-8 de la spec 010 pide etiqueta de accesibilidad, así que la grabación sigue cumpliéndola.

  `tsc` no marca errores, el frontend pasa 910 pruebas y `expo export` para Android compila. Se verifica en M5, M6 y M8.
- [x] T14 — Chips de Explorar: espacio para la sombra `medium` dentro de cada `ScrollView` y margen negativo para que no se muevan (D7). (CA-18)

  Hecho (2026-11-22):
  - **Contenido de cada fila de chips:** ahora tiene `paddingTop` `sm` y `paddingBottom` `xxl` (32 dp; la sombra media llega a unos 28). Antes solo tenía `paddingBottom` `xs` (4 dp).
  - **Margen negativo de la fila:** `marginTop` `-sm` y `marginBottom` `xs - xxl`, así que los chips quedan en el mismo lugar que antes.
  - **El aire de arriba es `sm`,** igual que la separación entre filas, para que una fila no tape los toques de la de arriba.
  - **Riesgo del plan:** la franja transparente de 32 dp bajo la segunda fila puede tomar toques que eran para el mapa. La fila de acciones del mapa va después y queda encima, así que sus botones no se afectan. Se revisa en M9.

  `tsc` no marca errores y el frontend pasa 910 pruebas.
- [x] T15 — `WeekSummary` dentro de `Card` en `mainPage` (D9). Si Figma usa un par de color nuevo, agregarlo a `CONTRAST_PAIRS`. (CA-21)

  Hecho (2026-11-22):
  - **Tarjeta:** en `mainPage`, `WeekSummary` va dentro de `Card` sin `onPress`: fondo `surface`, radio `lg`, sombra `low` y relleno `lg`, como la "Tarjeta de la semana" de Figma. `WeekSummary` no cambió.
  - **Sin pares de color nuevos:** los textos usan `data`, `text` y `textMuted` sobre `surface`, que ya están en `CONTRAST_PAIRS`.

  `tsc` no marca errores, el frontend pasa 910 pruebas y `expo export` para Android compila. Se verifica en M11.
- [x] T16 — Revisar el contraste de los pares de color nuevos de T8 a T15 en `CONTRAST_PAIRS` y en la tabla de Figma, para que `contrast.test.ts` siga pasando. (CA-21, CA-23)

  Hecho (2026-11-22): se listaron los colores de cada archivo nuevo o cambiado en T8 a T15. No hay pares nuevos:

  | Elemento | Par | Mínimo |
  |---|---|---|
  | Riel del control deslizante | `border / surface` | 3:1 |
  | Rango, perillas y valor del rango | `primary / surface` | 4.5:1 |
  | Etiquetas y límites del panel | `text / surface` y `textMuted / surface` | 4.5:1 |
  | Chips de filtro activo y contador | `onPrimary / primary` | 4.5:1 |
  | "Quitar filtros" (botón de texto) | `primary / background` | 4.5:1 |
  | Aviso sin resultados | los pares del aviso Info | 4.5:1 |
  | Botón de vista | `text / surface` | 4.5:1 |
  | Tarjeta de la semana | `data / surface`, `text / surface` y `textMuted / surface` | 4.5:1 |

  Todos están en `CONTRAST_PAIRS` y en la tabla de Figma. El fondo oscurecido del panel (40 % del `text` claro) no lleva texto encima. `contrast.test.ts` y las demás pruebas del tema pasan (69).

## Cierre

- [x] T17 — Emulador:
  - compilar el APK de desarrollo x86_64 desde `C:\dev\sbc`;
  - recuperar en el emulador la cuenta de prueba de la 014, con sus 200 actividades;
  - correr M1 a M6 y M8 a M12, y anotar los resultados abajo.

  Si la imagen no tiene TalkBack, esa parte de M8 pasa al S9+.

  Hecho (2026-11-22), con tres correcciones y tres pasos pendientes (ver "Resultado de los casos manuales"):
  - **APK:** se compiló desde `C:\dev\SendaBC\frontend`, que también es una ruta corta. El APK arm64 del S9+ se guardó aparte antes, para T18.
- [ ] T18 — S9+: M7 y M13 (relieve real y tiempos), con Metro y el APK de desarrollo arm64 que ya tiene. Si algún tiempo no cumple, se anota y se propone el ajuste antes de cambiar el código (plan, "Riesgos").
- [ ] T19 — Cerrar la spec: estado, historial y `specs/roadmap.md`.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | M1 | Manual (emulador) | M1 aprobado (emulador, 2026-11-22) |
| CA-2 | `filters.test.ts` › tipo; M1 | Automatizada + manual | Vitest y manual cumplidos (2026-11-22) |
| CA-3 | `filters.test.ts` › mes en hora local y meses disponibles; M1 | Automatizada + manual | Vitest y manual cumplidos (2026-11-22) |
| CA-4 | `filters.test.ts` › distancia, extremos y sin distancia; M1 | Automatizada + manual | Vitest y manual cumplidos (2026-11-22) |
| CA-5 | `filters.test.ts` › cumbre; `activities.test.ts` y pruebas de `computeMissingPeaks` › cumbre guardada; M1 | Automatizada + manual | Vitest y manual cumplidos (2026-11-22) |
| CA-6 | `filters.test.ts` › combinados; M2 | Automatizada + manual | Vitest y manual cumplidos (2026-11-22) |
| CA-7 | M2 | Manual (emulador) | M2 aprobado (emulador, 2026-11-22) |
| CA-8 | `filters.test.ts` › sin resultados; M2 | Automatizada + manual | Vitest y manual cumplidos (2026-11-22) |
| CA-9 | `filters.test.ts` › totales de las filtradas; M2 | Automatizada + manual | Vitest y manual cumplidos (2026-11-22) |
| CA-10 | M3 | Manual (emulador) | M3 aprobado, salvo el paso 4 (cambio de cuenta) |
| CA-11 | M4 | Manual (emulador) | M4 aprobado (emulador, 2026-11-22) |
| CA-12 | `viewMode.test.ts`; M5 | Automatizada + manual | Vitest y manual cumplidos (2026-11-22) |
| CA-13 | M5 | Manual (emulador) | M5 aprobado (emulador, 2026-11-22) |
| CA-14 | M7 | Manual (S9+) | Relieve visto en el emulador (M5); falta M7 en el S9+ |
| CA-15 | M5 | Manual (emulador) | M5 aprobado (emulador, 2026-11-22) |
| CA-16 | M6 | Manual (emulador) | M6 aprobado (emulador, 2026-11-22) |
| CA-17 | M8 | Manual (emulador o S9+) | Nombres accesibles revisados; falta TalkBack encendido |
| CA-18 | M9 | Manual (emulador) | M9 aprobado tras la corrección (emulador, 2026-11-22) |
| CA-19 | M10 | Manual (emulador) | M10 aprobado (emulador, 2026-11-22) |
| CA-20 | M10 | Manual (emulador) | M10 aprobado (emulador, 2026-11-22) |
| CA-21 | M11; `contrast.test.ts` | Automatizada + manual | `contrast.test.ts` y M11 cumplidos (2026-11-22) |
| CA-22 | T2: aprobación anotada en el historial de la spec | Manual | Cumplido (2026-11-22) |
| CA-23 | M12; `contrast.test.ts` | Automatizada + manual | `contrast.test.ts` y M12 cumplidos (2026-11-22) |

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

**T17, emulador `Pixel_8_Pro` (2026-11-22), corrido por Claude por adb.** APK de desarrollo x86_64 y Metro en el 8082. Metro corre con `CI=1` y así no vigila los archivos: después de cada corrección hubo que reiniciarlo. La cuenta es `prueba-bitacora@senda.bc`: se recuperaron sus 202 actividades (las 200 de T13 y las 2 que se agregaron para repetir los casos M3 y M6 de la 014), todas con la cumbre calculada. 200 tienen cumbre, de 324 a 1917 m; las 2 especiales no tienen perfil.

- **M1, aprobado.** El panel tiene tipo, mes, distancia y altura más alta.
  - **Conteos,** comparados con una consulta a la base copiada del emulador: "Ciclismo" deja 50; con 18.5 – 42.5 km, 28; con altura de 1150 a 1950 m, 17.
  - **Control deslizante:** el arrastre ajusta al paso de 0.5 km y de 50 m.
  - **Cumbre:** el resumen abierto desde la lista filtrada marca una cumbre de 1833 m, dentro del rango.
  - **TalkBack:** cada extremo se anuncia con su nombre y su valor ("Distancia mínima, 0 km").
- **M2, aprobado.**
  - **Filtros combinados:** con tres filtros, el botón dice "Filtros, 3 activos" y cada mes cuenta solo los filtrados (Noviembre con ciclismo: "2 actividades, 84.51 km").
  - **Sin resultados:** con un cuarto filtro sin coincidencias aparecen "Ver 0 actividades" y el aviso "Ninguna actividad coincide" con "Quitar filtros", distinto del de lista vacía.
  - **Quitar:** la "×" de un chip quita solo ese filtro.
- **M3, aprobado, salvo el paso 4.** Los filtros siguen al cambiar de pestaña y al abrir un resumen y volver. Al cerrar la app y abrirla, la lista empieza sin filtros. **Pendiente: paso 4** (cerrar sesión y entrar con otra cuenta). No se corrió porque pide la contraseña de otra cuenta. El contexto se vacía cuando cambia `userId`.
- **M4, aprobado.** En modo avión, "Senderismo" deja 102 (las 100 caminatas y las 2 especiales), y el botón dice "Filtros, 1 activo", en singular.
- **M5, aprobado.**
  - **Al abrir:** Explorar empieza en 3D, inclinado. El encuadre con inclinación deja a la vista las rutas cercanas a Ensenada, con el relieve y la ruta sobre él (el riesgo del plan no se presentó).
  - **Selección:** se elige una ruta en 3D y, al pasar a 2D, siguen la selección, su tarjeta y la zona.
  - **Detalle:** abre en 3D, con el relieve y su botón en la esquina.
  - **Al volver a abrir:** Explorar empieza otra vez en 3D.
  - **Emulador:** la ubicación tardó en llegar; mientras, Explorar mostró "Sin tu ubicación". Además, el doble toque de adb es muy lento para Mapbox y no sirve para acercar.
- **M6, aprobado.** En modo avión, Explorar abre con el mapa guardado, el botón alterna 3D y 2D sin errores y la app sigue viva. El aviso rojo "Mapbox [error] … Map load failed" es un registro de desarrollo, que el build de entrega no muestra.
- **M8, en parte.**
  - **Nombres accesibles,** revisados con el árbol de accesibilidad:
    - "Filtros, N activos";
    - "Quitar filtro: …";
    - cada extremo del control deslizante con su valor;
    - "Mapa en 3D. Cambiar a 2D";
    - "Cerrar los filtros".
  - **Letra grande:**
    - con 130 %, los botones del panel quedaban lado a lado y "Ver 204 actividades" en dos renglones (**corrección 3**);
    - corregido, en 130 % y en 200 % se apilan y no se corta ningún texto; en 200 % el panel cabe en el 90 % de la pantalla.
  - **Pendiente:** recorrer las pantallas con TalkBack encendido y ajustar los extremos con sus gestos. TalkBack está instalado, pero no se puede manejar por adb. Pasa a T18 o al usuario.
- **M9, aprobado tras la corrección 2.** En claro y en oscuro, cada chip tiene su sombra completa, también al deslizar la fila.
- **M10, aprobado, salvo el paso 5.**
  - **Desde Mis actividades:** el botón fijo no tapa la última fila, y la grabación empieza como desde Inicio. "Listo" regresa a Mis actividades con la actividad nueva arriba (Noviembre pasó de 12 a 13), y atrás no vuelve al resumen ni a la grabación.
  - **Desde Inicio:** "Listo" regresa a Inicio.
  - **Pendiente: paso 5** (lista vacía con el texto nuevo): no hay una cuenta vacía en el emulador. El texto se revisó en el código.
- **M11, aprobado.** "Últimos 7 días" va en una tarjeta con sombra, en claro y en oscuro.
- **M12, aprobado.** Mis actividades (sin y con filtros, panel, sin resultados), Explorar y el detalle en 3D y 2D, e Inicio coinciden con Figma en los dos modos. Diferencias:
  - el radio del panel, ya ajustado en Figma a `Radio/lg` (T9);
  - el mapa 3D real, que en Figma es una ilustración.

**Correcciones durante T17** (`tsc` sin errores y 910 pruebas después de las tres):
1. **Panel (`ActivityFiltersSheet`):**
   - **Perillas:** se cortaban a la mitad en los extremos, porque el `ScrollView` del panel recorta. Ahora el `ScrollView` ocupa también el relleno del panel.
   - **Botones:** quedaban sobre la barra de gestos de Android, porque dentro del `Modal` el área segura llegaba en 0. Ahora el panel tiene su propio `SafeAreaProvider` y un `SafeAreaView` abajo, y ya no usa `navigationBarTranslucent`.
2. **Chips de Explorar:** los 32 dp de espacio bajo la segunda fila tomaban los toques del mapa; arrastrar desde ahí no lo movía. Se cambió a `overflow: 'visible'` en cada fila (plan, D7, actualizado). La sombra sigue completa y el mapa responde justo debajo de los chips.
3. **Letra grande:** el umbral para apilar los botones del panel bajó de 1.3 a 1.25, porque Android entrega 130 % como un poco menos de 1.3.

**Observación fuera de la 015:** en Inicio, las tarjetas de "Tus actividades" de 0 m muestran la miniatura de un mapa (spec 013). La 014 lo corrigió solo en el resumen y en Mis actividades.

## Pendientes conocidos

Ninguno por ahora.
