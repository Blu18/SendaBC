# 014 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de `frontend/lib/` sin imports de React Native incluyen sus pruebas Vitest (constitución 6.1).

Dos tareas detienen el trabajo:

- **T2** (hecha): las pantallas T11 y T12 no se programan antes de que el usuario apruebe su diseño (CA-21).
- **T17:** el estilo de la ampliación (T19 a T23) no se programa antes de que el usuario apruebe el diseño de todas las pantallas (CA-27).

Mientras tanto pueden avanzar la lógica pura, los hooks y los componentes (T3 a T10), y las piezas compartidas (T18). T11 y T12 usan las piezas de T18, así que T18 va antes que ellas.

## Antes de empezar (lo hace el usuario)

- Fusionar `013-inicio-rediseno` en `master`, actualizar el `master` local y crear la rama `014-resumen-bitacora`.
- Tener la sesión de Figma conectada al MCP.

## Fase A — Prototipo en Figma

- [x] T1 — En la sección "Propuesta — Resumen y bitácora" de "SendaBC — Diseño", completar las variantes del plan, en claro y oscuro:
  - **Resumen:** completo; sin línea de contexto; sin perfil, con las cifras; sin recorrido; ciclismo; pendiente; desde el historial.
  - **Mis actividades:** completa con un mes del año anterior; pendiente y no se pudo subir; fila sin recorrido; vacía; cargando; sin conexión.

  Ajustar también los textos a los formatos de la app: `formatStartedAt`, `formatPace`, "1 412 m aprox." y el total del mes con `formatDistance`. Pasar el componente "Fila de bitácora" a la página Sistema de diseño. (CA-21)

  Hecho (2026-11-21): versión 1 en la sección "Propuesta — Resumen y bitácora", ya borrada. Tiene 12 marcos por modo (24 en total): 7 de Resumen y 5 de Mis actividades. Notas:
  - "Pendiente y no se pudo subir" no tiene marco propio: las dos insignias aparecen en "Mis actividades — completa", que también tiene el mes del año anterior (Diciembre 2025).
  - "Fila de bitácora" es ahora un conjunto de variantes (`Recorrido=Sí` y `Recorrido=No`), en la sección "Mis actividades (spec 014)" de Sistema de diseño. Sus propiedades son Tipo, Fecha, Distancia, Duración y Con estado.
  - Sin perfil y sin recorrido usan el componente `Métrica` (Mediana) para la subida y la bajada. El motivo para no publicar es texto `bodySmall` en `textMuted`, centrado, como `publishNotice` en el código.
  - Con la fecha completa, la línea de tipo y fecha ocupa dos renglones junto a la insignia. Se deja así porque es lo que pasará en la app.
  - Los perfiles y recorridos son ilustraciones: todas las variantes con perfil muestran la misma silueta.

  Versión 2 (2026-11-21, a pedido del usuario, "más moderno y profesional"): sección "Propuesta v2", ya borrada, por ahora solo Resumen completo y Mis actividades completa, en claro y oscuro. Cambios:
  - Tipo y fecha en dos renglones, con el ícono en un círculo.
  - Línea de contexto como etiqueta en ocre.
  - Perfil con curva suave, cumbre con etiqueta flotante y línea guía.
  - Ritmo y duración en una tarjeta.
  - Botones lado a lado en una barra fija.
  - En la lista, miniatura con fondo de mapa y divisores con sangría.

  Versión 3 (2026-11-21, a pedido del usuario, "con sombras"): sección [Resumen y bitácora (spec 014)](https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX?node-id=80-6835). Parte de la versión 2, con estos cambios:
  - El perfil va en una tarjeta flotante redondeada.
  - Las métricas, el recorrido, la etiqueta de la cumbre y las listas de cada mes llevan sombra baja.
  - Las barras de acciones y de pestañas llevan una sombra hacia arriba en lugar del borde.

  Agrega a "SendaBC — Diseño" la variable `Color/shadow` (claro: negro cálido al 12 %; oscuro: negro al 50 %) y los estilos de efecto `Sombra/baja`, `Sombra/media` y `Sombra/barra`. **Elegida por el usuario (2026-11-21).** La spec (RN-11, CA-22) y el plan (D8, "Tema y contraste") se actualizaron. Las 12 variantes, en claro y oscuro (24 marcos), están en la sección [Resumen y bitácora (spec 014)](https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX?node-id=80-6835) de la página Pantallas. Se borraron la versión 1 y la versión 2. Las variantes sin perfil y sin recorrido muestran la subida y la bajada en una tarjeta con sombra. Cuando no se puede publicar, la barra pone el motivo arriba de "Listo".

  "Fila de bitácora" se actualizó, así que también cambia en la versión 1. Al aprobarse la versión 2, se pasan a ella las demás variantes y se borra la versión 1. Al clonar a modo oscuro, Figma perdió la opacidad de los rellenos con variable y hubo que volver a aplicarla; hay que revisarlo en cada copia.
- [x] T2 — Compartir el enlace y las capturas, y anotar la aprobación del usuario en el historial de la spec. **Detiene T11 y T12.** (CA-21)

  Hecho (2026-11-21): el usuario aprobó la versión 3. En el mismo mensaje pidió aplicar el estilo a las demás pantallas; la spec se amplió (HU-8, CA-25 a CA-29), y el plan y las tareas de la ampliación se escriben cuando se apruebe.

  Avance de la ampliación en Figma (2026-11-21), pendiente de aprobación (CA-27):
  - **Componentes con sombra:** `Tarjeta`, `Barra de pestañas` y `Barra de empezar` cambian el borde por sombra. Además tienen sombra `Fila de actividad`, `Tarjeta de seguridad`, `Contacto`, `Tarjeta de actividad reciente`, `Tarjeta de ruta cercana` y `Aviso`. `Botón de vista` y los dos botones flotantes usan `Sombra/media`. `Fila de preparación` lleva el ícono en un círculo con tinte.
  - **Pantallas:** las tarjetas y barras inferiores dibujadas directamente reciben la sombra que les toca (RN-13). Mis rutas, Mis favoritas y la lista "Cuenta" del perfil pasan a una tarjeta agrupada con divisores.
  - **Sin tocar:** el resumen, Mis actividades y la grabación viejos de la sección "Actividad" (P8), la página "Prototipo" (P7), y Mapas sin conexión, que aún no tiene diseño en Figma.

## Fase B — Lógica pura

- [x] T3 — `lib/metrics/profile.ts`: `activityProfile` con la distancia acumulada de `createDistanceAccumulator` y la altitud GPS de los puntos precisos o la del barómetro, ubicada por hora y anclada con la mediana del GPS (D2). Agregar el suavizado de `SMOOTHING_WINDOW`, la cumbre, el mínimo de RN-6 (`null` si no se alcanza) y el muestreo a 200 pares. Si la fuente es barómetro pero no hay lecturas, se usa GPS (D3). Pruebas en `profile.test.ts`: GPS; barómetro con ancla; barómetro sin altitudes GPS; barómetro sin lecturas; cumbre conocida; pico aislado; menos de 10 altitudes; menos de 200 m. (CA-4, CA-5, CA-6, CA-7)

  Hecho (2026-11-21): `activityProfile` devuelve el perfil, la cumbre y la fuente que se usó. Las constantes `MIN_PROFILE_READINGS`, `MIN_PROFILE_DISTANCE_M` y `MAX_PROFILE_POINTS` se exportan. Solo cuentan los puntos precisos, para la distancia y para la altitud GPS. Con altitud relativa (iOS) también se ancla a la mediana del GPS. 12 pruebas en `profile.test.ts`, que agregan a la lista del plan la distancia con ruido, el ancla con altitud relativa, la actividad sin puntos y el muestreo. El frontend pasa 848 pruebas y `tsc` no marca errores.
- [x] T4 — `lib/activity/context.ts`: `contextLine` con las tres reglas de RN-3 en orden, los textos por tipo y los meses en tablas propias (D7). Pruebas en `context.test.ts`: primera de cada tipo; la más larga del mes; la de más subida; sin otra del mismo tipo en el mes; empate (gana la más antigua); prioridad entre reglas; actividad de otro tipo que no cuenta; mes en hora local. (CA-2, CA-3)

  Hecho (2026-11-21): `contextLine(activity, all)` y `localMonthKey`. La firma no lleva `now`, que el plan mencionaba pero no hace falta. Los textos por tipo son "caminata", "carrera" y "salida en bici", y los meses van en `MONTH_NAMES`. Las actividades sin métricas calculadas no cuentan para comparar. 13 pruebas en `context.test.ts`, que pasan también con `TZ=UTC` y `TZ=America/Tijuana`. El ejemplo de la regla 3 en la spec decía "Tu salida con más subida"; se corrigió a "Tu caminata con más subida", que es lo que muestra la app.
- [x] T5 — `lib/activity/months.ts`: `groupByMonth` y `monthTotalsText`. Pruebas en `months.test.ts`: orden de meses y dentro del mes; título con año si no es el actual; conteo y distancia; "1 actividad"; actividad a las 23:30 del último día del mes en hora local. (CA-13, CA-14, CA-15)

  Hecho (2026-11-21): `groupByMonth` es genérico (`T` con `startedAt` y `distanceMeters`) y ordena dentro de cada mes por hora de inicio, sin depender del orden de entrada. Usa `localMonthKey` y `MONTH_NAMES` de `context.ts`. Una actividad sin distancia calculada cuenta en el mes, pero no suma distancia. `monthTotalsText` usa `formatDistance`, igual que Inicio, y dice "0 km" sin distancia. 8 pruebas en `months.test.ts`, que pasan con la zona horaria local, `UTC` y `America/Tijuana`. El frontend pasa 869 pruebas y `tsc` no marca errores.
- [x] T6 — Agregar el token `shadow` (claro y oscuro) a `colors.ts`. Mover las sombras a `lib/theme/shadows.ts` con `makeShadows(colors)` y tres niveles (`low`, `medium` y `bar`), armados por modo en `index.ts` (D8, D11, RN-11). Borrar `floating`: sus siete usos pasan a `medium`, salvo `Notice`, que pasa a `low`. Pruebas en `shadows.test.ts`: los tres niveles existen en los dos temas y usan el `colors.shadow` de su modo. Revisar los pares de color nuevos del plan ("Tema y contraste") en `CONTRAST_PAIRS` y en la tabla de contraste de Figma. Agregar los que falten a las dos, para que `contrast.test.ts` siga pasando. (CA-22, CA-23)

  Avance (2026-11-21):
  - **Hecho.** `colors.shadow` (claro `rgba(43, 41, 33, 0.12)`, oscuro `rgba(0, 0, 0, 0.5)`), `lib/theme/shadows.ts` con `makeShadows` y `SHADOW_LAYERS` (las mismas capas que Figma), y `lightTheme.shadows` y `darkTheme.shadows`. Se borró `floating`: seis usos pasaron a `medium` y `Notice` a `low`. Hay 4 pruebas en `shadows.test.ts`. El frontend pasa 873 pruebas y `tsc` no marca errores.
  - **Resuelto con el usuario (2026-11-21).** La etiqueta de la línea de contexto del diseño aprobado no cumple AA en modo claro. Es texto `secondaryText` de 12 px sobre `background` con 18 % de `secondary`, y mide 3.87:1 contra 4.5:1 (en oscuro, 5.64:1). Se propuso al usuario cambiar el texto a `text` (9.91:1), dejar la estrella en ocre y agregar el par "text / background + 18 % secondary" a `CONTRAST_PAIRS` y a la tabla de Figma. El ícono en círculo con tinte (14 % de `primary`) cumple: 10.02:1 en claro y 11.02:1 en oscuro.
  - **Hecho.** El usuario aprobó la propuesta. En Figma, el texto de la etiqueta pasó a `text` en las 8 pantallas de Resumen que la muestran, y la tabla de contraste tiene la fila "text / background + 18 % secondary" (9.91:1 en claro y 10.18:1 en oscuro). El par está también en `CONTRAST_PAIRS` y en `FIGMA_TABLE`. El frontend pasa 875 pruebas.

## Fase C — Hooks y componentes

- [x] T7 — `activitySummary.hook.ts`: leer puntos y lecturas del barómetro, y devolver `profile`, `path` y `context` (este último con `listFinishedActivities`). Calcularlos después de mostrar la actividad (plan, D1). (CA-2, CA-4, CA-10, CA-19)

  Hecho (2026-11-21): `useActivitySummary(localId, { details: true })` devuelve además `details` (`profile`, `path` y `context`), o `null` mientras se calculan. Los detalles se piden con una opción porque Publicar como ruta usa el mismo hook y no los necesita. Se calculan en un segundo efecto, cuando la actividad ya está en pantalla. Si fallan, el resumen queda sin perfil, recorrido ni línea, pero con sus cifras. Es un hook de React Native, así que no tiene prueba de Vitest: lo verifican M1 a M3 y M6. `tsc` no marca errores.
- [x] T8 — `useTrackPath.ts` (nuevo), con memoria de 100 recorridos que se vacía al recuperar actividades (D4). En `activityHistory.hook.ts`, agregar `sections` con `groupByMonth`. (CA-13, CA-16, CA-20)

  Hecho (2026-11-21): `useTrackPath(localId)` lee los puntos solo cuando la fila se monta y devuelve `null` mientras carga o si no hay recorrido. La memoria guarda los últimos 100 recorridos por id local, incluidos los vacíos, para no volver a leerlos. `clearTrackPathCache()` la vacía, y el hook del historial la llama cuando la sincronización cambia actividades. `useActivityHistory` devuelve además `sections`. `tsc` no marca errores; la verificación es manual (M5 y M7).
- [x] T9 — `components/activity/TerrainProfile.tsx`: la cresta en `Svg` sobre las columnas de `perfilParaGrafica`, la base como `View` con subida y bajada (D5), la cumbre con su etiqueta y la descripción accesible. (CA-4, CA-5, CA-23, CA-24)

  Hecho (2026-11-21): tarjeta `surface` con sombra `medium`, como la versión 3. Detalles:
  - La cresta une las columnas de `perfilParaGrafica` con curvas cuadráticas por los puntos medios. La columna más baja conserva el 12 % del alto, para que la montaña siempre tenga cuerpo.
  - La cumbre es un círculo `secondary` con borde `surface`, con una línea guía punteada en `onPrimary` al 45 % y la etiqueta flotante con sombra `low`, que no se sale de la tarjeta.
  - Las etiquetas "Subida" y "Bajada" van en `onPrimary` al 100 %, no al 80 % como en Figma, para no bajar del contraste AA en texto de 12 px. La altitud sale con `formatElevation` ("1412 m aprox."), sin el espacio de miles de Figma.
  - `tsc` no marca errores. La verificación es manual (M1, M3, M8 y M9).
- [x] T10 — `components/activity/ActivityLogRow.tsx`: miniatura de 56 × 40 o el ícono del deporte, tipo, fecha, `SyncBadge` solo si no está sincronizada, distancia y duración, con nombre accesible. (CA-16, CA-17, CA-23)

  Hecho (2026-11-21): la miniatura mide 64 × 48, como el componente aprobado en Figma (versión 3), no 56 × 40 como decía la tarea. Sin recorrido, o mientras se lee, la fila muestra el ícono del deporte en `primary` sobre un recuadro con 12 % de `primary`. La fila no tiene fondo propio, porque va dentro de `GroupedList` (T18). Su nombre accesible es "Senderismo, 28 oct 2026, 7:15, 8.31 km, 2:14:05" y agrega el estado solo si no está sincronizada. `tsc` no marca errores. La verificación es manual (M3, M5 y M8).

## Fase D — Pantallas (después de T2)

- [x] T11 — Reescribir `activitySummaryPage.tsx` en el orden de Figma:
  1. Tipo, fecha y estado.
  2. Distancia de 64 pt y la línea de contexto.
  3. `TerrainProfile` o, sin perfil, las cifras.
  4. Duración y ritmo o velocidad.
  5. Fuente de la elevación y puntos.
  6. Miniatura de 328 × 128, si hay recorrido.
  7. `PublishSection` y "Listo", sin cambios.

  La carga y "No se encontró la actividad" no cambian. (CA-1 a CA-12, CA-19, CA-22, CA-23, CA-24)

  Hecho (2026-11-21): sigue la versión 3 de Figma.
  - **Encabezado de la actividad:** `IconBadge` del tipo, tipo y fecha, y `SyncBadge`.
  - **Distancia y logro:** la distancia con `typography.metricHero`; la unidad baja de renglón con letra grande. Debajo, la etiqueta de logro (estrella ocre y texto en `text`).
  - **Perfil:** mientras se calcula, el lugar del perfil queda reservado (228 dp). Sin perfil, la subida y la bajada van con `Metric` en una tarjeta con sombra baja.
  - **Tarjeta de ritmo o velocidad y duración**, con la fuente de la elevación y los puntos debajo.
  - **Recorrido:** la miniatura de 128 dp de alto, a todo el ancho.
  - **Barra de abajo:** `BottomBar` con "Publicar como ruta" y "Listo" lado a lado. Si solo hay un motivo para no publicar, van uno debajo del otro.

  "No se encontró la actividad" también usa `BottomBar`. La lógica de publicar no cambió; pasó de un componente a `usePublishAction`.

  **Token nuevo `metricHero` (64/68, negrita, cifras de ancho fijo):** la prueba de valores sueltos de la 009 (CA-10) no deja poner `fontSize: 64` en una pantalla, como proponía el plan. Por eso se agregó a `lib/theme/typography.ts`, y en Figma como estilo de texto "metricHero", aplicado a la distancia de los 14 resúmenes. Es la misma familia de letra; solo agrega un tamaño a la escala.

  El frontend pasa 875 pruebas y `tsc` no marca errores. La verificación en pantalla es manual (M1 a M4, M6, M8 y M9).
- [x] T12 — `activityHistoryPage.tsx` con una `FlatList` de meses (ver la nota de T18): encabezado de mes con su total, como encabezado accesible, y las filas de cada mes en `GroupedList` (T18). Mantener `RefreshControl`, los avisos, la lista vacía y la navegación al resumen. (CA-13, CA-14, CA-16, CA-17, CA-18, CA-19, CA-22, CA-23, CA-24)

  Hecho (2026-11-21): una `FlatList` con un elemento por mes. Cada mes tiene un encabezado accesible ("Noviembre: 3 actividades, 24.60 km") y una `GroupedList` de `ActivityLogRow`, con divisores que empiezan a 92 dp, después de la miniatura. La lista monta pocos meses a la vez (`initialNumToRender` 2, `windowSize` 5). Con letra grande, el total del mes baja de renglón. Las filas ya no tienen la animación de `Appear`, que antes iba fila por fila. `RefreshControl`, los avisos, la lista vacía, la ayuda del pie y la navegación al resumen no cambian. El frontend pasa 875 pruebas y `tsc` no marca errores. La verificación es manual (M5 a M9).

## Fase E — Figma de la ampliación

- [x] T16 — En "SendaBC — Diseño", diseñar con el estilo nuevo:
  - **Mapas sin conexión** y **Elegir zona** (spec 011), en claro y oscuro, con sus estados: con zonas, vacía, descargando y con error.
  - Las subpantallas de la cuenta (cambiar correo, cambiar contraseña y borrar cuenta), que hoy solo existen en el código.

  Usar los mismos textos y el mismo comportamiento que tienen hoy (CA-26). (CA-25, CA-27)

  Hecho (2026-11-21): sección [Mapas sin conexión y cuenta (spec 014)](https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX?node-id=90-6237) en la página Pantallas. Son 12 marcos por modo (24 en total):
  - **Mapas sin conexión:** con zonas (lista, descargando e incompleta), vacía, cargando y error.
  - **Descargar zona:** lista para descargar, sin conexión, zona demasiado grande y 10 zonas.
  - **Cuenta:** cambiar correo, cambiar contraseña, borrar cuenta y cambiar correo sin conexión.

  Notas:
  - Los textos salen del código: `ZONES_LIST_MESSAGES`, `ZONE_MESSAGES`, `QUE_SE_BORRA`, los avisos de borrado y el mensaje de sin conexión de `lib/account/api.ts`.
  - Cada zona es una tarjeta con sombra baja, porque tiene acciones propias (RN-13). El marco de Descargar zona lleva sombra media, porque flota sobre el mapa.
  - El mapa es la ilustración `Mapa (referencia)`: muestra rutas y la ubicación, que la pantalla real no muestra, y no tiene variante oscura, como en Rutas.
- [x] T17 — Compartir el enlace y las capturas de todas las secciones de la página Pantallas, y anotar la aprobación del usuario en el historial de la spec. **Detiene T19 a T23.** (CA-27)

  Hecho (2026-11-21): el usuario aprobó el diseño de todas las pantallas de la página Pantallas, con el estilo de sombras. Ya se pueden programar T19 a T23.

## Fase F — Estilo en la app

- [x] T18 — Piezas compartidas (D9, D10):
  - `components/ui/BottomBar.tsx`: fondo `surface`, padding del sistema, sombra `bar` y área segura inferior.
  - `components/ui/GroupedList.tsx`: tarjeta `surface` con radio `lg` y sombra `low`, con divisores con sangría (prop `inset`).
  - `components/ui/IconBadge.tsx`: el ícono dentro de un círculo, con su color al 14 % como tinte.

  Sin pantallas todavía, salvo las de la 014 (T11 y T12). (CA-25, CA-29)

  Hecho (2026-11-21):
  - `BottomBar` acepta `direction` (`column` o `row`). No suma el área segura de abajo, porque el `SafeAreaView` de `App.tsx` ya la da.
  - `GroupedList` pone divisores de 1 dp en `border` al 22 %, como en Figma, con margen izquierdo `inset`; sin `inset`, el padding de la fila.
  - `IconBadge` acepta `name`, `color` y `size`; el ícono mide el 55 % del círculo.

  `tsc` no marca errores. **Ajuste para T12:** las filas de una `SectionList` se dibujan por separado y no pueden quedar dentro de un `GroupedList`. Por eso T12 usa una `FlatList` con un elemento por mes, y cada elemento es su `GroupedList` con sus filas. La virtualización queda por mes: `initialNumToRender` y `windowSize` bajos, y `useTrackPath` sigue leyendo solo las filas montadas. CA-20 lo mide en M7.
- [ ] T19 — Componentes existentes, según la tabla del plan:
  - `Card`: sin borde.
  - `TabBar`: sin `borderTop`, con sombra `bar`.
  - `ActivityCard`, `RouteCard`, `SafetyCard` y la tarjeta de contacto: sombra `low`.
  - `PrepRow`: ícono con `IconBadge`.
  - `PopularRouteRow`: dentro de `GroupedList`.

  Comprobar en modo claro que cada tarjeta sin borde se sigue distinguiendo del fondo. La que no, conserva su borde y se anota. (CA-25, CA-28)
- [ ] T20 — `BottomBar` en lugar de `styles.actions` con `borderTopWidth` en:
  - activityPage, activitySummaryPage, routeDetailPage, publishRoutePage, editRoutePage y profilePage;
  - changeEmailPage, changePasswordPage y deleteAccountPage;
  - la barra de "Empezar actividad" de mainPage.

  Los botones y su lógica no cambian. (CA-25, CA-26)
- [ ] T21 — `GroupedList` en myRoutesPage, favoritesPage, la lista "Cuenta" de profilePage, y Populares y Listo para salir de mainPage. (CA-25, CA-26, CA-29)
- [ ] T22 — exploreRoutesPage (tarjeta de la ruta seleccionada y "Buscar en esta zona" con sombra `medium`) y emergencyContactsPage (tarjetas con sombra `low`), según Figma. (CA-25, CA-26)
- [ ] T23 — offlineZonesPage y pickZonePage según el diseño de T16. (CA-25, CA-26)

## Cierre

- [ ] T13 — Datos de prueba para CA-20: `backend/prisma/seed/actividades-ejemplo.ts`, con `--quitar`, como el de rutas. Crea 200 actividades con puntos, de varios tipos y meses, para una cuenta de prueba. Se recuperan en el teléfono con la sincronización (spec 005), lo que de paso prueba RN-10. Agregar `seed:actividades` y `seed:actividades:quitar` a `package.json`. Solo es herramienta de prueba: no cambia endpoints ni el esquema. (CA-20)
- [ ] T14 — Development build en el S9+ (y el emulador para lo que lo necesite). Correr M1 a M12 y anotar los resultados abajo.
- [ ] T15 — Si D1 o D4 no alcanzan sus límites en el S9+, actualizar el plan antes de cambiar el código. Cerrar la spec, actualizar su estado y `specs/roadmap.md`.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | M1, M2 | Manual | Pendiente |
| CA-2 | `context.test.ts` (cumplido 2026-11-21); M1 | Automatizada + manual | Pendiente |
| CA-3 | `context.test.ts` (cumplido 2026-11-21); M2 | Automatizada + manual | Pendiente |
| CA-4 | `profile.test.ts` › GPS y barómetro; M1 | Automatizada + manual | Pendiente |
| CA-5 | `profile.test.ts` › cumbre; M1 | Automatizada + manual | Pendiente |
| CA-6 | `profile.test.ts` › cumbre conocida y pico aislado | Automatizada | Cumplido (2026-11-21) |
| CA-7 | `profile.test.ts` › mínimo; M3 | Automatizada + manual | Pendiente |
| CA-8 | M1, M2 | Manual | Pendiente |
| CA-9 | M1, M2 | Manual | Pendiente |
| CA-10 | M1, M6 | Manual | Pendiente |
| CA-11 | M3 | Manual | Pendiente |
| CA-12 | M4 | Manual | Pendiente |
| CA-13 | `months.test.ts` › orden; M5 | Automatizada + manual | Pendiente |
| CA-14 | `months.test.ts` › títulos y totales; M5 | Automatizada + manual | Pendiente |
| CA-15 | `months.test.ts` › hora local y totales | Automatizada | Cumplido (2026-11-21) |
| CA-16 | M5, M3 | Manual | Pendiente |
| CA-17 | M5 | Manual | Pendiente |
| CA-18 | M5 | Manual | Pendiente |
| CA-19 | M6 | Manual | Pendiente |
| CA-20 | M7 | Manual | Pendiente |
| CA-21 | T2: aprobación anotada en el historial de la spec | Manual | Cumplido (2026-11-21) |
| CA-22 | M1, M5, M8 (comparación con Figma en los dos modos); `contrast.test.ts` | Automatizada + manual | Pendiente |
| CA-23 | M8; `contrast.test.ts` | Automatizada + manual | Pendiente |
| CA-24 | M9 | Manual | Pendiente |
| CA-25 | `shadows.test.ts`; M10 | Automatizada + manual | Pendiente |
| CA-26 | M11 | Manual | Pendiente |
| CA-27 | T17: aprobación anotada en el historial de la spec | Manual | Cumplido (2026-11-21) |
| CA-28 | `contrast.test.ts`; M10 | Automatizada + manual | Pendiente |
| CA-29 | M12 | Manual | Pendiente |

Todos los CA de la spec están cubiertos por al menos una tarea y una forma de verificarse.

### Casos manuales

Salvo que se indique otra cosa: development build en el S9+ con el backend local. La cuenta de prueba tiene, en este teléfono:

- una caminata con barómetro de más de 3 km y con subida;
- otra caminata más corta en el mismo mes;
- una salida en bici;
- una actividad de menos de 200 m;
- una pendiente de subir y una que no se pudo subir;
- actividades en al menos dos meses, uno del año anterior.

**M1 — Resumen completo**
1. Grabar y detener una caminata con subida (o abrir la caminata con barómetro desde el historial).
2. Sin desplazarse, revisar la parte de arriba. Luego recorrer la pantalla completa.
3. Comparar con Figma en el mismo modo.
- **Esperado:** la distancia es la cifra más grande, con tipo, fecha, hora y estado, y está a la vista sin desplazarse. Debajo aparece la línea de contexto que corresponde (p. ej. "Tu caminata más larga de noviembre"). El perfil ocupa todo el ancho, con la cumbre marcada ("… m aprox.") y la subida y la bajada iguales a las cifras guardadas. Luego vienen la duración y el ritmo ("mm:ss /km"), "Elevación medida con barómetro" con el número de puntos, y la miniatura del recorrido. Coincide con Figma.

**M2 — Resumen de ciclismo y sin línea de contexto**
1. Abrir la caminata corta del mismo mes y la salida en bici.
2. Abrir una actividad con elevación de GPS.
- **Esperado:** (1) la caminata corta no tiene línea de contexto ni deja un hueco. La bici muestra la velocidad en km/h en lugar del ritmo y, si es la primera, dice "Tu primera salida en bici". (2) El perfil se ve y dice "Elevación estimada con GPS".

**M3 — Actividad sin perfil ni recorrido**
1. Abrir la actividad de menos de 200 m.
2. Abrir una actividad sin puntos válidos (p. ej. grabada en interiores) en el resumen y en la lista.
- **Esperado:** (1) en lugar del perfil, la subida y la bajada como cifras, sin gráfica vacía. (2) No aparece la miniatura ni un hueco en el resumen. En la lista, la fila muestra el ícono del deporte. Sin errores en ningún caso.

**M4 — Publicar y Listo**
1. Desde una grabación recién detenida de más de 1.5 km y sincronizada, tocar "Publicar como ruta" y volver.
2. Tocar "Listo".
3. Abrir desde el historial una actividad pendiente y otra de menos de 1.5 km.
- **Esperado:** (1) se abre el formulario de publicar, como hoy. (2) Se regresa a Inicio y atrás no vuelve al resumen. (3) Desde el historial no aparece "Listo". La pendiente explica que aún no se puede publicar y la corta, que una ruta debe medir al menos 1.5 km.

**M5 — Mis actividades por mes**
1. Abrir la pestaña Actividades.
2. Revisar los encabezados y sumar a mano las distancias de un mes.
3. Revisar las filas sincronizada, pendiente y no se pudo subir.
4. Tocar una actividad y volver. Deslizar hacia abajo con red.
5. Con una cuenta sin actividades, abrir la pestaña.
- **Esperado:** (1) meses del más reciente al más antiguo y, dentro de cada uno, de la más nueva a la más vieja. (2) Cada encabezado dice el mes (con año si no es el actual), el número de actividades y la suma de distancias, que coincide con la cuenta a mano. (3) Cada fila tiene miniatura, tipo, fecha, distancia y duración. Solo las filas pendiente y no se pudo subir tienen insignia. (4) Se abre el resumen y atrás regresa a la lista. Deslizar sincroniza como hoy. (5) Mensaje para empezar la primera. Coincide con Figma.

**M6 — Sin conexión**
1. Poner el teléfono en modo avión.
2. Abrir el resumen de M1 y la pestaña Actividades. Deslizar hacia abajo.
- **Esperado:** el resumen se ve completo, con la línea de contexto, el perfil y la cumbre. Las miniaturas muestran el recorrido; el fondo de mapa solo si ya se había visto. Mis actividades se agrupa igual. Al deslizar aparece el aviso de sin conexión.

**M7 — 200 actividades**
1. Con la cuenta de T13, abrir la app y esperar a que se recuperen las actividades.
2. Cerrar la app, abrirla de nuevo y tocar la pestaña Actividades, midiendo el tiempo hasta ver la lista.
3. Desplazarse rápido hasta el final y volver.
4. Abrir el resumen de la actividad más larga.
- **Esperado:** (2) la lista con sus encabezados aparece en menos de 1 s. (3) Sin saltos ni pausas visibles; las miniaturas aparecen al llegar a cada fila. (4) El resumen se abre como cualquier otro y el perfil no tarda más de 300 ms en aparecer (D1). Las actividades recuperadas tienen perfil y miniatura (RN-10).

**M8 — Lector de pantalla y modo claro y oscuro**
1. Con TalkBack, recorrer el resumen de M1 y Mis actividades.
2. Cambiar el modo del sistema y revisar las dos pantallas.
- **Esperado:** (1) el perfil se anuncia con la subida, la bajada y el punto más alto. La miniatura, con el tipo y la distancia. Cada mes se anuncia como encabezado con su total. Cada fila, con su tipo, fecha, distancia, duración y estado si no está sincronizada. El orden de lectura sigue el visual. (2) Las dos pantallas coinciden con Figma en ambos modos y el texto sobre el perfil se lee bien.

**M9 — Letra grande**
1. Poner el tamaño de letra al máximo y abrir la app de nuevo.
2. Abrir el resumen de M1 y la pestaña Actividades.
- **Esperado:** ningún texto se corta ni se encima. La unidad de la distancia baja a otra línea si no cabe. La base del perfil crece para que quepan la subida y la bajada. La etiqueta de la cumbre no se sale de la pantalla. Los encabezados de mes y las filas crecen sin recortes.

**M10 — Estilo en todas las pantallas**
1. En modo claro, recorrer cada pantalla de RN-12:
   - bienvenida, inicio de sesión, registro, perfil y sus subpantallas;
   - Inicio;
   - grabación antes de iniciar, grabando, con alerta y sin permiso, y "¿Estás bien?";
   - Explorar, detalle, publicar, editar, Mis rutas y Mis favoritas;
   - Seguridad;
   - Mapas sin conexión y Elegir zona.
2. Compararlas con Figma.
3. Repetir en modo oscuro.
4. Tomar una captura en escala de grises de Inicio, Mis rutas y Seguridad en modo claro.
- **Esperado:** (1 a 3) cada pantalla coincide con Figma. Las tarjetas y listas agrupadas llevan sombra baja; lo que flota sobre el mapa, sombra media; las barras fijas de abajo, sombra hacia arriba y sin borde. Botones, campos, chips e insignias van sin sombra. En oscuro, la sombra se nota. (4) Cada tarjeta se distingue del fondo por su color, sin depender de la sombra.

**M11 — El comportamiento no cambia**
1. Repetir los casos manuales de las specs originales:
   - 013: M1 a M9;
   - 006 y 007: Explorar, detalle, publicar, editar, Mis rutas y Mis favoritas;
   - 008: contactos;
   - 011: zonas sin conexión, perfil y sus subpantallas.
- **Esperado:** todos dan el mismo resultado que cuando se cerraron esas specs. Solo cambia el aspecto, no los textos, el orden ni la navegación.

**M12 — Desplazamiento y batería**
1. En el S9+, desplazarse rápido por Inicio, Mis rutas (con al menos 20 rutas), Mis favoritas y Seguridad.
2. Correr la prueba de batería de la grabación de la spec 011 con el mismo recorrido y la misma duración.
- **Esperado:** (1) sin saltos ni pausas visibles. (2) Dentro de los límites de la spec 011 (30 % en 3D y 15 % en 2D).

## Commits propuestos

Mínimo 3 en la semana (constitución 8.3):

1. `docs(014): spec, plan y tareas del resumen y la bitácora` — spec, plan, tareas y roadmap (ya escritos), más T2 al aprobarse Figma.
2. `feat(014): perfil, línea de contexto y meses de las actividades` — T3, T4, T5 y T6, con sus pruebas.
3. `feat(014): terreno y fila de bitácora` — T7 a T10.
4. `feat(014): resumen y Mis actividades rediseñados` — T11 y T12.
5. `chore(014): 200 actividades de ejemplo para pruebas` — T13.
6. `docs(014): diseño de la ampliación en Figma` — T16 y T17.
7. `feat(014): sombras por modo y piezas compartidas` — T6 (si no entró en el 2) y T18.
8. `feat(014): estilo con sombras en componentes y pantallas` — T19 a T23. Si sale muy grande, se parte por sección: Inicio, Rutas, Cuenta y Seguridad.
9. `test(014)` o `fix(014)` según los resultados de M1 a M12 (T14), y `docs(014): cierre de la spec` (T15).

## Pendientes conocidos

Ninguno por ahora.
