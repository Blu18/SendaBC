# 014 — Plan técnico

Spec: [spec.md](spec.md)

## Resumen

Se trabaja en cuatro fases, en este orden. Las dos últimas son de la ampliación aprobada el 2026-11-21 (HU-8, CA-25 a CA-29) y se detallan en "Ampliación: estilo con sombras en toda la app".

- **Fase A, Figma.** La versión 3 de la propuesta, en la sección [Resumen y bitácora (spec 014)](https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX?node-id=80-6835), se completa con los estados de CA-21, en modo claro y oscuro, y con los textos reales de la app (formatos de la spec 004). El usuario la aprueba antes de programar (CA-21).
- **Fase B, app.** Todo es frontend y se calcula con lo que ya guarda SQLite. Tres funciones de lógica pura, nuevas y probadas con Vitest: el perfil de elevación de una actividad con su punto más alto, la línea de contexto y la agrupación por mes. Luego se reescriben `activitySummaryPage.tsx` y `activityHistoryPage.tsx` con dos componentes nuevos: el terreno (perfil a todo lo ancho) y la fila de la bitácora. La miniatura reutiliza `TrackThumbnail` de la spec 013.

- **Fase C, Figma de la ampliación.** El estilo ya se aplicó a los componentes y las pantallas del archivo. Falta diseñar Mapas sin conexión y elegir zona, que no estaban en Figma, y que el usuario apruebe todo (CA-27).
- **Fase D, estilo en la app.** Las sombras pasan a ser tokens del tema, por modo. Se crean dos piezas compartidas, la barra fija de abajo y la lista agrupada, y se aplican a las pantallas de RN-12 sin cambiar su comportamiento (CA-26).

No hay endpoints, migraciones de Prisma ni cambios en el esquema de SQLite.

## Verificación contra la constitución

- [x] **Art. 1 La spec primero:** spec aprobada el 2026-11-21. Al escribir este plan se aclaró RN-10 en la spec (actividades de barómetro recuperadas), con nota en su historial. Las pantallas no se programan sin la aprobación de Figma (CA-21).
- [x] **Art. 2 Offline-first:** el perfil, el punto más alto, la línea de contexto, la agrupación por mes y el recorrido de las miniaturas se calculan con SQLite (CA-19). Solo el fondo de mapa de las miniaturas usa la red, igual que en Inicio. Nada cambia el estado de una actividad (RN-9).
- [x] **Art. 3 Seguridad y privacidad:** sin cambios en autenticación ni permisos. El recorrido se dibuja en el teléfono y no se envía a Mapbox (spec 013, D3). Las comparaciones de la línea de contexto usan solo actividades del usuario de la sesión (RN-2, RN-3).
- [x] **Art. 4 Contratos de API:** sin endpoints nuevos ni cambiados.
- [x] **Art. 5 Datos:** sin cambios en Prisma ni en SQLite (`user_version` no cambia). Las coordenadas siguen en `[longitud, latitud]` en `lib/map/` (5.2), y distancias y altitudes en metros (5.4).
- [x] **Art. 6 Verificación:** lógica pura en `frontend/lib/` con Vitest (perfil, punto más alto, línea de contexto, meses y totales). Pantallas, accesibilidad, rendimiento y Figma con casos manuales. Ver "Verificación".
- [x] **Art. 7 Simplicidad y stack:** sin dependencias nuevas. El terreno usa `react-native-svg`, que ya está en el stack por la spec 013. Se reutilizan los acumuladores de distancia y elevación de la spec 004, `perfilParaGrafica` de la spec 007 y `TrackThumbnail` de la spec 013.
- [x] **Art. 8 Ritmo:** rama `014-resumen-bitacora`, que sale de `master` después de fusionar la 013. Commits `feat(014)`, `test(014)` y `docs(014)`.

## Backend

Sin cambios en la API ni en el esquema. Solo se agrega un script de datos de ejemplo para medir CA-20 (tasks, T13). La recuperación de actividades (spec 005) ya trae los puntos con su altitud GPS (`GET /activities/:id` devuelve `points`), así que las actividades recuperadas tienen perfil y miniatura (RN-10) sin tocar el servidor.

## Prototipo en Figma (fase A)

En la sección "Propuesta — Resumen y bitácora" de la página Pantallas:

| Pantalla | Variantes, en claro y oscuro |
|---|---|
| Resumen | Completo (con línea de contexto, perfil, cumbre y recorrido); sin línea de contexto (CA-3); sin perfil, con subida y bajada como cifras (CA-7); sin recorrido (CA-11); ciclismo, con velocidad en lugar de ritmo (CA-9); pendiente, con el aviso de que aún no se puede publicar (spec 007); desde el historial, sin "Listo" (spec 004, CA-21) |
| Mis actividades | Completa con dos meses, uno del año anterior (CA-14); con pendiente y no se pudo subir (CA-17); fila sin recorrido, con el ícono del deporte (CA-16); vacía (spec 004, CA-22); cargando; aviso de sin conexión al deslizar (spec 005, CA-16) |

Ajustes a la propuesta actual para que coincida con la app:

- La fecha usa `formatStartedAt` ("28 oct 2026, 7:15"), no "sáb 28 oct, 7:15". El ritmo usa `formatPace` ("16:09 /km").
- El punto más alto dice "1 412 m aprox." (RN-5).
- La fila de la bitácora usa `formatStartedAt` y los formatos de distancia y duración de la spec 004 (CA-16). El total del mes, `formatDistance` ("3 actividades, 24.60 km").
- El componente local "Fila de bitácora" se pasa a la página Sistema de diseño, junto a los de la 013.

La aprobación se anota en el historial de la spec (CA-21).

## Frontend

### Lógica pura (`frontend/lib/`)

**`lib/metrics/profile.ts` (nuevo): perfil de una actividad (CA-4 a CA-7, RN-5, RN-6, RN-10).**

```ts
type ActivityProfile = {
  perfil: Perfil;            // [distancia acumulada m, altitud m], el tipo de lib/routes/profile.ts
  cumbre: { distanciaM: number; altitudM: number };
  fuente: ElevationSource;   // la que realmente se usó para dibujar (D3)
};
function activityProfile(input: {
  points: MetricsPoint[];
  barometerReadings: TimedBarometerReading[];
  source: ElevationSource;   // activity.elevationSource ?? 'GPS'
}): ActivityProfile | null;  // null si no alcanza RN-6
```

- **Distancia acumulada:** se recorre la lista de puntos con `createDistanceAccumulator` (spec 004), así que el eje X coincide con la distancia del resumen: descarta los puntos imprecisos y los saltos (CA-8, CA-25 de la 004).
- **Altitud con GPS:** la de cada punto con precisión ≤ `MAX_ACCURACY_M` y altitud no nula, igual que `createLiveMetrics`.
- **Altitud con barómetro:** cada lectura se convierte con `pressureToAltitude` (o `relativeAltitudeM` en iOS) y se ubica en el eje X interpolando la distancia acumulada a la hora de la lectura entre los dos puntos que la rodean. Se ancla a la altitud real con D2.
- **Suavizado:** promedio móvil de `SMOOTHING_WINDOW` lecturas, el mismo de la elevación (spec 004). Un pico aislado no llega a cumbre (RN-5).
- **Cumbre:** el máximo de la serie suavizada. Si hay varios iguales, el primero.
- **Mínimo (RN-6):** al menos `MIN_PROFILE_READINGS = 10` altitudes y `MIN_PROFILE_DISTANCE_M = 200` de distancia. Si no, devuelve `null` (CA-7).
- **Muestreo:** se reduce a 200 pares con `simplifyPoints` (spec 013) antes de dibujar.

**`lib/activity/context.ts` (nuevo): línea de contexto (CA-2, CA-3, RN-3, RN-4).**

```ts
type ContextCandidate = Pick<Activity, 'localId' | 'type' | 'startedAt' | 'distanceMeters' | 'elevationGainMeters'>;
function contextLine(activity: ContextCandidate, all: ContextCandidate[], now?: Date): string | null;
```

- Regla 1: no hay otra del mismo tipo que empezara antes. Texto: "Tu primera caminata", "Tu primera carrera" o "Tu primera salida en bici".
- Regla 2: en su mes local (RN-8) hay al menos otra del mismo tipo, y la distancia es mayor que la de todas las anteriores del mes y mayor o igual que la de las posteriores. Así, en un empate gana la más antigua (RN-3). Texto: "Tu caminata más larga de octubre".
- Regla 3: igual que la 2, con la elevación ganada. Texto: "Tu caminata con más subida de octubre".
- Se devuelve la primera regla que se cumpla (RN-4). Los textos por tipo y los nombres de los meses viven en una tabla del mismo archivo, sin depender de `Intl`, para que las pruebas den lo mismo en Node y en Hermes.

**`lib/activity/months.ts` (nuevo): bitácora por mes (CA-13 a CA-15, RN-8).**

```ts
type MonthSection = { key: string; title: string; count: number; distanceMeters: number; data: Activity[] };
function groupByMonth(activities: Activity[], now: Date): MonthSection[];
function monthTotalsText(section: MonthSection): string; // "3 actividades, 24.6 km"
```

- La llave es `AAAA-MM` de `startedAt` en hora local. El título es "Noviembre" o "Noviembre 2025" si no es el año de `now` (CA-14).
- Los meses van del más reciente al más antiguo y, dentro de cada uno, el orden es el que ya trae `listFinishedActivities` (CA-13).
- La distancia del mes suma `distanceMeters` guardadas (RN-8). Se muestra con `formatDistance` ("24.60 km"), igual que el total de 7 días de la 013 (`weekSummaryText`). Con 1 actividad dice "1 actividad".

### Hooks

- **`hooks/activity/activitySummary.hook.ts` (cambia):** además de la actividad y el número de puntos, lee los puntos y las lecturas del barómetro (`getActivityPoints`, `getBarometerReadings`) y devuelve:
  - `profile` (`activityProfile`);
  - `path` (`activityThumbnailPath`, spec 013);
  - `context`, con `contextLine` sobre `listFinishedActivities(userId)`.

  El cálculo corre después de mostrar la actividad, para que el resumen se abra igual de rápido que hoy (requisito de rendimiento). Mientras tanto, el lugar del perfil reserva su alto y no salta.
- **`hooks/activity/activityHistory.hook.ts` (cambia):** devuelve también `sections = groupByMonth(activities, new Date())`.
- **`hooks/activity/useTrackPath.ts` (nuevo):** `useTrackPath(localId)` lee los puntos de una actividad y devuelve su `activityThumbnailPath`, o `null` mientras carga o si no hay puntos válidos. Guarda en memoria las últimas 100 actividades (D4), y la memoria se vacía cuando la sincronización recupera actividades (`useSyncDataChanged`).

### Componentes

- **`components/activity/TerrainProfile.tsx` (nuevo):** el perfil a todo lo ancho (CA-4, CA-5, CA-23, CA-24).
  - Arriba, la cresta: un `Svg` con un `Path` relleno de `primary`, dibujado con las columnas de `perfilParaGrafica` (spec 007) y unido con líneas, sin curvas.
  - Debajo, una `View` con fondo `primary` que continúa la montaña y contiene la subida y la bajada (`onPrimary`) en una fila con `flexWrap`. Así, con letra grande, la base crece en lugar de cortar el texto (D5).
  - La cumbre se marca con un `Circle` de `secondary` con borde `background`. La etiqueta "1 412 m aprox." es un `Text` encima, a la derecha de la cumbre, o a la izquierda si no cabe.
  - El conjunto es un solo elemento accesible: "Perfil de elevación: subiste 612 m, bajaste 598 m, punto más alto 1 412 m aproximadamente" (CA-23).
- **Sin perfil (CA-7):** el resumen muestra la subida y la bajada con `Metric`, en la misma posición.
- **`components/activity/ActivityLogRow.tsx` (nuevo):** la fila de la bitácora (CA-16, CA-17).
  - A la izquierda, `TrackThumbnail` de 56 × 40, o el ícono del deporte si `useTrackPath` da `null`.
  - En medio, el tipo, la fecha y `SyncBadge`, solo si el estado no es `synced`.
  - A la derecha, la distancia y la duración.
  - Es un `PressableScale` con nombre accesible: "Senderismo, 28 oct 2026, 8.31 km, 2:14:05" y, si aplica, "pendiente de subir".

### Pantallas

- **`pages/activity/activitySummaryPage.tsx` (se reescribe):** el orden es el de Figma.
  1. Encabezado.
  2. Tipo, fecha y `SyncBadge`.
  3. Distancia grande y línea de contexto, si hay.
  4. `TerrainProfile` o, sin perfil, las cifras.
  5. Duración y ritmo o velocidad.
  6. Fuente de la elevación y número de puntos.
  7. Miniatura de 328 × 128, si hay recorrido (CA-11).
  8. `PublishSection` y "Listo", sin cambios (CA-12).

  La distancia usa `typography.metricHero` (64/68), un estilo nuevo de la escala solo para esta cifra, igual que el estilo "metricHero" de Figma. Antes decía `metric` con `fontSize` 64 en la pantalla, pero la prueba de la 009 (CA-10) no permite tamaños sueltos. Si con letra grande no cabe en una línea, la unidad pasa abajo (CA-24). La carga y "No se encontró la actividad" no cambian.
- **`pages/activity/activityHistoryPage.tsx` (cambia):** la `FlatList` pasa a tener un elemento por mes de `sections`, y cada uno es una `GroupedList` con sus filas. Antes decía `SectionList`, pero sus filas se dibujan por separado y no pueden ir dentro de una tarjeta agrupada (ver tasks, T18).
  - Cada encabezado de mes tiene `accessibilityRole="header"` y su total (CA-23).
  - Las filas de un mes van en un contenedor `surface` con divisores de 1 px en `border` al 35 %, como en Figma.
  - `RefreshControl`, el aviso del deslizamiento, la lista vacía y la navegación al resumen no cambian (CA-18).

### Tema y contraste

Un solo token nuevo: `shadow` (RN-11), en `lib/theme/colors.ts` para claro y oscuro, con los mismos valores que la variable `Color/shadow` de Figma (claro `rgba(43, 41, 33, 0.12)`, oscuro `rgba(0, 0, 0, 0.5)`). Hoy `lib/theme/spacing.ts` ya tiene `shadows.floating`, igual en los dos modos y con el color escrito a mano. Se reemplaza por `shadows` por modo, con tres niveles (`low`, `medium` y `bar`) construidos con `colors.shadow`, que equivalen a los estilos de efecto `Sombra/baja`, `Sombra/media` y `Sombra/barra` de Figma. Se escriben con la propiedad `boxShadow` de React Native (D8), que la app ya usa en `floating`. Los siete usos de `floating` pasan a `medium`, salvo `Notice`, que pasa a `low` (RN-13). La prueba de colores sueltos de la 009 (CA-10) sigue pasando, porque las pantallas usan el token y no valores escritos a mano.

Los pares nuevos son `onPrimary` sobre `primary` en texto pequeño (la etiqueta "subidos"), `text` sobre `background` (la cumbre) y `secondary` sobre `background` como elemento gráfico (≥ 3:1). Se confirman en `CONTRAST_PAIRS` y en la tabla de Figma, en claro y oscuro. Si alguno falta, se agrega a las dos.

## Decisiones

| Decisión | Alternativas consideradas | Motivo |
|---|---|---|
| **D1.** El perfil se calcula al abrir el resumen y no se guarda. | Guardarlo en SQLite al detener la actividad, con una migración. | Con unos pocos miles de puntos, el cálculo es lineal y tarda decenas de ms. Así no cambia el esquema, y el perfil de las actividades viejas o recuperadas sale sin migrar datos. Si el S9+ tarda más de 300 ms con una actividad de 3 h, se reconsidera. |
| **D2.** Con barómetro, la serie se desplaza para que su mediana coincida con la mediana de la altitud GPS de los puntos precisos. Sin 10 altitudes GPS, en Android se usa la altitud de la atmósfera estándar tal cual. | Usar solo la fórmula estándar, que varía decenas de metros con el clima. Usar solo la altitud GPS, que tiene mucho ruido (F5). | El barómetro da la forma y el GPS da el nivel. Con la mediana, los saltos del GPS casi no influyen. RN-5 ya marca el valor como aproximado. |
| **D3.** Una actividad de barómetro sin lecturas en el teléfono (recuperada del servidor) dibuja el perfil con la altitud GPS de los puntos. | No mostrar perfil. Subir las lecturas al servidor. | Es lo que pide la spec (RN-10). Subir las lecturas cambiaría el backend, que queda fuera de alcance. |
| **D4.** Las miniaturas de la bitácora se calculan bajo demanda, por fila visible, con una memoria de 100 recorridos. | Calcularlas todas al abrir la lista. Guardar el recorrido simplificado en SQLite. | Con 200 actividades, leer todos los puntos al abrir no cumpliría CA-20. `SectionList` solo monta las filas visibles. La fila aparece con el ícono del deporte y cambia a la miniatura al tenerla. Si CA-20 falla en el S9+, se pasa a guardar el recorrido en SQLite con una migración y se actualiza este plan. |
| **D5.** La base de la montaña es una `View` y no forma parte del `Svg`. | Dibujar todo, incluido el texto, dentro del `Svg`. | El texto del `Svg` no sigue el tamaño de letra del sistema ni se puede leer con el lector de pantalla. Con una `View`, la base crece con la letra (CA-24). |
| **D6.** La línea de contexto se calcula con todas las actividades terminadas del usuario, leídas con `listFinishedActivities`. | Una consulta SQL por regla. | Ya existe y trae lo necesario. Con 200 actividades, recorrerlas en memoria es trivial, y la lógica queda pura y probada (CA-2, CA-3). |
| **D8.** Las sombras usan `boxShadow` con el token `shadow`. | `elevation` de Android, que solo acepta un número y dibuja una sombra gris que no se puede teñir; o `react-native-shadow-2`. | RN 0.86 con la nueva arquitectura soporta `boxShadow` en Android e iOS, con color, desplazamiento y desenfoque, así que coincide con Figma y no agrega dependencias. Si en el S9+ (Android 10) no se viera, se usa `elevation` como respaldo y se anota. |
| **D7.** Los nombres de los meses y los textos por tipo van en tablas propias. | `Intl.DateTimeFormat` con `es-MX`. | Hermes y Node pueden dar formatos distintos ("oct." frente a "oct"), y las pruebas deben dar lo mismo que la app. |

## Riesgos

- **F5 sin corregir:** con elevación de GPS, el perfil puede verse exagerado o con un tramo plano en segundo plano. La spec lo acepta (P5). En la prueba de campo de la 012 se revisa junto con el fallo.
- **iOS sin altitud GPS:** con `relativeAltitudeM` y sin altitudes GPS, D2 no tiene ancla y la cumbre quedaría relativa al inicio. Hoy la app se prueba solo en Android. Si llegara a pasar en iOS, se oculta la altitud de la cumbre y se anota en la spec.
- **Rendimiento de la bitácora (CA-20):** depende de D4. Se mide en el S9+ con 200 actividades generadas en SQLite.
- **Línea de contexto inestable:** cambia si después se graba una actividad mejor. La spec lo acepta (RN-4) y evita el cambio en los empates (RN-3).
- **Sombras en Android 10:** si `boxShadow` no se dibuja igual en el S9+, se cae a `elevation` (D8). Se revisa en M8.
- **Letra muy grande:** la distancia de 64 pt y la etiqueta de la cumbre son lo que primero se corta. Se revisa con el tamaño máximo en el S9+ (CA-24).

## Verificación

| CA | Cómo |
|---|---|
| CA-1, CA-9, CA-12 | Manual en el emulador: resumen de senderismo y de ciclismo, desde la grabación y desde el historial, con y sin opción de publicar. |
| CA-2, CA-3 | Vitest, `lib/activity/context.test.ts`: primera de un tipo; la más larga y la de más subida del mes; sin otra del mismo tipo en el mes; empate; prioridad entre reglas; cambio de mes en hora local. Manual: ver la línea en el resumen. |
| CA-4 a CA-7 | Vitest, `lib/metrics/profile.test.ts`: GPS y barómetro; cumbre conocida; pico aislado que no cuenta; ancla con la mediana del GPS (D2); barómetro sin lecturas (D3); menos de 10 altitudes o menos de 200 m da `null`. Manual: el perfil y las cifras de respaldo en el resumen. |
| CA-8 | Manual: actividad con barómetro y actividad con GPS. |
| CA-10, CA-11, CA-16 | Manual: actividad con puntos, actividad sin puntos válidos y modo avión. `activityThumbnailPath` ya tiene pruebas (013). |
| CA-13 a CA-15 | Vitest, `lib/activity/months.test.ts`: orden; año distinto al actual; totales; actividad a las 23:30 del último día del mes en hora local. Manual: la lista agrupada. |
| CA-17, CA-18 | Manual: actividad pendiente, no se pudo subir y sincronizada; deslizar sin red; lista vacía. |
| CA-19 | Manual en modo avión: resumen y bitácora completos, salvo el fondo de las miniaturas. |
| CA-20 | Manual en el S9+ con 200 actividades: tiempo hasta ver la lista y desplazamiento. Se crean con un script de ejemplo en `backend/prisma/seed/`, como el de rutas, y se recuperan en el teléfono (tasks, T13). Es solo herramienta de prueba: no cambia endpoints ni esquema. |
| CA-21, CA-22 | Revisión del archivo de Figma y aprobación anotada; comparación de las pantallas con Figma en claro y oscuro. |
| CA-22 (sombras) | Vitest: el token `shadow` existe en claro y oscuro, y `elevation` lo usa. M8: las sombras se ven en ambos modos. |
| CA-23, CA-24 | Manual con TalkBack y con el tamaño de letra máximo en el S9+. Vitest: `CONTRAST_PAIRS` incluye los pares nuevos. |

## Ampliación: estilo con sombras en toda la app

HU-8, CA-25 a CA-29, RN-12 y RN-13. Solo cambia la presentación (CA-26): ninguna pantalla cambia sus datos, textos, orden ni navegación.

### Verificación contra la constitución (ampliación)

- **Art. 1:** la ampliación está aprobada (2026-11-21). Ninguna pantalla de RN-12 se programa sin la aprobación de Figma (CA-27).
- **Art. 2 a 5:** sin cambios; solo estilos.
- **Art. 6:** los tokens de sombra por modo se prueban con Vitest. Las pantallas se verifican comparándolas con Figma y repitiendo los casos manuales de sus specs originales (CA-26). Ver "Verificación de la ampliación".
- **Art. 7:** sin dependencias nuevas. Tres componentes compartidos nuevos evitan repetir estilos en diez pantallas (D9, D10).

### Figma (fase C)

- **Hecho:** los componentes del sistema y las tarjetas y barras dibujadas directamente en las pantallas ya tienen el estilo (ver tasks, T2). Las pantallas viejas de "Actividad" se borraron (P8) y la página "Prototipo" quedó como histórico (P7).
- **Falta:**
  - diseñar **Mapas sin conexión** y **Elegir zona** (spec 011), en claro y oscuro, con sus estados: con zonas, vacía, descargando y con error;
  - agregar las subpantallas de la cuenta (cambiar correo, cambiar contraseña y borrar cuenta), que hoy solo existen en el código, para que su barra de acciones también quede definida;
  - la revisión y la aprobación del usuario (CA-27).

### Frontend (fase D)

**Tema (`lib/theme/`)**

- `colors.ts`: `shadow` en `lightColors` y `darkColors`.
- `shadows.ts` (nuevo; sale de `spacing.ts`): `makeShadows(colors)` devuelve `{ low, medium, bar }`, cada uno `{ boxShadow: string }`. `index.ts` arma `lightTheme.shadows` y `darkTheme.shadows` con los colores de cada modo. Se borra `floating`.
- Pruebas en `shadows.test.ts`: los tres niveles existen en los dos temas y usan el `colors.shadow` de su modo.

**Componentes compartidos nuevos**

- `components/ui/BottomBar.tsx` (D9): barra fija de abajo con fondo `surface`, padding del sistema, sombra `bar` y área segura inferior. Reemplaza los `styles.actions` con `borderTopWidth` de diez pantallas:
  - activityPage, activitySummaryPage, routeDetailPage, publishRoutePage, editRoutePage y profilePage;
  - changeEmailPage, changePasswordPage y deleteAccountPage;
  - la barra de "Empezar actividad" de mainPage.

  Las pantallas de auth (`index`, `login` y `register`) tienen sus botones en el contenido, no en una barra fija, así que no cambian.
- `components/ui/GroupedList.tsx` (D10): tarjeta `surface` con radio `lg` y sombra `low`, que pone divisores con sangría entre sus hijos (prop `inset`, en dp). La usan Mis actividades (T12), Mis rutas, Mis favoritas, la lista "Cuenta" del perfil, y Populares y Listo para salir de Inicio. En listas largas, la sombra va en el contenedor de cada grupo y no en cada fila (CA-29).
- `components/ui/IconBadge.tsx`: el ícono dentro de un círculo, con su color como tinte al 14 % (RN-13). Lo usan PrepRow, la cabecera del resumen y las filas sin recorrido de la bitácora.

**Componentes existentes**

| Componente | Cambio |
|---|---|
| `Card` | Sin borde; sombra `low`. |
| `TabBar` | Sin `borderTop`; sombra `bar`. |
| `Notice` | `floating` → `low`. |
| `StopButton`, `SosButton`, `MapViewToggle` y el panel de `RecordingMap` | `floating` → `medium`. |
| `ActivityCard`, `RouteCard`, `SafetyCard` y la tarjeta de contacto | Sombra `low`. |
| `PrepRow` | Ícono con `IconBadge`. |
| `PopularRouteRow` | Va dentro de `GroupedList`. |

**Pantallas**

- `exploreRoutesPage`: la tarjeta de la ruta seleccionada y "Buscar en esta zona" pasan de `floating` a `medium`.
- `myRoutesPage`, `favoritesPage` y `profilePage`: sus filas van en `GroupedList`, como en Figma.
- `offlineZonesPage` y `pickZonePage`: según el diseño de la fase C.
- `emergencyContactsPage`: tarjetas de contacto con sombra `low`.

### Decisiones de la ampliación

| Decisión | Alternativas consideradas | Motivo |
|---|---|---|
| **D9.** Un `BottomBar` compartido. | Cambiar el estilo `actions` en cada pantalla. | Son diez copias del mismo bloque. Con un componente, la sombra, el padding y el área segura quedan iguales en todas, y CA-25 se revisa una sola vez. |
| **D10.** `GroupedList` con divisores con sangría y la sombra en el grupo. | Sombra en cada fila o tarjeta. | Es lo que muestra Figma (RN-13). Además, muchas sombras en una lista larga cuestan al desplazar en el S9+ (CA-29). |
| **D11.** Las sombras dependen del modo y viven en el tema. | Un solo valor para los dos modos, como el `floating` de hoy. | En oscuro, una sombra al 12 % no se ve; Figma usa 50 % (RN-11). |

### Riesgos de la ampliación

- **Regresiones visuales:** quitar los bordes puede dejar alguna tarjeta sin separarse del fondo en modo claro, porque `surface` sobre `background` tiene poco contraste. CA-28 lo revisa: si alguna no se distingue, conserva su borde.
- **Pantallas sin Figma:** Mapas sin conexión, Elegir zona y las subpantallas de la cuenta se diseñan en la fase C. No se tocan en el código hasta que se aprueben.
- **Batería:** las sombras no afectan al mapa, pero la grabación se revisa con la prueba de batería de la spec 011 (CA-29).

### Verificación de la ampliación

| CA | Cómo |
|---|---|
| CA-25 | Vitest, `shadows.test.ts`. M10: recorrer todas las pantallas de RN-12 en claro y oscuro y compararlas con Figma. |
| CA-26 | M11: repetir los casos manuales de las specs originales: 013 (M1 a M9); 006 y 007 (Explorar, detalle, publicar, Mis rutas y favoritas); 008 (contactos); y 011 (zonas sin conexión y perfil). |
| CA-27 | Aprobación anotada en el historial de la spec. |
| CA-28 | Vitest, `contrast.test.ts`. M10: cada tarjeta se distingue del fondo sin la sombra (revisado con una captura en escala de grises). |
| CA-29 | M12: desplazamiento en Inicio, Mis rutas, Mis favoritas y Seguridad en el S9+, y la prueba de batería de la grabación de la spec 011. |
