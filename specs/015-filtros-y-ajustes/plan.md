# 015 — Plan técnico

Spec: [spec.md](spec.md)

## Resumen

Todo pasa en el frontend y nada en el servidor. Primero se diseñan en Figma los cambios visuales (CA-22) y, cuando el usuario los aprueba, se programan.

- **Filtros de Mis actividades:** se aplican en memoria sobre las actividades que ya lee `useActivityHistory`. La lógica pura va en `lib/activity/filters.ts`, con pruebas Vitest. El estado vive en un contexto que dura lo que la app está abierta.
- **Altura más alta:** el filtro necesita la cumbre de cada actividad sin leer sus puntos cada vez. Por eso se guarda en SQLite (versión 7), calculada con el mismo `activityProfile` del resumen de la 014.
- **Controles deslizantes:** son un componente propio con `PanResponder` de React Native, sin dependencias nuevas.
- **Mapa 3D en rutas:** `RouteMap` gana la vista 3D con el mismo relieve que `RecordingMap` (spec 010) y reutiliza `MapViewToggle`.
- **Ajustes de diseño:** la sombra de los chips de Explorar deja de recortarse, Mis actividades lleva la `BottomBar` de "Empezar actividad" y `WeekSummary` va dentro de una `Card`.

## Verificación contra la constitución

- [x] **Art. 1 La spec primero:** spec aprobada el 2026-11-22. CA-20 y la spec 004 (CA-2) se corrigieron antes de este plan, con nota en sus historiales.
- [x] **Art. 2 Offline-first:** los filtros leen solo SQLite (CA-11) y no cambian el estado de ninguna actividad (RN-1). La cumbre se calcula en el teléfono con los puntos guardados. El 3D sin red se comporta como la grabación: sin relieve si no hay datos de terreno, y en 2D con el estilo local si el estilo no carga (CA-16).
- [x] **Art. 3 Seguridad:** sin cambios. No hay endpoints ni datos nuevos que salgan del teléfono.
- [x] **Art. 4 Contratos de API:** no hay endpoints nuevos ni cambios en los existentes.
- [x] **Art. 5 Datos:** sin cambios en Prisma. SQLite pasa a la **versión 7**, con dos columnas nuevas en `activities` (ver "Cambios a SQLite"). Las altitudes están en metros.
- [x] **Art. 6 Verificación:** filtros, límites de los controles deslizantes, meses disponibles, migración v7 y la vista del mapa sin "Sin mapa" se prueban con Vitest. Las pantallas, el mapa y la accesibilidad se verifican con casos manuales en `tasks.md`.
- [x] **Art. 7 Simplicidad y stack:** sin dependencias nuevas (D4). Se reutilizan `BottomBar`, `Card`, `Chip`, `MapViewToggle`, `activityProfile` y `groupByMonth`.
- [x] **Art. 8 Ritmo:** rama `015-filtros-y-ajustes` desde `master` con la 014 fusionada, y commits `feat(015)`, `fix(015)` y `docs(015)`.

## Backend

### Endpoints

Ninguno nuevo ni modificado.

### Módulos / archivos

Sin cambios.

### Cambios de esquema (Prisma)

Ninguno. La cumbre es un dato derivado de los puntos, que el servidor ya tiene. Se calcula en el teléfono también para las actividades recuperadas (D1).

## Frontend

### Fase A — Figma (antes de programar, CA-22)

En "SendaBC — Diseño", una sección "Filtros y ajustes (spec 015)" en la página Pantallas, en claro y oscuro:

- **Mis actividades:**
  - con el botón fijo "Empezar actividad";
  - sin filtros, y con filtros activos (fila de filtros y "Quitar filtros");
  - el panel de filtros: tipo, mes, distancia y altura más alta con sus controles deslizantes;
  - sin resultados (CA-8);
  - la lista vacía, con el texto nuevo (ver D8);
  - con letra grande.
- **Explorar y detalle de ruta:** en 3D y en 2D, con el botón de vista, y los chips con su sombra completa (CA-18).
- **Inicio:** la tarjeta de "Últimos 7 días" (CA-21).

Al Sistema de diseño se agregan los componentes "Control deslizante de rango" y "Panel de filtros". El usuario aprueba o pide cambios, y se anota en el historial de la spec. Los textos y la disposición finales son los que apruebe; lo que este plan propone de la interfaz (D5) se ajusta a Figma.

### Pantallas y navegación

- `pages/activity/activityHistoryPage.tsx`:
  - **Encabezado:** un botón "Filtros" en `ScreenHeader`, que indica cuántos filtros hay activos. Abre el panel de filtros (D5).
  - **Fila de filtros activos:** debajo del encabezado, solo con filtros. Cada chip dice su valor ("Ciclismo", "Octubre 2026", "5–12 km", "800–1400 m") y la fila termina en "Quitar filtros" (CA-7).
  - **Lista:** la `FlatList` por mes usa `groupByMonth` sobre las actividades filtradas, así que los totales cuentan solo esas (CA-9).
  - **Sin resultados:** `Notice` con "Ninguna actividad coincide con los filtros" y el botón "Quitar filtros" (CA-8). Se distingue de la lista vacía porque esta solo aparece si la cuenta no tiene actividades.
  - **Botón fijo:** `BottomBar` con `PrimaryButton` "Empezar actividad" fuera de la `FlatList`, con fondo `background`, como en Inicio. Navega a `Activity` igual que `mainPage` (CA-19, CA-20). La lista queda arriba de la barra, así que la última fila no se tapa.
  - **"Listo":** el resumen ya usa `goBack()` y la grabación se reemplaza por el resumen. Desde esta pestaña, "Listo" regresa a Mis actividades sin cambiar código (spec 004, CA-2 actualizado). `useFocusEffect` recarga la lista con la actividad nueva.
- `components/activity/ActivityFiltersSheet.tsx` (nuevo): el panel de filtros en un `Modal` de React Native que sube desde abajo. Contiene:
  - **Tipo:** chips "Todas", "Senderismo", "Carrera" y "Ciclismo".
  - **Mes:** chips de los meses con actividades, del más reciente al más viejo, más "Todos" (CA-3).
  - **Distancia y altura más alta:** un `RangeSlider` para cada uno.
  - **Abajo:** "Quitar filtros", y "Ver N actividades", que cierra el panel.

  Los cambios se aplican al momento, así que N siempre es el número real.
- `components/ui/RangeSlider.tsx` (nuevo): ver D4.
- `components/map/RouteMap.tsx`: vista 3D (D6). Se agregan:
  - **Props:** `view` y `onViewChange`, para que la pantalla ponga el botón donde diga Figma.
  - **En 3D:** `RasterDemSource` y `Terrain` con la misma exageración que la grabación, el sombreado y la cámara con `PITCH_3D`.
  - **Sin cambios:** el estilo local si el estilo falla, y la lógica de encuadre pendiente.
- `pages/routes/exploreRoutesPage.tsx`:
  - **Vista:** estado `view`, que empieza en `'3D'` al montar la pantalla (CA-13), y `MapViewToggle` en la fila de acciones del mapa.
  - **Chips:** sombra completa (D7).
  - **Sin cambios:** la búsqueda, "Buscar en esta zona", la selección y los filtros (RN-7).
- `pages/routes/routeDetailPage.tsx`: estado `view` que empieza en `'3D'` y `MapViewToggle` sobre el mapa.
- `components/map/MapViewToggle.tsx` y `lib/map/viewMode.ts`: `siguienteVista` recibe si se permite "Sin mapa". Los mapas de rutas nunca lo ofrecen; la prueba de batería solo aplica a la grabación (spec 011, RN-7). Su nombre accesible sigue diciendo la vista a la que cambia, y se le agrega la actual: "Mapa en 3D. Cambiar a 2D" (CA-17).
- `pages/main/mainPage.tsx` / `components/home/WeekSummary.tsx`: `WeekSummary` va dentro de `Card` (fondo `surface`, radio `lg` y sombra `low`) (CA-21). Sus textos sobre `surface` ya están en `CONTRAST_PAIRS`; si Figma usa otro color, se agrega el par.

### Hooks / estado / almacenamiento local

- `lib/activity/filters.ts` (nuevo, lógica pura, con pruebas en `filters.test.ts`):
  - `type ActivityFilters = { type: ActivityType | null; month: string | null; distance: Range | null; peak: Range | null }`. `month` usa la clave de `localMonthKey` de la 014, y `null` quiere decir sin filtro.
  - `filterActivities(activities, filters)`: todos los filtros a la vez (CA-6).
    - Mes en hora local (RN-3).
    - Rangos con los extremos incluidos (CA-4, CA-5).
    - Sin distancia, o sin cumbre, la actividad queda fuera solo si ese filtro está activo.
  - `filterLimits(activities)`: mínimo y máximo de distancia y de cumbre de todas las actividades, redondeados al paso (D4) (RN-8).
  - `normalizeRange(range, limits)`: un rango que toca los dos límites pasa a `null` (RN-8). Lo mismo si el valor elegido queda fuera de los límites porque cambiaron las actividades.
  - `availableMonths(activities)`: los meses con actividades, del más reciente al más viejo, con su título (con año si no es el actual, como la 014).
  - `activeFilterLabels(filters)` y `activeFilterCount(filters)`, para la fila de chips y el botón.
- `context/ActivityFiltersContext.tsx` (nuevo): guarda `ActivityFilters` en memoria, dentro de `App.tsx`. Por eso los filtros siguen al cambiar de pestaña o abrir un resumen, y se pierden al cerrar la app (CA-10). Se vacían al cerrar sesión, para que otra cuenta no herede filtros.
- `hooks/activity/activityHistory.hook.ts`: además de `activities`, devuelve:
  - `filtered`, con `filterActivities`;
  - `sections`, que ahora agrupa `filtered`;
  - `limits` y `months`, que se calculan con todas las actividades.

  Todo con `useMemo`, porque son 200 elementos en memoria.
- `lib/db/activities.ts`: `Activity` agrega `peakAltitudeMeters: number | null`. Se agregan dos funciones: `savePeak(localId, altitude | null)`, que también marca `peak_calculated = 1`, y `listActivityIdsMissingPeak()`.
- `lib/db/activityMetrics.ts`:
  - **`finalizeMetrics`:** además de las métricas, calcula `activityProfile` con los mismos puntos y lecturas, y guarda `cumbre.altitudM`, o `null` si no hay perfil (RN-5).
  - **`computeMissingPeaks()` (nuevo):** calcula la cumbre de las actividades con `peak_calculated = 0`, una por una, y si una falla sigue con las demás, como `computeMissingMetrics`. Se llama en dos momentos (D1): al abrir la app, después de `computeMissingMetrics`, y al terminar una sincronización que recuperó actividades, antes de avisar que cambiaron los datos.

### Cambios a SQLite

**Versión 7** en `lib/db/schema.ts`:

```sql
ALTER TABLE activities ADD COLUMN peak_altitude_meters REAL;
ALTER TABLE activities ADD COLUMN peak_calculated INTEGER NOT NULL DEFAULT 0;
```

- `peak_altitude_meters` es la cumbre del perfil de la 014. `NULL` quiere decir sin perfil, o todavía sin calcular.
- `peak_calculated` distingue "sin perfil" (1 y `NULL`) de "falta calcularla" (0).

Las actividades de antes de la v7 quedan en 0 y las calcula `computeMissingPeaks` al abrir la app. La prueba de la migración sigue el patrón de `pasosPendientes`.

## Dónde se prueba

A pedido del usuario (2026-11-22), los casos manuales que se pueden hacer en el emulador (`Pixel_8_Pro`) se hacen ahí. Para la cuenta de prueba de la 014, con 200 actividades, hay que recuperarlas también en el emulador.

- **Emulador:**
  - filtros por tipo, mes, distancia y altura;
  - filtros combinados, sin resultados, quitar filtros y que sigan al cambiar de pestaña o al cerrar la app (CA-1 a CA-10);
  - filtros en modo avión (CA-11);
  - TalkBack en los controles deslizantes y en el botón de vista, si la imagen del emulador lo tiene; si no, pasa al S9+;
  - cambio de 2D a 3D y que se conserven la zona y la selección;
  - que el mapa empiece en 3D y funcione igual con búsqueda, selección y detalle (CA-12, CA-13, CA-15, CA-17);
  - 3D sin conexión (CA-16);
  - sombra de los chips (CA-18);
  - botón fijo y "Listo" (CA-19, CA-20);
  - tarjeta de Inicio (CA-21);
  - comparación con Figma en claro y oscuro (CA-23);
  - letra grande.
- **S9+, solo lo que el emulador no mide bien:**
  - el relieve real en 3D (CA-14), porque el emulador dibuja el terreno con la GPU de la computadora;
  - los tiempos: la lista en menos de 1 s con filtros, abrir Explorar en 3D contra 2D, y lo que tarda `computeMissingPeaks` con 200 actividades.

El APK de desarrollo actual es solo para arm64 (los teléfonos). Para el emulador hace falta uno x86_64 compilado desde `C:\dev\sbc`, por el límite de 260 caracteres en las rutas. Como la 015 no agrega módulos nativos, basta compilarlo una vez y usar Metro.

## Decisiones

| # | Decisión | Alternativas consideradas | Motivo |
|---|---|---|---|
| D1 | Guardar la cumbre en SQLite (v7) y calcularla al terminar, al recuperar y una vez para las viejas | Calcularla al filtrar; guardarla en el servidor | Filtrar leyendo los puntos de 200 actividades (unas 86 000 filas) tarda segundos. En el servidor haría falta un endpoint y una migración solo para un dato que el teléfono ya puede calcular. Con el mismo `activityProfile`, la cifra es la misma del resumen (CA-5). |
| D2 | Filtrar en memoria, en `lib/activity/filters.ts` | Consultas SQL con `WHERE` | La lista ya está en memoria y son pocas actividades. Así la lógica se prueba con Vitest (constitución 6.1) y los totales salen del mismo `groupByMonth`. |
| D3 | Contexto en memoria para los filtros | `app_settings` en SQLite; estado local de la pantalla | CA-10 pide que sigan mientras la app está abierta y se quiten al cerrarla. El estado local se perdería en algunos cambios de pestaña; SQLite los guardaría de más. |
| D4 | `RangeSlider` propio con `PanResponder` | `@react-native-community/slider`; `react-native-gesture-handler` con Reanimated | El slider de la comunidad tiene un solo extremo, y Gesture Handler con Reanimated son dos dependencias nativas nuevas y otro build. Con `PanResponder` basta para dos extremos. Accesibilidad: cada extremo es un elemento `adjustable` con su valor ("Distancia mínima, 5 km") y `increment` y `decrement` de un paso, así TalkBack lo ajusta sin arrastrar. Pasos: 0.5 km de distancia y 50 m de altura. Los extremos no se cruzan. |
| D5 | Panel de filtros en un `Modal` que sube desde abajo, y chips de filtros activos en la pantalla | Filtros siempre visibles arriba de la lista; pantalla aparte | Cuatro filtros con dos controles deslizantes no caben arriba de la lista sin empujarla. Una pantalla aparte rompe el ida y vuelta. Los chips cumplen CA-7 sin abrir el panel. La disposición final la decide Figma. |
| D6 | 3D en `RouteMap` con el relieve de `RecordingMap` | Componente de mapa nuevo para 3D | Un solo mapa de rutas para Explorar y el detalle (spec 013, CA-30). `TERRAIN_EXAGGERATION` pasa de `RecordingMap` a `lib/map/camera.ts`, para que los dos usen el mismo valor. La ruta se dibuja con `LineLayer`, que en Mapbox v10 sigue el relieve (CA-14). |
| D7 | Chips de Explorar: `overflow: 'visible'` en cada `ScrollView` horizontal, para que la sombra se dibuje fuera de la fila | Espacio para la sombra dentro del `ScrollView`, compensado con margen negativo (lo primero que se programó); bajar los chips a sombra `low`; quitar el `ScrollView` | La línea recta es el borde del `ScrollView`, que recorta lo que sale de él. La sombra `medium` llega a unos 28 dp abajo. En T17 (M9), los 32 dp de espacio transparente bajo la segunda fila tomaban los toques del mapa, así que se cambió a `overflow: 'visible'`, que en Android deja la sombra completa sin ocupar espacio. Se conserva `medium`, porque los chips flotan sobre el mapa (014, T22). |
| D8 | El texto de la lista vacía cambia a uno como el de Inicio ("Toca 'Empezar actividad' para grabar la primera.") | Dejar "Inicia una desde la pestaña Inicio…" | Con el botón en la pantalla, el texto viejo manda a otro lugar. Es un cambio de texto: se muestra en Figma para que el usuario lo apruebe. |
| D9 | `WeekSummary` dentro de `Card` | Fondo propio en `WeekSummary` | `Card` ya tiene la sombra `low` y el radio de las tarjetas (CA-21). |

## Riesgos

- **`fitBounds` con inclinación:** en `@rnmapbox/maps`, encuadrar con `pitch` puede dejar las rutas fuera de la vista o perder la inclinación. Mitigación: el encuadre usa `setCamera` con `bounds`, `padding` y `pitch` juntos. Se revisa primero en el emulador con las 25 km de Explorar (013, P-B).
- **Rendimiento del 3D en Explorar:** abrir en 3D descarga terreno y puede tardar más (requisito no funcional). Si en el S9+ la diferencia se nota, se anota y se propone ajustarlo (por ejemplo, bajar la exageración o cargar el relieve después del primer encuadre) antes de cambiar la spec.
- **Toques sobre el mapa en el espacio de la sombra (D7):** el espacio del `ScrollView` de los chips puede tomar toques que eran para el mapa. Es una franja de unos 28 dp arriba del mapa; se verifica a mano en el emulador. Si molesta, la fila se acerca al borde de arriba. **Pasó en T17 (M9):** se resolvió con `overflow: 'visible'` en lugar del espacio (D7).
- **`computeMissingPeaks` en la primera apertura con 200 actividades:** lee todos los puntos una vez. Corre después del arranque y no bloquea la pantalla, como `computeMissingMetrics`. Mientras no termina, el filtro de altura no muestra esas actividades. En el S9+ se mide cuánto tarda.
- **`PanResponder` dentro del `Modal`:** el arrastre puede competir con el desplazamiento del panel. Mitigación: el panel no se desplaza mientras se arrastra un extremo (`onPanResponderTerminationRequest` en `false`).
- **APK:** no hay módulos nativos nuevos, así que basta Metro con el APK de desarrollo actual. El de entrega se compila en la 012.
