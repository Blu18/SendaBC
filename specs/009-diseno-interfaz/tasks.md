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
- [x] T14 — Grupo **cuenta**: `pages/auth/index.tsx` (con `Logo`), `login.tsx`, `register.tsx` y `pages/main/mainPage.tsx` a tokens, componentes e íconos como en Figma. Sacarlos de la lista temporal de T9. (CA-9, CA-10, CA-14)

  Hecho (con los marcos 19:348 a 19:571 y 21:942 a 21:1029 de Figma):
  - **Bienvenida (`index.tsx`):** `Logo` a 292 × 70, la descripción en `body` `textMuted` y abajo dos botones: "Iniciar sesión" (primario) y "Crear cuenta" (secundario).
  - **Inicio de sesión y registro:**
    - `ScreenHeader` secundario (volver), título `headline` y `TextField` con etiqueta ("Correo", "Contraseña", "Usuario", "Confirmar contraseña"). Ya no usan placeholder.
    - Los botones van abajo y todo está en un `ScrollView` para el teclado.
    - El error del servidor va en un `Notice` de error: "No se pudo iniciar sesión" o "No se pudo crear la cuenta", con el mensaje del servidor como descripción, sin cambiarlo (RN-1).
    - La confirmación tras registrarse va en un `Notice` info ("Cuenta creada"), con el mismo mensaje de antes.
    - La validación y la navegación no cambian.
  - **Inicio (`mainPage.tsx`):**
    - `ScreenHeader` raíz "Hola, <nombre>"; mientras carga o si falla dice "Inicio".
    - Si el perfil no carga, aparece un `Notice` de error: "No se pudo cargar tu perfil" (el mensaje de antes, ahora como título), con la descripción nueva "Tus actividades se siguen grabando en el teléfono.".
    - La tarjeta "Nueva actividad" es `primary`, con el ícono `hiking` y el botón "Empezar". Ese botón usa `primary` y `onPrimary` del modo contrario, como en Figma; los dos pares ya están en la tabla de contraste.
    - La sección "Seguridad" muestra `SafetyCard`, solo con la lista de contactos ya cargada para no avisar "sin contactos" por un error de red. "Configurar contactos" lleva a la pestaña Seguridad.
    - "Cerrar sesión" es un botón de texto.
  - **Textos cambiados (los de T4):** "Iniciar sesión" con minúscula, "¿Aún no tienes cuenta? Crea una" y "Crear cuenta" en la bienvenida. Son textos nuevos del prototipo la descripción de la bienvenida, la ayuda "Así te verán en las rutas que publiques." en Usuario, los títulos de los avisos y la descripción del error de perfil.
  - **`SafetyCard` se adelantó desde T17**, porque el Inicio la usa y con el alias `colors` no se leía en oscuro. Se rehízo como en Figma: `surface` con borde `primary` y escudo relleno si está activa; borde `alert`, escudo de contorno y enlace "Configurar contactos" (Bold, subrayado, 48 dp) si no hay contactos. También cambia en la grabación.
  - **Colores sueltos:** `PENDING_MIGRATION` quedó vacía (los 4 archivos de cuenta salieron). Ojo: la prueba de T9 solo detecta literales. Todavía hay 17 archivos que importan el alias `colors` (solo modo claro); se migran en T15–T18.
  - **Comprobado en el emulador (2026-10-30):**
    - En claro y en oscuro: Inicio (cargando y con error de perfil, porque el backend estaba apagado), inicio de sesión vacío y con errores de validación, registro y bienvenida.
    - Inicio con letra grande (`font_scale 1.3`): nada se corta.
    - Para ver la bienvenida, el inicio de sesión y el registro sin cerrar la sesión, se cambió temporalmente la pantalla inicial y la redirección (revertido).
    - La flecha de volver no se pudo tocar: en el development build la tapa el botón flotante de herramientas de Expo. Queda para M1.
  - **Pasos de casos manuales:** los de las specs 001 y 002 que buscan "Registrarse" en la bienvenida o un placeholder ("Correo") se actualizan en T19.
- [x] T15 — Grupo **actividad**: `activityPage.tsx` (métricas con `metric` y `data`, "Puntos" en `bodySmall`, "Iniciar/Detener actividad" y "Pedir ayuda" en barra fija abajo), `activitySummaryPage.tsx` y `activityHistoryPage.tsx`. (CA-9, CA-10, CA-12, CA-13)

  Hecho (con los marcos 20:533 a 20:1128 de Figma):
  - **Componentes nuevos** (los usan dos o más pantallas):
    - `components/ui/Chip.tsx`: 48 dp de alto, `surface` con borde `border`; seleccionado en `primary` con `onPrimary` Bold. Lo usará también `ReturnTimePicker` (T17).
    - `components/ui/Metric.tsx`: `large` (`metric` en `data`, grabación) y `medium` (`display` en `text`, resumen). La unidad va más chica; el número se reduce solo si no cabe en media pantalla.
    - `splitUnit()` en `lib/format/metrics.ts` separa número y unidad ("5.42 km"), con su prueba en `metrics.test.ts`.
    - `components/safety/SosButton.tsx`: "Pedir ayuda" en `alert` con `onAlert` y escudo, mantener 2 s como antes (spec 008, RN-7). Salió de `RecordingSafety`, que conserva la hora de regreso y la alerta activa hasta su rediseño (T17).
  - **Grabación (`activityPage.tsx`):**
    - `ScreenHeader` secundario: "Nueva actividad" antes de iniciar y "Grabando · <tipo>" al grabar. La flecha hace `goBack`, igual que el botón atrás del sistema.
    - Tipo de actividad con `Chip` (deshabilitados al grabar), tiempo en ancho completo y distancia y elevación lado a lado, todo con `Metric` grande (CA-12). "Puntos" pasa a "N puntos registrados" en `bodySmall`.
    - Barra fija abajo (`surface`, borde superior): "Pedir ayuda" con su instrucción (solo al grabar con sesión de seguridad) y "Iniciar/Detener actividad" (CA-13). "Detener" ya no va en `text`: es el primario, como en Figma.
    - Los avisos pasan a `Notice`, con el mensaje de antes como descripción: "Ubicación desactivada" (error, con "Abrir ajustes"), "Se necesita tu ubicación", "Detección solo con la app abierta", "Sin notificaciones" y "No se pudo cerrar la actividad" (error).
  - **Resumen (`activitySummaryPage.tsx`):** `ScreenHeader` "Resumen" con volver; tipo en `headline`, fecha e insignia; las 5 métricas en `Metric` mediana dentro de un bloque `surface`; fuente de elevación y puntos en una línea. "Publicar como ruta" / "Ver ruta publicada" (secundario) y "Listo" van en la barra de abajo. "No se encontró la actividad" es un `Notice` de error con la descripción del prototipo y "Volver" abajo.
  - **Mis actividades (`activityHistoryPage.tsx`):** `ScreenHeader` raíz. Fila de actividad como en Figma: `surface`, ícono del tipo (`hiking`, `run`, `bike`) en círculo, tipo en Bold, fecha, insignia y a la derecha la distancia en `data` y la duración. Los avisos de deslizar (spec 005, CA-16) son `Notice` "Sin conexión" y de error, con el mismo texto partido en título y descripción. El vacío es un `Notice` info (RN-2) y al pie va "Desliza hacia abajo para sincronizar.".
  - **Textos nuevos del prototipo:** los títulos de los avisos, "Puede que se haya borrado de este teléfono." y "Desliza hacia abajo para sincronizar.". Mensajes, validaciones y navegación no cambian (RN-1).
  - **Colores:** las tres pantallas ya no importan el alias `colors`. Todos los pares de color que usan ya están en la tabla de contraste.
  - **Diferencia con Figma, temporal:** con alerta activa, el aviso sigue debajo de las métricas, dentro de `RecordingSafety`, y no arriba como en el prototipo. Se mueve en T17.
  - **Verificado:** `tsc` y `npm test` del frontend (507 pruebas) en verde.
  - **Comprobado en el emulador (2026-11-01)**, con el backend apagado:
    - Grabación antes de iniciar (claro y con letra grande, `font_scale 1.3`: los chips bajan de línea y nada se corta) y grabando (claro y oscuro), con "Pedir ayuda" y "Detener actividad" abajo y el aviso "Detección solo con la app abierta" al elegir "Ahora no" en el permiso en segundo plano.
    - Resumen al detener (oscuro, con "Listo" y el motivo de no publicar en la barra) y desde Mis actividades (claro, sin "Listo").
    - Mis actividades en claro y oscuro, y el aviso de error al deslizar sin servidor.
    - "Pedir ayuda" no se mantuvo presionado: encolaría una alerta real para los contactos de la cuenta de prueba. Queda para M6 con contactos de prueba.
    - Visto de paso: en oscuro, "Sin hora de regreso" de `RecordingSafety` casi no se lee porque aún usa el alias `colors`. Se arregla al migrarlo en T17.
    - Sin probar: los avisos de permiso de ubicación negado, sin notificaciones y "No se pudo cerrar la actividad", y la lista vacía.
- [x] T16 — Grupo **rutas**: `exploreRoutesPage`, `routeDetailPage`, `publishRoutePage`, `editRoutePage`, `myRoutesPage`, `favoritesPage` y `components/routes/*`. (CA-9, CA-10)

  Hecho (con los marcos 24:1205 a 25:1872 de Figma):
  - **Componentes de `components/routes/`:**
    - `RouteListNotice`: `Notice` con título ("Nada por aquí todavía", "Sin conexión" o "No se pudo cargar") y el mensaje de antes como descripción, más "Reintentar".
    - `RouteForm`: tres `TextField` en el orden de Figma (Nombre, Zona, Descripción). La ayuda dice "Hasta N caracteres · n/N", así que el contador de antes sigue a la vista.
    - `ElevationProfile`: con tokens. En lugar de la línea y el área de Figma, las columnas de siempre en `data` al 15 % con un borde superior de 2 dp en `data`, sin agregar una librería de gráficas.
  - **Explorar rutas:**
    - Filtros con `Chip` flotante (sombra). Debajo, "Buscar en esta zona" al centro y "Centrar en mi ubicación" (`crosshairs-gps`) a la derecha, como en Figma (antes iba abajo).
    - "Buscando…" en una píldora al centro del mapa.
    - Avisos abajo, con `Notice`: "Sin rutas cerca", "Sin conexión", "No se pudo cargar" y "Sin tu ubicación".
    - Tarjeta de la ruta en `surface` con sombra, la etiqueta "Tuya" de contorno y "A X km de ti" en `data` Bold.
  - **Detalle:**
    - `ScreenHeader` "Detalle de ruta" y métricas con `Metric` mediana.
    - Abajo: "Guardar/Quitar de favoritas" en rutas ajenas; en rutas propias, "Tu ruta" con Editar, Archivar y Borrar en una fila (Borrar es el botón de peligro), y favoritas pasa al contenido.
    - Sin conexión, no disponible y error son `Notice` con "Reintentar" o "Volver" abajo.
  - **Publicar y editar:** encabezado secundario, formulario, "Datos de la actividad" en un bloque `surface`, y "Publicar" o "Guardar cambios" en la barra de abajo. El error del servidor es un `Notice` arriba ("No se pudo publicar" / "No se pudieron guardar los cambios"). El aviso de privacidad (spec 007, CA-4) pasa a un `Notice` info "Tu recorrido será público" con el mismo texto.
  - **Mis rutas y Mis favoritas:** encabezado con volver y `Card` por ruta. La descripción de Mis rutas es "distancia · tipo · estado · fecha" (spec 007, CA-21). En favoritas es "distancia · tipo · +elevación", o "Ya no disponible · tipo", con "Quitar" en la tarjeta (CA-19).
  - **Mapas:** recorridos y puntos con `lightColors`, porque el estilo del mapa no se toca.
  - **Diferencias con Figma** (para T20):
    - Sin chips de dificultad al publicar: la dificultad la calcula la app (spec 007, D1); se muestra en "Datos de la actividad".
    - "Por <autor>" (spec 006, CA-19) y "Archivada: no aparece en "Rutas"." (spec 007) siguen en el detalle y en la tarjeta, aunque el prototipo no los tiene.
    - "Quitar" en cada favorita (spec 007, CA-19), que el prototipo no tiene.
    - El mapa del detalle mide 280 dp y no 200: a 200, Android no encuadraba el recorrido con el margen fijo y se quedaba en una vista muy lejana.
  - **Textos:** "Explorar rutas" pasa a "Rutas" en el vacío de favoritas, en la confirmación de publicar y en la nota de archivada (RN-2). Son nuevos los títulos de los avisos y la ayuda de los campos.
  - **Plan:** R6 actualizado. En Android, Google Maps se pone oscuro solo con el modo del sistema.
  - **Verificado:** `tsc` y `npm test` del frontend (507 pruebas) en verde; ningún archivo de rutas importa ya el alias `colors`.
  - **Comprobado en el emulador (2026-11-01)**, con el backend local:
    - Explorar con rutas, filtros y botón de centrar (claro), y con una ruta seleccionada.
    - Detalle de una ruta de ejemplo en oscuro, con perfil, "Por SendaBC" y "Guardar en favoritas" ("Guardando...").
    - Mis rutas vacía y Mis favoritas vacía y con una ruta (oscuro). Se guardó una favorita y se quitó con "Quitar"; la cuenta quedó como estaba.
    - Ojo: si se cambia el tamaño de letra con la app abierta, los chips de Explorar se enciman hasta reiniciar la app. Con la app reiniciada se ven bien.
    - Sin probar: detalle de una ruta propia, publicar y editar (la cuenta de prueba no tiene rutas ni actividades publicables, y publicar deja una ruta visible para todos), y los avisos de sin conexión y sin permiso de Explorar. Quedan para M5 y M6 en T20.
- [x] T17 — Grupo **seguridad**: `emergencyContactsPage` y `components/safety/*`. `AreYouOkModal` y `RecordingSafety` con `alert` y `onAlert` y "Estoy bien" en la mitad inferior. (CA-9, CA-10, CA-13)

  Hecho (con los marcos 26:1777 a 26:2194 de Figma):
  - **Contactos de emergencia (`emergencyContactsPage.tsx`):**
    - `ScreenHeader` raíz "Seguridad" en la pestaña y con volver cuando se abre encima de la grabación (`EmergencyContacts`).
    - Cada contacto en un bloque `surface`: avatar con `account-outline`, nombre en `title` y estado con punto y texto. Activo va en `primary`, pendiente en `secondaryText` y "No recibe mensajes" en `error`, como en Figma.
    - Botones: "Compartir invitación" primario, "Enviar mensaje de prueba" secundario, y Editar y Quitar de texto (Quitar ya no va en rojo, como en Figma; sigue pidiendo confirmación).
    - "Agregar contacto" pasa a secundario. Sin conexión, error y sin contactos son `Notice` ("Sin conexión", "No se pudo cargar", "Sin contactos"). El mensaje sin conexión ya no empieza con "Sin conexión:", que pasó al título.
  - **`ContactForm`:** `TextField` con la ayuda "Así lo verás en la app y en los avisos · n/40" y "Cancelar" + botón primario en una fila. Al agregar, el botón dice "Agregar contacto" (antes "Agregar").
  - **`ReturnTimePicker`:** bloque `surface`, hora en `title` `data` y `Chip` de 48 dp; el error lleva ícono.
  - **`RecordingSafety`:**
    - La hora de regreso va en un bloque `surface`, con "Cambiar" como botón de texto. Al editar se ve el selector y abajo "Cancelar" y "Guardar". Arregla "Sin hora de regreso", que en oscuro no se leía (T15).
    - La alerta activa sale a `ActiveAlert`: `Notice` tipo alerta y "Cancelar alerta" secundario, arriba de la grabación como en Figma. Así se cierra la diferencia que quedó en T15.
  - **`AreYouOkModal`:**
    - Pasa de pantalla completa en `alert` a hoja inferior `surface` sobre la grabación oscurecida: ícono en círculo `alert`, título `display`, cuenta regresiva en `metric` `alert` y "Estoy bien" primario de 64 dp abajo (CA-13).
    - El fondo oscurecido es `lightColors.text` al 50 % en los dos modos.
  - **Contraste:** se agregó el par `alert` / `surface` (cuenta regresiva, texto grande: 4.69 en claro y 5.43 en oscuro) a `CONTRAST_PAIRS` y a la tabla de la prueba. **Pendiente:** agregar esa fila a la tabla de contraste del archivo de Figma.
  - **Colores sueltos:** ningún archivo de `pages/`, `components/` ni `App.tsx` importa ya el alias `colors`; queda quitarlo en T18.
  - **Verificado:** `tsc` y `npm test` del frontend (509 pruebas) en verde.
  - **Comprobado en el emulador (2026-11-01)**, con el backend local:
    - Seguridad en claro y oscuro con 3 contactos (Activo y Pendiente), el límite de 3 y el formulario de editar abierto (se canceló sin guardar).
    - Grabación en oscuro: el selector de hora de regreso antes de iniciar, "Sin hora de regreso" con "Cambiar" al grabar y la edición con "Cancelar" y "Guardar".
    - "¿Estás bien?" en claro y oscuro: se forzó visible un momento en el código para verla, sin tocar "Estoy bien" (revertido). La recarga en caliente reinició la pantalla de grabación y la actividad quedó abierta; al reiniciar la app se cerró sola y se sincronizó (spec 003, CA-12).
    - Un error de `react-native-maps` ("topUserLocationChange") salió una vez tras la recarga en caliente con el mapa de Explorar montado; no se repitió al reiniciar la app.
    - Sin probar: la alerta activa, el SOS y "Estoy bien" de verdad (envían avisos reales a los contactos), los estados sin conexión y error de Seguridad, y "Configurar contactos" desde la grabación. Quedan para M6 con contactos de prueba.
- [x] T18 — Limpieza:
  - quitar el alias `colors` y `primaryDark`;
  - dejar vacía la lista temporal de T9;
  - `npm test` en verde.

  (CA-10)

  Hecho:
  - **Alias:** se quitaron `colors` y `primaryDark` de `lib/theme/colors.ts` y su export de `lib/theme/index.ts`.
  - **Notificaciones:** los últimos usos estaban en `lib/safety/locationTask.ts` y `lib/safety/notifications.ts`, que dan el color de las notificaciones de Android. Ahora usan `lightColors.alert`, el mismo valor: el sistema pinta esas notificaciones y no siguen el modo de la app.
  - **Lista temporal:** `PENDING_MIGRATION` ya estaba vacía desde T14, y ningún archivo de `pages/`, `components/` ni `App.tsx` tiene colores sueltos ni importa el alias.
  - **Verificado:** `tsc` y `npm test` del frontend (509 pruebas, 37 archivos) en verde. CA-10 queda cubierto.
- [x] T19 — Actualizar los pasos de navegación ("desde la pantalla principal, tocar X" → "pestaña X") en los casos manuales de los `tasks.md` de las specs 001, 002, 005, 007 y 008, con nota en el historial de cada spec si cambia su texto. (CA-15)

  Hecho (2026-11-01):
  - **Alcance:** también cambiaban casos de las specs 004 ("Mis actividades") y 006 ("Explorar rutas"), así que entran. También la 003, porque el botón de la tarjeta "Nueva actividad" dice "Empezar".
  - **Casos actualizados** en 001 a 008:
    - "pantalla principal" → pestaña Inicio, Actividades, Rutas o Seguridad.
    - "pantalla de inicio" → bienvenida; el registro se abre con "Crear cuenta".
    - "Nueva actividad" → "Empezar" en la pestaña Inicio.
    - "Mis rutas" y "Mis favoritas" → encabezado de la pestaña Rutas.
    - El enlace del aviso sin contactos (008, M3) → "Configurar contactos", que abre Seguridad encima de la grabación.
  - **CA reescritos** (solo el punto de entrada, RN-2): 004 CA-20, 006 CA-1 y 007 CA-18 y CA-21. Cada spec tiene su nota en el historial.
  - **Pestaña Rutas:** una pestaña no se desmonta al cambiar a otra. Antes, `ExploreRoutes` era del stack y se desmontaba al volver, así que ahora conservaba el radio, el filtro, el permiso y la última búsqueda. Eso chocaba con la spec 006, CA-11 ("cada vez que abro, 25 km"), y con CA-15 de esta spec. Decisión del usuario: reiniciarla al entrar.
    - `exploreRoutesPage.tsx` vuelve a montar el mapa con `key` en `tabPress` si la pestaña no estaba enfocada. Al volver del detalle, de Mis rutas o de Mis favoritas conserva el estado, como antes (plan, R7).
    - Pasos actualizados: 006 M4 (3) "Ir a otra pestaña y volver a Rutas", 006 M7 (1) y 007 M2 (6).
    - Comprobado en el emulador: con 5 km y Senderismo, ir a Inicio y volver a Rutas regresa a 25 km y Todas, y vuelve a pedir la ubicación. Con 5 km, abrir Mis rutas y volver lo conserva. `tsc` y `npm test` (509) en verde.
  - **`Chip` sin etiqueta, arreglado de paso:** al tocar un chip, el recién seleccionado quedaba como una píldora `primary` vacía, en Explorar y en la grabación. El texto seguía en la vista (`uiautomator`), pero Android no lo dibujaba.
    - Causa: al seleccionar se quitaba el borde (1 → 0). Con la misma fuente pasaba igual, y con el borde puesto se arreglaba.
    - Ahora el borde de 1 dp va en los dos estados: en `border` sin seleccionar y en `primary` al seleccionar, así que la medida no cambia.
    - Comprobado en el emulador (2026-11-01): tipo de actividad en la grabación (claro) y tipo y radio en Explorar (oscuro).
- [ ] T20 — Casos M1 a M6 en el emulador. Anotar en este archivo las diferencias aceptadas (CA-9) y actualizar el estado de la spec y `specs/roadmap.md`. (CA-9, CA-11 a CA-15)

  Avance (2026-11-01, emulador `Pixel_10_Pro`, backend local, cuenta de Postman):
  - **M2 — pasa.** Con la app en Inicio, `night yes` la pasa a oscuro al instante. Actividades, Rutas, Seguridad y la grabación sin iniciar se ven en oscuro, y `night no` la regresa a claro sin salir de la grabación. El pid fue el mismo de principio a fin (no se reinició) y la barra de estado se lee en los dos modos.
  - **M1 — recorrido hecho; faltan tu visto bueno a las diferencias (abajo) y algunas pantallas.**
    - Vistas en claro y oscuro: bienvenida, inicio de sesión, registro (con errores), Inicio, grabación (antes y durante), resumen, Mis actividades, Rutas (con tarjeta), detalle, Mis rutas, Mis favoritas y Seguridad. Cada una ya se había comparado con su marco de Figma en T14 a T17.
    - Con letra grande (`font_scale 1.3`), en oscuro: Inicio, resumen, Rutas y Seguridad no cortan ni enciman texto. La grabación ya se había visto así en T15.
    - Sin ver aquí: publicar y editar ruta (no hay actividad publicable ni ruta propia) y "¿Estás bien?" de verdad (se vio forzado en T17).
  - **M3 — pasos 1 a 3 pasan.** Se grabó 1 min 13 s con 15 puntos simulados (641 m). Tiempo, distancia y elevación son los textos más grandes, y "Pedir ayuda" y "Detener actividad" van en la barra de abajo. El resumen salió al detener y se sincronizó. **Paso 4 sin correr:** provocar "¿Estás bien?" pide 10 min quieto con los contactos reales de la cuenta activos (si no se responde, se les avisa). Queda para hacerlo con `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES` y contactos de prueba.
  - **M4 — pasa.** Se midieron los elementos tocables con `uiautomator` (densidad 480, 3 px = 1 dp) en bienvenida, inicio de sesión, registro, Inicio, grabación, resumen, Mis actividades, Rutas con tarjeta, detalle, Mis rutas, Mis favoritas y Seguridad. Todo mide 48 dp o más: botones, campos, chips, pestañas (107 × 68), íconos del encabezado y "Volver".
    - **Marcadores de Explorar, arreglados:** los de inicio de ruta medían 18 × 18 dp y costaba atinarles.
      - El punto (y el anillo de la seleccionada) va ahora dentro de una vista transparente de 48 × 48 (`markerHit`), así que el marcador entero mide 48 dp sin cambiar cómo se ve.
      - Con `tracksViewChanges={false}` fijo, Android tomaba la imagen antes de dibujar el punto y el marcador no se veía. Ahora los marcadores siguen su vista durante 1 s después de cada carga de rutas y luego se congelan.
      - Comprobado (2026-11-01): 5 marcadores de 48 × 48; los puntos se ven en la primera carga y al cambiar de filtro; un toque a 12 dp del centro abre la tarjeta; el anillo de la seleccionada se ve. `tsc` y `npm test` (509) en verde.
    - Los marcadores "Inicio" y "Final" del detalle (16 dp) solo se ven, no hacen nada al tocarlos.
  - **M5 — pasa.** En modo avión, tras cerrar sesión y reabrir la app, la bienvenida muestra el logo en su versión clara y oscura, con Atkinson Hyperlegible Next e íconos.
  - **M6 — parcial.** Pasan los casos que se pueden correr sin ayuda:
    - 001 M1 (registro vacío).
    - 002 M1 (Inicio y atrás sale de la app), M5 (cerrar sesión lleva a la bienvenida) y M6 (sin conexión: "Error al iniciar sesión. Inténtalo más tarde.").
    - 003 y 004 M1: grabar, detener, resumen, y "Listo" lleva a Inicio sin poder volver.
    - 005 M1 (se sincroniza al terminar) y M5 (2) (aviso "Sin conexión" al deslizar).
    - 006 M1 y M4 (3) (la pestaña vuelve a 25 km).
    - 007 M4 (guardar y quitar favorita; la cuenta quedó igual).
    - 008 M3 (2) (tarjeta "Seguridad activa").
    - **Sin correr:**
      - Necesitan Telegram en un teléfono: 008 M1, M2 y M4 a M10.
      - Necesitan un teléfono con barómetro: 004 M3.
      - Necesitan una ruta publicable o propia: 007 M1 a M3 y M6.
      - Necesitan una segunda cuenta: 007 M7.
      - Necesitan `JWT_EXPIRE_IN=30s`: 002 M4 y 005 M7.
      - "Configurar contactos" desde la grabación (009 M6, paso 2), porque la cuenta tiene contactos activos.
  - Ojo, solo en el development build: el botón flotante "Tools" de Expo tapa la flecha de volver y el inicio del título. No existe en una compilación de producción.

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
| CA-9 | Caso manual M1 | Manual | Recorrido hecho (2026-11-01); falta aceptar las diferencias propuestas |
| CA-10 | `frontend/lib/theme/hardcodedColors.test.ts` › "sin colores sueltos en pantallas y componentes" | Automatizada | Pasa; `PENDING_MIGRATION` vacía y sin alias `colors` (T18) |
| CA-11 | Caso manual M2 | Manual | Verificado (2026-11-01) |
| CA-12 | Caso manual M3 | Manual | Verificado (2026-11-01), pasos 1 a 3 |
| CA-13 | Casos manuales M3 y M4 | Manual | Pasa (2026-11-01); falta "Estoy bien" de verdad (M3, paso 4) |
| CA-14 | Caso manual M5 | Manual | Verificado (2026-11-01) |
| CA-15 | Caso manual M6 | Manual | Parcial (2026-11-01): pasan los casos corridos; faltan los que piden Telegram, barómetro, ruta publicable, segunda cuenta o JWT corto |

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

Propuestas en T20, pendientes del visto bueno del usuario (CA-9):

1. **Mapas:** el estilo del mapa no se cambia (plan, R6). En Android, Google Maps se pone oscuro con el modo del sistema; recorridos y puntos usan `lightColors` en los dos modos.
2. **`Notice` sin botón cerrar:** el relleno derecho es `lg` (16) en lugar de 4, para que el texto no toque el borde (T12).
3. **Publicar:** no hay chips de dificultad, porque la calcula la app (spec 007, D1); se muestra en "Datos de la actividad" (T16).
4. **Textos que se conservan de las specs aunque el prototipo no los tiene:** "Por <autor>" (spec 006, CA-19), "Archivada: no aparece en "Rutas"." (spec 007) y "Quitar" en cada favorita (spec 007, CA-19) (T16).
5. **Mapa del detalle de 280 dp** en lugar de 200: a 200, Android no encuadraba el recorrido (T16).
6. **Perfil de elevación en columnas** (`data` al 15 % con borde superior) en lugar de línea y área, para no agregar una librería de gráficas (T16).
7. **Ayuda de los campos con contador:** "Hasta N caracteres · n/N", para conservar el contador de antes (T16 y T17).

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
