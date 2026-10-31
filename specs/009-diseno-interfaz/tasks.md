# 009 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de `frontend/lib/theme/` incluyen sus pruebas Vitest (constitución 6.1).

La fase B no empieza hasta que T7 esté hecha: la aprobación del prototipo queda en el historial de la spec (RN-7, CA-8).

## Antes de empezar (lo hace el usuario)

- Tener sesión de Figma conectada al MCP con la cuenta donde debe quedar el archivo. En T1 se confirma el plan de esa cuenta con `whoami` (plan, riesgo R1).

## Fase A — Prototipo en Figma

- [x] T1 — Crear el archivo **"SendaBC — Diseño"** con 3 páginas: Sistema de diseño, Pantallas y Prototipo. Confirmar el plan de la cuenta: si es Starter, el modo oscuro va como segunda colección `Color/Oscuro` (R1). Crear:
  - la colección **Color** con los tokens de la tabla "Paleta" del plan, con los mismos nombres y los valores claros de `colors.ts`, y su equivalente oscuro;
  - las colecciones **Espaciado** y **Radio**;
  - los estilos de texto de la escala tipográfica.

  (CA-1, CA-3)

  Hecho: [archivo](https://www.figma.com/design/ewpz0FqktgWwKh7IZUXUnX). Plan de la cuenta: estudiante (equivale a Professional), así que Color tiene los modos *Claro* y *Oscuro* en una sola colección. Color tiene 13 variables, Espaciado 8 (incluye `touchMin`) y Radio 4, cada una con alcance y sintaxis de código `theme.…`. Hay 7 estilos de texto en Atkinson Hyperlegible Next. `border` queda provisional (`#857F72` / `#807C72`, ≥ 3.3:1 sobre `background` y ≥ 3.2:1 sobre `surface` en los dos modos) hasta T3.
- [x] T2 — Identidad en la página Sistema de diseño:
  - logo en tres versiones (fondo claro, fondo oscuro y cuadrada para ícono);
  - tipografía Atkinson Hyperlegible Next con su justificación y licencia (OFL);
  - comprobar si tiene cifras de ancho fijo; si no, cambiar a Inter y anotarlo en el plan (R3).

  (CA-4)

  Hecho: hoja "Identidad" y componentes en "Marca — componentes" (`Logo/Símbolo`, `Logo/Horizontal` y `Logo/Ícono`). Los colores del logo son variables, así que el mismo componente sirve en claro y en oscuro. Cifras: en Figma, las de Atkinson Hyperlegible Next son proporcionales por defecto. El muestrario de la familia muestra una variante tabular, pero en Figma no se puede comprobar. Se mantiene la fuente; si en el teléfono `tabular-nums` no funciona (T10, M3), `metric` pasa a Atkinson Hyperlegible Mono, cuyas cifras miden igual. Eso reemplaza el cambio a Inter.
- [x] T3 — Componentes con variantes de estado, en modo claro y oscuro:
  - botón primario, secundario, de texto y de peligro, cada uno normal, presionado y deshabilitado;
  - campo de texto normal, con foco y con error;
  - tarjeta, insignia de sincronización (sincronizada, pendiente, rechazada), aviso de estado, encabezado de pantalla y barra de 4 pestañas.

  Además, una tabla de contraste con cada par texto/fondo usado y su razón medida. Fijar el valor de `border`. (CA-2, CA-3)

  Hecho: en "Componentes — principales" están `Botón` (4 estilos × 3 estados), `Campo de texto` (3), `Tarjeta`, `Insignia de sincronización` (3), `Aviso` (Info, Sin conexión, Error, Alerta), `Encabezado` (Raíz, Secundaria), `Botón de ícono`, `Pestaña` (2) y `Barra de pestañas` (4 variantes, una por pestaña activa), más 15 íconos de Material Design Icons (`@mdi/svg` 7.4.47). La hoja "Componentes" muestra todo en claro y en oscuro, con la tabla de contraste: 19 pares, todos cumplen. `border` queda en `#857F72` / `#807C72`. Nota: Figma ignora la opacidad de un relleno ligado a variable, así que las capas de "presionado" y el indicador de pestaña son capas con opacidad propia; en código es un color con alfa.

  Cambio pedido por el usuario (2026-10-30): `Aviso` pasa a estilo de aviso flotante, a partir de una imagen de referencia. Lleva fondo `surface` con un tinte del color del tipo al 10 %, el ícono dentro de un círculo, el título en Bold con el color del tipo, la descripción en `text`, la sombra `Sombra/Flotante` y la opción "Con cerrar" (botón de 48 dp). "Alerta" conserva el fondo `alert` sólido, porque `alert` sobre el tinte claro da 3.98:1 (RN-4). La tabla de contraste suma 5 pares sobre el tinte, y todos cumplen (el más justo es `data` en claro, con 4.62:1).
- [x] T4 — Página Pantallas, grupos **cuenta** y **actividad**: bienvenida, inicio de sesión, registro, inicio, grabación, resumen e historial. Cada una en 360 × 800, en claro y en oscuro, con los estados que define su spec: carga, vacío, error, sin conexión y pendiente de sincronizar. En la grabación, métricas en `metric` y controles abajo. (CA-5, CA-7)

  Hecho: secciones "Cuenta" y "Actividad" en la página Pantallas, con 18 marcos en claro (pantallas y estados) y 8 copias en oscuro (Bienvenida, Inicio de sesión, Registro, Inicio, Grabación antes de iniciar y grabando, Resumen y Mis actividades).
  - **Estados:** inicio de sesión con error; registro con error; inicio con error de perfil; grabación antes de iniciar, grabando, con alerta activa y sin permiso de ubicación; resumen sincronizado, pendiente de subir y no encontrado; mis actividades con lista, sin conexión, vacía y cargando.
  - **Componentes nuevos para estas pantallas:** `Chip`, `Métrica` (Grande y Mediana), `Fila de actividad`, `Tarjeta de seguridad` (Activa y Sin contactos) y `Cargando`, más los íconos run, bike y logout.
  - **Textos visibles que cambian en T14 y T15** (solo redacción, sin cambiar comportamiento):
    - "Inicio de Sesión" e "Iniciar Sesión" pasan a "Iniciar sesión".
    - "¿Aun no tienes…" pasa a "¿Aún no tienes…".
    - En la bienvenida, "Registrarse" pasa a "Crear cuenta".
    - El título de la grabación pasa a "Nueva actividad" antes de iniciar y a "Grabando · <tipo>" al grabar.
    - El vacío de Mis actividades dice "desde la pestaña Inicio" en lugar de "en la pantalla principal" (RN-2).
  - **Inicio:** una tarjeta "Nueva actividad" con el botón "Empezar" y el resumen de seguridad, como dice el plan.
  - **Mensaje "No se encontró la actividad":** queda igual. La descripción "Puede que se haya borrado de este teléfono." es texto nuevo; se puede quitar al implementar si no se quiere agregar.
- [x] T5 — Página Pantallas, grupos **rutas** y **seguridad**: explorar rutas, detalle, publicar, editar, mis rutas, favoritas, contactos de emergencia y el aviso "¿Estás bien?", en los dos modos y con sus estados. (CA-5, CA-7)

  Hecho: secciones "Rutas" y "Seguridad" en la página Pantallas, con 28 marcos en claro y 7 copias en oscuro (Explorar, Detalle, Publicar, Mis rutas, Mis favoritas, Seguridad y "¿Estás bien?").
  - **Explorar rutas:** ruta seleccionada, mapa movido ("Buscar en esta zona"), buscando, sin rutas y sin conexión.
  - **Detalle de ruta:** de otra persona, ya favorita, tuya (Editar, Archivar y Borrar), no disponible y sin conexión.
  - **Publicar:** normal y con error. **Editar:** una pantalla.
  - **Mis rutas:** lista, vacía y sin conexión. **Mis favoritas:** lista (con una ruta "Ya no disponible") y vacía.
  - **Seguridad:** lista (Activo y Pendiente), sin contactos con el formulario abierto, sin conexión (con "No recibe mensajes") y error.
  - **"¿Estás bien?":** hoja inferior sobre la grabación. Tiene la cuenta regresiva grande en `alert` y "Estoy bien" de 64 dp, en la mitad inferior (CA-13).
  - **Componentes nuevos:** `Mapa (referencia)` (solo visual, colores fijos: el mapa no cambia de estilo), `Perfil de elevación` y `Contacto` (Activo, Pendiente y No recibe), más 11 íconos.
  - **Encabezado de "Rutas":** lleva dos botones de ícono, Mis favoritas (corazón) y Mis rutas, en lugar de la acción única de `Encabezado`.
  - **Textos que cambian en T16 y T17:**
    - El vacío de favoritas dice En "Rutas" en lugar de En "Explorar rutas" (RN-2).
    - Cada `Aviso` lleva un título corto nuevo ("Sin conexión", "Sin rutas cerca", "No se pudo publicar", etc.) y el mensaje actual va como descripción, sin cambiarlo.
    - Son textos de ayuda nuevos: "Hasta 40 caracteres." y "Hasta 200 caracteres." en el formulario de ruta, y "Así lo verás en la app y en los avisos." en el de contacto. Si no se quieren, se quitan.
- [x] T6 — Página Prototipo: conexiones de los flujos de CA-6, la barra de pestañas operativa y el punto de inicio en la bienvenida. (CA-6)

  Hecho: la página Prototipo tiene copias de las 18 pantallas que usan los flujos, en modo claro. Hay 46 zonas tocables transparentes (botones, volver, pestañas y filas) y 6 puntos de inicio:
  1. Registro e inicio de sesión (desde Bienvenida).
  2. Grabar una actividad.
  3. Explorar y guardar en favoritas.
  4. Publicar una ruta.
  5. Contactos de emergencia.
  6. ¿Estás bien?

  "¿Estás bien?" aparece sola a los 6 s de estar en "Grabando". Si al probarlo salta de inmediato, hay que subir el retraso en Figma: la API no aclara si la unidad son segundos o milisegundos. Comprobado leyendo las conexiones: desde Bienvenida se llega a las 18 pantallas (las 14 de la app y "¿Estás bien?", más las variantes de detalle y grabación). Las copias no se actualizan solas si se edita el marco original en Pantallas; sí se actualizan los componentes.
- [x] T7 — Pasar F1 y F2 contigo y compartir el enlace y las capturas. Con tu aprobación:
  - anotarla en el historial de la spec (con las diferencias que pidas);
  - exportar el logo a PNG @1x/@2x/@3x, claro y oscuro, a `frontend/assets/brand/`;
  - copiar a la tabla "Paleta" del plan los valores finales si cambiaron.

  (CA-8)

  Hecho: el usuario aprobó el prototipo el 2026-10-30, y la aprobación está en el historial de la spec. El logo está en `frontend/assets/brand/logo-{claro,oscuro}{,@2x,@3x}.png` (234 × 56 a 1x). La exportación del servidor de Figma no conserva la transparencia, así que cada PNG lleva de fondo el `background` de su modo (`#EDEAE1` y `#1A1B17`, comprobado). Como la bienvenida usa ese mismo fondo, se ve igual. Si se necesita sobre otro fondo, hay que exportarlo a mano desde Figma con fondo transparente. La paleta no cambió respecto al plan, salvo `border`, que ya está anotado.

## Fase B — App

- [x] T8 — Tokens en `frontend/lib/theme/`, con los valores aprobados en Figma:
  - `colors.ts`: `lightColors`, `darkColors` y `ColorTokens`; el alias `colors` se conserva;
  - `typography.ts`, `spacing.ts` (con radios y `touchMin`) e `index.ts` (`Theme`, `lightTheme`, `darkTheme`);
  - `contrast.ts`, con `contrastRatio` y `CONTRAST_PAIRS`;
  - `contrast.test.ts`: la fórmula contra valores conocidos (negro/blanco 21:1; `#5C6B49` sobre `#EDEAE1` 4.78:1) y que cada par cumpla su mínimo en los dos temas.

  (CA-1, CA-3)

  Hecho: `colors.ts` tiene los 13 tokens en `lightColors` y `darkColors`, con los mismos nombres y valores que la colección Color de Figma. El alias `colors` es el modo claro más `primaryDark`, que sigue ahí solo hasta rehacer `BgBtn` (T12). `index.ts` agrega `touchMin` a `Theme`, además de lo que pide el plan. Los nombres de familia de `typography.ts` (`AtkinsonHyperlegibleNext-Regular`, `-SemiBold`, `-Bold`) son provisionales: se ajustan en T10 a los archivos de fuente reales. `CONTRAST_PAIRS` son los 24 pares de la tabla de contraste de Figma, incluidos los 5 sobre el tinte del 10 % del `Aviso`. La prueba comprueba que cada par cumpla su mínimo en los dos temas y que su razón coincida con la de Figma (±0.05). La mezcla del tinte no se redondea a hex, porque Figma tampoco lo hace (redondeando, un par se desvía 0.07).
- [x] T9 — `frontend/lib/theme/hardcodedColors.test.ts`: recorre `pages/`, `components/` y `App.tsx` y falla con cualquier literal `#RGB`, `#RRGGBB` o `rgb(`. Lleva una lista temporal de archivos aún sin migrar (hoy 8), que cada tarea de pantallas va vaciando. (CA-10)

  Hecho: la prueba recorre los `.ts` y `.tsx` y también detecta `#RGBA`, `#RRGGBBAA` y `rgba(`. `PENDING_MIGRATION` tiene los 8 archivos de hoy: `App.tsx`, los 3 botones de `components/ui/buttons/`, `pages/auth/index.tsx`, `login.tsx`, `register.tsx` y `pages/main/mainPage.tsx`. Una segunda prueba falla si un archivo de la lista ya no tiene colores sueltos (o ya no existe), para obligar a quitarlo al migrarlo. CA-10 queda cubierto cuando la lista esté vacía (T18).
- [x] T10 — Dependencias y configuración. Primero leer la documentación de Expo SDK 57 de `expo-font`, `expo-system-ui` y `userInterfaceStyle` (`frontend/AGENTS.md`). Después:
  - `npx expo install @react-navigation/bottom-tabs expo-font @expo/vector-icons expo-system-ui`;
  - fuente en `frontend/assets/fonts/` y plugin `expo-font` en `app.json`;
  - `userInterfaceStyle: "automatic"`;
  - compilar un development build nuevo.

  (CA-11, CA-14)

  Hecho:
  - **Dependencias:** quedaron instaladas `@react-navigation/bottom-tabs` 7.21, `expo-font` 57.0.4, `@expo/vector-icons` 15.0.2 y `expo-system-ui` 57.0.4. `expo install` no puede editar `app.config.ts`, así que los plugins se agregaron a mano en `app.json`.
  - **Fuente:** Atkinson Hyperlegible Next 2.001 (Regular, SemiBold y Bold) está en `frontend/assets/fonts/`. Viene del paquete `@expo-google-fonts/atkinson-hyperlegible-next` 0.4.1, que no queda como dependencia. Cada archivo lleva su nombre PostScript, así que `fontFamily` es el mismo en Android y en iOS y coincide con `typography.ts`. La licencia (OFL 1.1) y el origen están en `assets/fonts/README.md`.
  - **Cifras tabulares:** los tres archivos traen la función `tnum` (R3 en el plan). Falta confirmarlo en el teléfono (M3).
  - **Modo del sistema:** `userInterfaceStyle` pasa de `light` a `automatic` y se agrega el plugin `expo-system-ui`. Comprobado en el proyecto nativo: `strings.xml` tiene `expo_system_ui_user_interface_style` = `automatic` y `MainActivity` incluye `uiMode` en `configChanges`.
  - **Build:** se regeneró con `npx expo prebuild --platform android --clean` y `npx expo run:android --no-bundler` (BUILD SUCCESSFUL), y quedó instalado en `Pixel_10_Pro` el 2026-10-30. Las tres fuentes están dentro del APK.
  - El cambio de modo en vivo se prueba en M2, cuando la app use el tema (T11).
- [x] T11 — `frontend/hooks/theme/useTheme.ts` con `useTheme()` y `useThemedStyles(makeStyles)`. En `App.tsx`:
  - tema de React Navigation construido con los tokens;
  - `SafeAreaView` y el `Gate` con colores del tema;
  - `StatusBar` con `style="auto"`.

  (CA-10, CA-11)

  Hecho:
  - **Hook:** `useTheme()` devuelve `lightTheme` o `darkTheme` según `useColorScheme()`. `useThemedStyles(makeStyles)` memoriza el resultado por tema; `makeStyles` ya devuelve `StyleSheet.create(...)`.
  - **`App.tsx`:**
    - `navigationTheme(theme)` arma el tema de React Navigation sobre `DefaultTheme` o `DarkTheme`. Colores: `primary`, `background`, `card` = `surface`, `text`, `border` y `notification` = `error`.
    - Las fuentes de React Navigation son Atkinson Hyperlegible Next, con `fontWeight` en normal porque cada archivo ya trae su peso.
    - El fondo del `SafeAreaView` cambia: antes era `primary` (franja verde arriba) y ahora es `background`. El `Gate` también usa `background` y `primary`.
    - `StatusBar` de `expo-status-bar` con `style="auto"`.
  - **Colores sueltos:** `App.tsx` ya no tiene ninguno y salió de `PENDING_MIGRATION` (quedan 7).
  - **Comprobado en el emulador (2026-10-30):** con `adb shell cmd uimode night yes/no` y la app abierta, las franjas de la barra de estado y de abajo cambian de color al instante, y los íconos de la barra de estado cambian a claro u oscuro. El pid de la app es el mismo antes y después, así que no se reinicia. Las pantallas siguen claras hasta migrarlas (T14–T17).
- [x] T12 — Componentes en `frontend/components/ui/`:
  - `PrimaryBtn`, `BgBtn` (secundario) y `TextBtn` con tokens, 48 dp de alto mínimo y variante `danger`;
  - `SyncBadge` con `secondaryText`;
  - los componentes nuevos que use el prototipo: `TextField`, `Card`, `ScreenHeader`, `Notice`, `IconButton` e `Icon` (estos dos con `accessibilityLabel` obligatorio cuando no llevan texto);
  - `components/brand/Logo.tsx`.

  (CA-9, CA-13, CA-14)

  Hecho (medidas tomadas de los componentes de Figma con `get_design_context`):
  - **Botones:** `buttons/BaseBtn.tsx` es el botón común. Mide 48 dp de alto y ancho mínimos, con relleno `xl`/`md`, radio `md` y etiqueta SemiBold 16/24.
    - Presionado: capa de `text` al 16 % en primario y peligro, y de `primary` al 12 % en secundario y de texto. Deshabilitado: opacidad del 40 %.
    - `PrimaryBtn` (con `variant="danger"`, en `error`), `BgBtn` (secundario: borde de 2 dp en `primary`, sin relleno) y `TextBtn` lo envuelven y conservan sus props. Los tres aceptan ahora `disabled`.
    - Llevan `accessibilityRole="button"` y `accessibilityState`.
    - Ojo en T14–T17: `TextBtn` pasa de unos 30 dp de alto a 48, y `BgBtn` ya no tiene fondo propio.
  - **`SyncBadge`:** ícono y texto (`cloud-check-outline`, `cloud-upload-outline`, `cloud-alert-outline`). Usa `secondaryText` para "pendiente", texto Caption SemiBold y borde de 1.5 dp en forma de píldora.
  - **`Icon`:** `MaterialCommunityIcons`, con el color como nombre de token. El tipo exige `accessibilityLabel` o `decorative`.
  - **`IconButton`:** botón de 48 × 48 con ícono de 24 y `accessibilityLabel` obligatorio en el tipo.
  - **`TextField`:** etiqueta, campo de 48 dp y mensaje de ayuda o de error.
    - Borde: 1 dp en `border` en estado normal, y 2 dp en `primary` con foco o en `error` con error. Al engrosar el borde se descuenta del relleno, así que el texto no se mueve.
    - El error lleva ícono y se anuncia (`accessibilityLiveRegion`).
  - **`Card`:** `surface` con borde y radio `lg`. Con `onPress` toda la tarjeta es tocable y lleva chevron. Acepta `children` para contenido propio.
  - **`ScreenHeader`:** de 64 dp. Raíz: título `headline` y `actions`. Secundaria (con `onBack`): botón volver y título `title`.
  - **`Notice`:** tipos `info`, `offline`, `error` y `alert`, con tinte del 10 %, ícono en círculo, título Bold y descripción.
    - `alert` va sobre `alert` sólido y no se puede cerrar. Con `onClose` lleva el botón cerrar de 48 dp.
    - Diferencia con Figma: sin botón cerrar, el relleno derecho es `lg` (16) en lugar de 4, para que el texto no toque el borde.
    - El ícono del círculo usa `surface`, que contrasta con el círculo en los dos modos.
  - **`components/brand/Logo.tsx`:** usa `logo-claro.png` u `logo-oscuro.png` según el modo, a 234 × 56.
  - **Tema:** se agregó `shadows.floating` a `Theme` (plan actualizado), porque la sombra lleva un color y los componentes no pueden tener literales (CA-10).
  - **Colores sueltos:** los 3 botones salieron de `PENDING_MIGRATION` (quedan 4 archivos).
  - **Comprobado en el emulador (2026-10-30)** con un catálogo temporal de todos los componentes (no commiteado), en claro y en oscuro: los colores, la fuente Atkinson, los íconos, la sombra del aviso y el logo de cada modo coinciden con Figma.
  - Los componentes de `components/safety/*` y `components/routes/*` se migran con su grupo de pantallas (T16 y T17).
- [x] T13 — Navegación:
  - `HomeTabs` (Inicio, Actividades, Rutas, Seguridad) anidado como `Home` en `RootStack`;
  - `EmergencyContactsPage` registrada también como `EmergencyContacts` en el stack;
  - `index.tsx:14` y `login.tsx:66` resetean a `Home`;
  - quitar de `mainPage.tsx` los botones que reemplazan las pestañas;
  - accesos a "Mis rutas" y "Favoritas" en el encabezado de `exploreRoutesPage.tsx`.

  (CA-6, CA-9, CA-15)

  Hecho:
  - **`HomeTabs`:** usa `createBottomTabNavigator` con la API estática, anidado en `RootStack` como `Home`. Tiene cuatro pestañas: `MainPage` (Inicio), `ActivityHistory` (Actividades), `ExploreRoutes` (Rutas) y `Safety` (Seguridad, con `EmergencyContactsPage`). `ActivityHistory` y `ExploreRoutes` salieron del stack.
  - **Barra de pestañas:** `components/navigation/TabBar.tsx`, como la de Figma. Mide 64 dp de alto, con fondo `surface` y borde superior en `border`. La pestaña activa lleva un indicador de 56 × 32 en `primary` al 16 % y la etiqueta en Bold `primary`.
    - Íconos: `home`/`home-outline`, `hiking`, `map-marker-path`/`map-outline` y `shield-check`/`shield-check-outline`.
    - Accesibilidad: `accessibilityRole="tab"` y `selected`.
  - **`EmergencyContacts`:** sigue en el stack, para que "Configurar" la abra encima de la grabación.
  - **Inicio de sesión:** `index.tsx` y `login.tsx` resetean a `Home`.
  - **`mainPage.tsx`:** quedan solo "Nueva actividad" y "Cerrar sesión". Lo demás está en las pestañas o en el encabezado de Rutas.
  - **Rutas:** `exploreRoutesPage.tsx` lleva un `ScreenHeader` "Rutas" encima del mapa, con dos `IconButton`: Mis favoritas (`heart-outline`) y Mis rutas (`map-marker-path`). El contenido anterior queda dentro de un contenedor nuevo, sin cambios; la sangría se arregla al rediseñar la pantalla (T16).
  - **Comprobado en el emulador (2026-10-30):**
    - Las cuatro pestañas cambian y marcan la activa.
    - Desde Rutas se abren Mis favoritas y Mis rutas, sin barra; el botón atrás regresa a Rutas.
    - Desde Actividades se abre el resumen, sin barra, y se vuelve a la lista.
  - **Sin comprobar:** "Configurar" desde la grabación. La cuenta de prueba ya tiene contactos activos, así que la tarjeta no muestra ese botón. Queda para M6.
  - Los pasos de navegación de los casos manuales de las specs 001 a 008 se actualizan en T19.
- [ ] T14 — Grupo **cuenta**: `pages/auth/index.tsx` (con `Logo`), `login.tsx`, `register.tsx` y `pages/main/mainPage.tsx` a tokens, componentes e íconos como en Figma. Sacarlos de la lista temporal de T9. (CA-9, CA-10, CA-14)
- [ ] T15 — Grupo **actividad**: `activityPage.tsx` (métricas con `metric` y `data`, "Puntos" en `bodySmall`, "Iniciar/Detener actividad" y "Pedir ayuda" en barra fija abajo), `activitySummaryPage.tsx` y `activityHistoryPage.tsx`. (CA-9, CA-10, CA-12, CA-13)
- [ ] T16 — Grupo **rutas**: `exploreRoutesPage`, `routeDetailPage`, `publishRoutePage`, `editRoutePage`, `myRoutesPage`, `favoritesPage` y `components/routes/*`. (CA-9, CA-10)
- [ ] T17 — Grupo **seguridad**: `emergencyContactsPage` y `components/safety/*`. `AreYouOkModal` y `RecordingSafety` con `alert` y `onAlert` y "Estoy bien" en la mitad inferior. (CA-9, CA-10, CA-13)
- [ ] T18 — Limpieza:
  - quitar el alias `colors` y `primaryDark`;
  - dejar vacía la lista temporal de T9;
  - `npm test` en verde.

  (CA-10)
- [ ] T19 — Actualizar los pasos de navegación ("desde la pantalla principal, tocar X" → "pestaña X") en los casos manuales de los `tasks.md` de las specs 001, 002, 005, 007 y 008, con nota en el historial de cada spec si cambia su texto. (CA-15)
- [ ] T20 — Casos M1 a M6 en el emulador. Anotar en este archivo las diferencias aceptadas (CA-9) y actualizar el estado de la spec y `specs/roadmap.md`. (CA-9, CA-11 a CA-15)

## Cobertura

Los 15 CA están cubiertos por al menos una tarea.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | Caso F1 (variables y estilos en Figma) + `contrast.test.ts` usa los mismos nombres de token | Manual + Automatizada | Verificado (2026-10-30) |
| CA-2 | Caso F1 | Manual | Verificado (2026-10-30) |
| CA-3 | `frontend/lib/theme/contrast.test.ts` › "cada par cumple su mínimo en claro y oscuro" + tabla de contraste en F1 | Automatizada | Verificado (2026-10-30): 24 pares cumplen en claro y oscuro |
| CA-4 | Caso F1 | Manual | Verificado (2026-10-30) |
| CA-5 | Caso F2 | Manual | Verificado (2026-10-30) |
| CA-6 | Caso F2 | Manual | Verificado (2026-10-30) |
| CA-7 | Caso F2 | Manual | Verificado (2026-10-30) |
| CA-8 | Entrada de aprobación en el historial de `spec.md` (T7) | Manual | Verificado (2026-10-30) |
| CA-9 | Caso manual M1 | Manual | Pendiente |
| CA-10 | `frontend/lib/theme/hardcodedColors.test.ts` › "sin colores sueltos en pantallas y componentes" | Automatizada | Prueba lista; quedan 8 archivos en `PENDING_MIGRATION` |
| CA-11 | Caso manual M2 | Manual | Pendiente |
| CA-12 | Caso manual M3 | Manual | Pendiente |
| CA-13 | Casos manuales M3 y M4 | Manual | Pendiente |
| CA-14 | Caso manual M5 | Manual | Pendiente |
| CA-15 | Caso manual M6 | Manual | Pendiente |

### Casos de revisión en Figma

**F1 — Sistema de diseño e identidad**
1. Abrir la página Sistema de diseño.
2. Comparar la colección Color con la tabla "Paleta" del plan: mismos nombres y valores claros iguales a `colors.ts`; cada token tiene valor oscuro.
3. Revisar estilos de texto (7), Espaciado (7) y Radio (4).
4. Revisar cada componente de CA-2 con todas sus variantes, en claro y en oscuro.
5. Revisar la tabla de contraste: ningún par por debajo de 4.5:1 (texto normal) o 3:1 (texto grande y gráficos).
6. Revisar el logo (3 versiones) y la ficha de tipografía (justificación y licencia).
- **Esperado:** no falta ningún elemento de CA-1, CA-2 y CA-4, y ningún par incumple CA-3.

**F2 — Pantallas y prototipo**
1. En la página Pantallas, contar los marcos: las 14 pantallas más "¿Estás bien?", cada uno en claro y en oscuro.
2. Revisar al lado de historial, rutas, mis rutas, favoritas, contactos y resumen sus estados de carga, vacío, error, sin conexión y pendiente de sincronizar, según su spec.
3. Abrir el prototipo en modo presentación desde la bienvenida y seguir cada flujo de CA-6.
4. Desde el inicio, llegar a cada una de las 14 pantallas.
- **Esperado:** los 6 flujos se completan sin salir del prototipo y todas las pantallas son alcanzables.

### Casos manuales en la app

**M1 — La app coincide con el prototipo**
1. Con el emulador en modo claro, recorrer las 14 pantallas y el aviso "¿Estás bien?", y comparar cada una con su marco de Figma.
2. Repetir en modo oscuro (`adb shell cmd uimode night yes`).
3. Con letra grande (`adb shell settings put system font_scale 1.3`), recorrerlas otra vez; al terminar, volver a `1.0`.
- **Esperado:** colores, tipografía, espaciado, componentes y navegación coinciden. Las diferencias quedan anotadas abajo como aceptadas, y con letra grande ningún texto se corta ni se encima.

**M2 — Cambio de modo en vivo**
1. Abrir la app en modo claro en el inicio.
2. Sin cerrarla, cambiar a modo oscuro (`adb shell cmd uimode night yes`).
3. Navegar a Actividades, Rutas, Seguridad y a una grabación sin iniciar.
4. Volver a modo claro (`night no`).
- **Esperado:** la app cambia de modo al instante, sin reiniciarse ni perder la pantalla actual, y todas las pantallas siguen el modo del sistema. La barra de estado se mantiene legible.

**M3 — Pantalla de grabación**
1. Iniciar una actividad y simular movimiento.
2. Sostener el teléfono (o la ventana del emulador a tamaño real) a la distancia de un brazo.
3. Revisar qué textos son los más grandes y dónde quedan "Detener actividad" y "Pedir ayuda".
4. Provocar el aviso "¿Estás bien?" (spec 008, caso M4) y revisar dónde queda "Estoy bien".
- **Esperado:** distancia, tiempo y elevación son los textos más grandes y se leen sin acercarse. Las cifras no saltan al cambiar. "Detener actividad", "Pedir ayuda" y "Estoy bien" quedan en la mitad inferior.

**M4 — Áreas de toque**
1. Activar los límites de diseño: `adb shell setprop debug.layout true` y reabrir la app.
2. Recorrer las 14 pantallas y revisar botones, íconos, pestañas, insignias tocables y enlaces de texto.
3. Desactivar con `debug.layout false`.
- **Esperado:** todo elemento tocable mide al menos 48 × 48 dp, contando su `hitSlop`.

**M5 — Identidad sin conexión**
1. Cerrar la app y activar el modo avión.
2. Abrir la app en modo claro y luego en oscuro.
- **Esperado:** la bienvenida muestra el logo aprobado en su versión de cada modo, todos los textos usan la tipografía aprobada y no falta ningún ícono.

**M6 — Regresión de las specs 001 a 008**
1. Ejecutar los casos manuales de los `tasks.md` de las specs 001 a 008, con los pasos de navegación actualizados en T19.
2. En particular: desde la grabación sin iniciar, "Configurar" contactos y volver; la grabación sigue igual (spec 008, caso M3).
- **Esperado:** todos pasan igual que antes del rediseño; solo cambian los pasos para llegar a cada pantalla.

### Diferencias aceptadas con el prototipo

(Se llena en T20. Ya prevista: los mapas se ven claros en modo oscuro; su estilo queda fuera de alcance, plan R6.)

## Commits propuestos

| Commit | Tareas |
|---|---|
| `docs(009): spec, plan y tareas del diseño; constitución v1.7` | Documentación ya escrita |
| `docs(009): prototipo en Figma aprobado` | T1–T7 (enlace al archivo, historial y logo exportado) |
| `feat(009): tokens de diseño en modo claro y oscuro` + `test(009): contraste y colores sueltos` | T8, T9 |
| `chore(009): pestañas, fuentes, íconos y modo del sistema` | T10 |
| `feat(009): tema, componentes y navegación por pestañas` | T11–T13 |
| `feat(009): rediseño de cuenta`, `… de actividad`, `… de rutas`, `… de seguridad` | T14, T15, T16, T17 (uno por grupo) |
| `fix(009): limpieza de colores sueltos` | T18 |
| `docs(009): casos manuales actualizados y verificación` | T19, T20 |

## Pendientes conocidos

Ninguno por ahora.
