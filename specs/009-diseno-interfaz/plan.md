# 009 — Plan técnico

Spec: [spec.md](spec.md)

## Resumen

El trabajo tiene dos fases y la segunda empieza solo después de que apruebes la primera (RN-7).

**Fase A, Figma.** Con el MCP de Figma creo un archivo con la identidad (logo y tipografía), el sistema de diseño (variables de color en modo claro y oscuro, tipografía, espaciado y componentes con variantes) y las 14 pantallas más el aviso "¿Estás bien?", en los dos modos, enlazadas como prototipo. Los nombres de las variables de Figma son los mismos que los de los tokens del código, para que el diseño y la app hablen el mismo idioma.

**Fase B, app.** Se amplía `frontend/lib/theme/` con los tokens (colores claro/oscuro, tipografía, espaciado, radios) y un hook que elige el modo según el sistema. Después se rehacen los componentes de `components/ui/`, se cambia la navegación a una barra de pestañas inferior y se migran las 14 pantallas a los tokens, grupo por grupo. Dos pruebas de Vitest cuidan el resultado: una mide el contraste de todos los pares de colores (CA-3) y otra impide colores sueltos en pantallas y componentes (CA-10). No hay cambios de backend ni de SQLite.

## Verificación contra la constitución

- [x] **Art. 1 La spec primero:** la spec está aprobada y este plan solo cubre su alcance. La fase B no empieza sin la aprobación del prototipo (CA-8).
- [x] **Art. 2 Offline-first:** no se toca la captura, la base local ni la sincronización. La tipografía, los íconos y el logo van empaquetados en la app (D3 a D5); nada se descarga en tiempo de ejecución.
- [x] **Art. 3 Seguridad:** sin cambios en autenticación, permisos ni datos. Los textos de propósito de los permisos no cambian.
- [x] **Art. 4 Contratos de API:** sin endpoints nuevos ni cambiados.
- [x] **Art. 5 Datos:** sin cambios en Prisma ni en el esquema SQLite (`user_version` no cambia).
- [x] **Art. 6 Verificación:** CA-3 y CA-10 con Vitest sobre `frontend/lib/theme/` (lógica pura). CA-1, CA-2 y CA-4 a CA-8 con revisión documentada del archivo de Figma. CA-9 y CA-11 a CA-15 con casos manuales en el emulador. Ver la tabla "Verificación".
- [ ] **Art. 7 Stack:** se agregan `@react-navigation/bottom-tabs`, `expo-font`, `@expo/vector-icons` y `expo-system-ui` (D1, D3, D4, D2). Al aprobar este plan hay que subir la constitución a v1.7 y agregarlos a la tabla del stack.
- [x] **Art. 8 Ritmo:** rama `009-diseno-interfaz`, commits `feat(009)`, `test(009)` y `docs(009)`.

## Backend

Sin cambios. No hay endpoints, módulos ni migraciones.

## Prototipo en Figma (fase A)

Archivo nuevo **"SendaBC — Diseño"**, creado con `create_new_file` en la cuenta que devuelva `whoami` (ver riesgo R1). Se trabaja con `use_figma`, y el logo se exporta con `download_assets`.

| Página | Contenido | CA |
|---|---|---|
| Sistema de diseño | Identidad: logo (fondo claro, fondo oscuro y versión cuadrada para ícono) y tipografía con su justificación y licencia. Variables: colección **Color** con modos *Claro* y *Oscuro*, colecciones **Espaciado** y **Radio**, estilos de texto de la escala tipográfica. Componentes con variantes de estado y modo: botón (primario, secundario, de texto, de peligro × normal, presionado, deshabilitado), campo de texto (normal, foco, error), tarjeta, insignia de sincronización (sincronizada, pendiente, rechazada), aviso de estado, encabezado de pantalla, barra de pestañas y tabla de contraste de cada par usado. | CA-1 a CA-4 |
| Pantallas | Una sección por grupo (cuenta, actividad, rutas, seguridad). Cada pantalla en un marco Android de 360 × 800 en modo claro y su copia en modo oscuro (mismo marco con el modo de variables cambiado). Al lado, los estados que define su spec: carga, vacío, error, sin conexión, pendiente de sincronizar. | CA-5, CA-7 |
| Prototipo | Flujos con punto de inicio en la bienvenida: registro → inicio; inicio de sesión → inicio → grabar → finalizar → resumen; inicio → rutas → detalle → favorita; publicar ruta; contactos de emergencia; grabación → "¿Estás bien?". La barra de pestañas permite llegar a las 14 pantallas desde el inicio. | CA-6 |

Al terminar, comparto el enlace y capturas de cada página. Tu aprobación se anota en el historial de la spec (CA-8).

### Navegación propuesta

La pantalla de inicio deja de ser un menú de seis botones y pasa a una barra de **4 pestañas**:

| Pestaña | Pantalla raíz | Desde ahí se llega a |
|---|---|---|
| Inicio | `MainPage`: saludo, botón grande "Nueva actividad", resumen de seguridad y cerrar sesión | Grabación → Resumen |
| Actividades | `ActivityHistory` | Resumen → Publicar ruta / Detalle de ruta |
| Rutas | `ExploreRoutes` (mapa), con accesos a "Mis rutas" y "Favoritas" en su encabezado | Detalle → Editar ruta |
| Seguridad | `EmergencyContacts` | — |

La grabación, el resumen, el detalle, publicar, editar, mis rutas y favoritas se abren encima de las pestañas, sin barra inferior, para que la grabación use toda la pantalla y sus controles queden abajo (CA-13). Bienvenida, inicio de sesión y registro quedan fuera de las pestañas. No se crea ninguna pantalla nueva.

### Paleta

**Modo claro.** Valores base de `colors.ts` sin cambios (RN-3). Se agregan los tokens que faltan:

| Token | Claro | Oscuro (propuesta) | Uso |
|---|---|---|---|
| `background` | `#EDEAE1` | `#1A1B17` | Fondo |
| `surface` *(nuevo)* | `#F7F5EF` | `#262722` | Tarjetas, campos, barra de pestañas |
| `text` | `#2B2A26` | `#EDEAE1` | Texto |
| `textMuted` | `#444444` | `#B8B4A8` | Texto secundario |
| `primary` | `#5C6B49` | `#A7B98C` | Botones, encabezados |
| `onPrimary` *(nuevo)* | `#FFFFFF` | `#1A1B17` | Texto sobre `primary` |
| `secondary` | `#A9762F` | `#D9A75E` | Acentos, íconos, texto grande (RN-4) |
| `secondaryText` *(nuevo)* | `#8A5F22` | `#D9A75E` | Texto normal en ocre (p. ej. insignia "pendiente") |
| `data` | `#2E6E7E` | `#7DB8C7` | Métricas y recorrido |
| `alert` | `#C1432A` | `#EE7A5F` | Solo seguridad (RN-5) |
| `onAlert` *(nuevo)* | `#FFFFFF` | `#1A1B17` | Texto sobre `alert` |
| `error` | `#B3261E` | `#F2B8B5` | Validación y acciones destructivas |
| `border` *(nuevo)* | por definir en Figma | por definir en Figma | Bordes de campos (3:1 contra el fondo) |

`primaryDark` desaparece: `BgBtn` pasa a ser el botón secundario con `primary`. Todos los pares de esta tabla ya miden 4.5:1 o más en su uso previsto (por ejemplo, `primary` oscuro sobre fondo oscuro 8.2:1 y `secondaryText` sobre fondo claro 4.7:1). Los valores finales se fijan en Figma y la prueba de contraste los vuelve a medir.

La insignia "pendiente" de `SyncBadge` usa hoy `secondary` en texto de 12 px (3.3:1) y no cumple; pasa a `secondaryText`.

### Tipografía, espaciado y forma (propuesta)

- **Fuente:** Atkinson Hyperlegible Next (D3), regular, semibold y bold.
- **Escala tipográfica** (tamaño / interlineado): `caption` 12/16, `bodySmall` 14/20, `body` 16/24, `title` 20/28, `headline` 24/32, `display` 32/40, `metric` 48/56. Los 15 tamaños que hay hoy (de 12 a 72) se reducen a estos 7. `metric` es exclusivo de distancia, tiempo y elevación en la grabación (CA-12) y usa cifras de ancho fijo (`fontVariant: ['tabular-nums']`) para que no salten al cambiar.
- **Espaciado** (base 4): `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24, `xxl` 32, `xxxl` 48.
- **Radios:** `sm` 8, `md` 12, `lg` 16, `pill` 999.
- **Toque:** `touchMin` 48. Botones de 48 dp de alto como mínimo; los elementos más chicos llevan `hitSlop` (CA-13).

## Frontend (fase B)

### Tema y tokens (`frontend/lib/theme/`)

- `colors.ts` — se conserva `colors` (modo claro) para no romper los imports actuales durante la migración. Se agregan `lightColors` (igual a `colors` más los tokens nuevos), `darkColors` y el tipo `ColorTokens`. Cuando no quede ningún import de `colors`, el alias se elimina.
- `typography.ts` — escala tipográfica y nombres de las familias de la fuente.
- `spacing.ts` — espaciado, radios y `touchMin`.
- `index.ts` — `Theme = { scheme, colors, typography, spacing, radius }`, `lightTheme` y `darkTheme`.
- `contrast.ts` — `contrastRatio(a, b)` (fórmula WCAG 2.1) y `CONTRAST_PAIRS`: la lista de pares texto/fondo y gráfico/fondo que usa la app, con el mínimo que exige cada uno (4.5 o 3).
- `contrast.test.ts` — verifica que cada par de `CONTRAST_PAIRS` cumpla en los dos temas (CA-3).
- `hardcodedColors.test.ts` — recorre `pages/`, `components/` y `App.tsx` y falla si encuentra un literal de color (`#RGB`, `#RRGGBB`, `rgb(`). Hoy lo tienen 8 archivos (CA-10).

### Hook y aplicación del tema

- `frontend/hooks/theme/useTheme.ts` — `useTheme()` lee `useColorScheme()` de React Native y devuelve `lightTheme` o `darkTheme`. React Native vuelve a renderizar cuando cambia el modo del sistema, así que la app cambia sin reiniciarse (CA-11). `useThemedStyles(makeStyles)` memoriza `StyleSheet.create(makeStyles(theme))` por tema. Cada pantalla pasa de `const styles = StyleSheet.create({...})` a `const makeStyles = (t: Theme) => StyleSheet.create({...})`, siguiendo el estilo actual de estilos al final del archivo.
- `App.tsx` — el fondo del `SafeAreaView` y el indicador de carga del `Gate` toman el tema. A `<Navigation>` se le pasa un tema de React Navigation construido con los tokens (fondo, tarjeta, texto, borde, primario). `StatusBar` de `expo-status-bar` con `style="auto"`.
- `app.json` — `userInterfaceStyle: "automatic"` y el plugin `expo-font` con los archivos de la fuente. En Android, `userInterfaceStyle` requiere `expo-system-ui` (D2). Hace falta un development build nuevo.

### Componentes (`frontend/components/ui/`)

- `buttons/PrimaryBtn.tsx`, `BgBtn.tsx` (secundario) y `TextBtn.tsx` — con tokens, alto mínimo de 48, estado presionado y deshabilitado como en Figma. Se agrega la variante de peligro (`variant="danger"`, con `error`). Las props actuales se conservan para que la migración no obligue a cambiar cada llamada.
- `SyncBadge.tsx` — tokens y `secondaryText` para "pendiente".
- Nuevos, solo si el prototipo los usa en dos o más pantallas: `TextField.tsx` (campo con etiqueta, foco y error, que hoy cada formulario arma a mano), `Card.tsx`, `ScreenHeader.tsx`, `Notice.tsx` (aviso de vacío, error o sin conexión) e `Icon.tsx` (envoltorio de `@expo/vector-icons` con tamaño y color del tema y `accessibilityLabel` obligatorio si no lleva texto).
- `components/brand/Logo.tsx` — muestra el PNG del logo que toca según el modo (CA-14).
- `components/safety/*` y `components/routes/*` — se migran a tokens. `AreYouOkModal` y `RecordingSafety` usan `alert` y `onAlert`, con su acción principal abajo (CA-13).

### Pantallas y navegación

- `App.tsx` — `HomeTabs = createBottomTabNavigator({ screens: { MainPage, ActivityHistory, ExploreRoutes, Safety } })` con la API estática, anidado en `RootStack` como `Home`. `RootStack` conserva `Index`, `Login`, `Register`, `Activity`, `ActivitySummary`, `RouteDetail`, `PublishRoute`, `EditRoute`, `MyRoutes`, `Favorites` y `EmergencyContacts`.
- **Seguridad en dos lugares.** `EmergencyContactsPage` se registra como pestaña (`Safety`) y como pantalla del stack (`EmergencyContacts`). Así, el "Configurar" de `SafetyCard` en la grabación (`activityPage.tsx:222`) la abre encima, y al volver se regresa a la grabación sin perder lo que el usuario estaba preparando, como hoy (spec 008).
- **Navegaciones afectadas:** `pages/auth/index.tsx:14` y `login.tsx:66` resetean a `Home` en lugar de `MainPage`. Los botones "Mis actividades", "Explorar rutas" y "Seguridad" de `mainPage.tsx` desaparecen (las pestañas los reemplazan). "Mis rutas" y "Favoritas" pasan al encabezado de `exploreRoutesPage.tsx`. El resto (`goBack`, `replace('ActivitySummary')`, `navigate('RouteDetail')`, etc.) no cambia.
- **Las 14 pantallas** se migran en cuatro grupos, en este orden: cuenta (`pages/auth/*`, `mainPage`), actividad (`activityPage`, `activitySummaryPage`, `activityHistoryPage`), rutas (`exploreRoutesPage`, `routeDetailPage`, `publishRoutePage`, `editRoutePage`, `myRoutesPage`, `favoritesPage`) y seguridad (`emergencyContactsPage`). En cada una: tokens, componentes, íconos, estados como en Figma y revisión con letra grande del sistema.
- `activityPage.tsx` — distancia, tiempo y elevación con `metric` y color `data`. "Puntos" baja a `bodySmall` (CA-12). Pausar y finalizar van en una barra fija abajo (CA-13).
- Mapas (`react-native-maps`) sin cambios de estilo (fuera de alcance). En modo oscuro, el mapa se sigue viendo claro.

### Hooks / estado / almacenamiento local

- Solo se agrega `hooks/theme/useTheme.ts`. No hay estado persistido: el modo lo da el sistema (RN-8).
- Cambios a SQLite: ninguno.

## Decisiones

| # | Decisión | Alternativas consideradas | Motivo |
|---|---|---|---|
| D1 | Barra de 4 pestañas con `@react-navigation/bottom-tabs` (React Navigation 7, API estática) | Seguir con el menú de botones en el inicio; cajón lateral | Es la navegación que se espera en Android e iOS, se usa con el pulgar y deja las cuatro secciones a un toque. Es parte de la misma familia que ya está en el stack y soporta la API estática. El cajón esconde las secciones y se alcanza peor con una mano. |
| D2 | Modo del sistema con `useColorScheme()` + `userInterfaceStyle: "automatic"` + `expo-system-ui` | Selector propio con estado persistido | La spec pide seguir al sistema (RN-8). Sin `expo-system-ui`, Android ignora `userInterfaceStyle` y siempre reporta modo claro. |
| D3 | Atkinson Hyperlegible Next, empaquetada con el plugin de `expo-font` | Inter; fuente del sistema (Roboto / San Francisco) | La diseñó el Braille Institute para distinguir bien letras parecidas (I/l/1, 0/O) con poca visión: justo lo que pide leer al sol y en movimiento. Licencia libre (OFL). Con el plugin se incrusta en el build, así que no se descarga ni hay que esperarla al abrir la app. Inter es la alternativa si no da el resultado esperado en Figma (R3). |
| D4 | Íconos `@expo/vector-icons` (set MaterialCommunityIcons) | `react-native-svg` + Lucide; íconos en PNG | Tiene íconos de senderismo, carrera, bici, mapa y escudo; se colorean con el tema y van incluidos en la app (offline). Evita agregar `react-native-svg` solo para íconos. |
| D5 | El logo se diseña vectorial en Figma y se exporta a PNG @1x/@2x/@3x, en versión clara y oscura | SVG en la app con `react-native-svg` | Se muestra en una sola pantalla (bienvenida). El PNG no agrega dependencias y el vector original queda en Figma para el ícono de la 011. |
| D6 | Las variables de Figma y los tokens del código tienen los mismos nombres | Nombrar libremente en Figma y mapear después | Para CA-1 y CA-9 basta comparar nombres; no hace falta una tabla de equivalencias. |
| D7 | Estilos por pantalla con `makeStyles(theme)` + `useThemedStyles` | Librería de estilos (Restyle, Tamagui, NativeWind) | Cambia lo mínimo frente al `StyleSheet.create` actual y no agrega dependencias (Art. 7.2). |
| D8 | Contraste y colores sueltos verificados con Vitest | Revisar a mano en cada PR | Son reglas que se rompen sin darse cuenta al tocar una pantalla. Una prueba las cuida en cada cambio. |

## Verificación

| CA | Cómo |
|---|---|
| CA-1, CA-2, CA-4 | Revisión documentada del archivo de Figma (caso F1 en `tasks.md`) |
| CA-3 | `contrast.test.ts` + tabla de contraste en Figma |
| CA-5 a CA-7 | Recorrido del prototipo en modo presentación (caso F2) |
| CA-8 | Entrada en el historial de la spec |
| CA-9 | Comparación pantalla por pantalla emulador vs. Figma, en los dos modos (caso manual) |
| CA-10 | `hardcodedColors.test.ts` |
| CA-11 | Caso manual: cambiar el modo del emulador con la app abierta en varias pantallas |
| CA-12, CA-13 | Caso manual en la pantalla de grabación; medir áreas de toque con el inspector de elementos |
| CA-14 | Caso manual en modo avión: logo y fuente en la bienvenida |
| CA-15 | Repetir los casos manuales de las specs 001 a 008, ajustando los pasos de navegación en sus `tasks.md` |

## Riesgos

- **R1 — Plan de Figma.** En el plan gratuito (Starter), las variables tienen un solo modo y los archivos un máximo de 3 páginas. Por eso la estructura usa exactamente 3 páginas. Si la cuenta es Starter, el modo oscuro se arma como una segunda colección de variables (`Color/Oscuro`) aplicada a copias de los marcos, en lugar de un modo de la misma colección. Se confirma con `whoami` al empezar la fase A.
- **R2 — Development build nuevo.** `expo-font` (plugin), `expo-system-ui` y `userInterfaceStyle` necesitan compilar de nuevo. Antes de escribir código hay que leer la documentación de Expo SDK 57 de esos paquetes (según `frontend/AGENTS.md`).
- **R3 — Cifras de ancho fijo.** Si Atkinson Hyperlegible Next no tiene cifras tabulares, las métricas "saltan" al cambiar. Se revisa en Figma durante la fase A; si falla, se usa Inter (D3).
- **R4 — Navegación anidada.** En React Navigation 7, navegar a una pantalla dentro de las pestañas requiere `navigate('Home', { screen: ... })`. Las llamadas afectadas están listadas arriba; los casos manuales de las specs 001, 002, 005, 007 y 008 que dependen del menú del inicio se actualizan (CA-15).
- **R5 — Tamaño del cambio.** Se tocan las 14 pantallas y casi todos los componentes. Migrar por grupos, con un commit y una pasada de regresión por grupo, evita una sola rama grande imposible de revisar.
- **R6 — Mapa claro en modo oscuro.** Queda un contraste visual brusco en "Rutas" y en la grabación. Se acepta porque el estilo de mapas está fuera de alcance; se anota como diferencia aceptada (CA-9).
