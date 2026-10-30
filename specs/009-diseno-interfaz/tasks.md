# 009 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de `frontend/lib/theme/` incluyen sus pruebas Vitest (constitución 6.1).

La fase B no empieza hasta que T7 esté hecha: la aprobación del prototipo queda en el historial de la spec (RN-7, CA-8).

## Antes de empezar (lo hace el usuario)

- Tener sesión de Figma conectada al MCP con la cuenta donde debe quedar el archivo. En T1 se confirma el plan de esa cuenta con `whoami` (plan, riesgo R1).

## Fase A — Prototipo en Figma

- [ ] T1 — Crear el archivo **"SendaBC — Diseño"** con 3 páginas: Sistema de diseño, Pantallas y Prototipo. Confirmar el plan de la cuenta: si es Starter, el modo oscuro va como segunda colección `Color/Oscuro` (R1). Crear:
  - la colección **Color** con los tokens de la tabla "Paleta" del plan, con los mismos nombres y los valores claros de `colors.ts`, y su equivalente oscuro;
  - las colecciones **Espaciado** y **Radio**;
  - los estilos de texto de la escala tipográfica.

  (CA-1, CA-3)
- [ ] T2 — Identidad en la página Sistema de diseño:
  - logo en tres versiones (fondo claro, fondo oscuro y cuadrada para ícono);
  - tipografía Atkinson Hyperlegible Next con su justificación y licencia (OFL);
  - comprobar si tiene cifras de ancho fijo; si no, cambiar a Inter y anotarlo en el plan (R3).

  (CA-4)
- [ ] T3 — Componentes con variantes de estado, en modo claro y oscuro:
  - botón primario, secundario, de texto y de peligro, cada uno normal, presionado y deshabilitado;
  - campo de texto normal, con foco y con error;
  - tarjeta, insignia de sincronización (sincronizada, pendiente, rechazada), aviso de estado, encabezado de pantalla y barra de 4 pestañas.

  Además, una tabla de contraste con cada par texto/fondo usado y su razón medida. Fijar el valor de `border`. (CA-2, CA-3)
- [ ] T4 — Página Pantallas, grupos **cuenta** y **actividad**: bienvenida, inicio de sesión, registro, inicio, grabación, resumen e historial. Cada una en 360 × 800, en claro y en oscuro, con los estados que define su spec: carga, vacío, error, sin conexión y pendiente de sincronizar. En la grabación, métricas en `metric` y controles abajo. (CA-5, CA-7)
- [ ] T5 — Página Pantallas, grupos **rutas** y **seguridad**: explorar rutas, detalle, publicar, editar, mis rutas, favoritas, contactos de emergencia y el aviso "¿Estás bien?", en los dos modos y con sus estados. (CA-5, CA-7)
- [ ] T6 — Página Prototipo: conexiones de los flujos de CA-6, la barra de pestañas operativa y el punto de inicio en la bienvenida. (CA-6)
- [ ] T7 — Pasar F1 y F2 contigo y compartir el enlace y las capturas. Con tu aprobación:
  - anotarla en el historial de la spec (con las diferencias que pidas);
  - exportar el logo a PNG @1x/@2x/@3x, claro y oscuro, a `frontend/assets/brand/`;
  - copiar a la tabla "Paleta" del plan los valores finales si cambiaron.

  (CA-8)

## Fase B — App

- [ ] T8 — Tokens en `frontend/lib/theme/`, con los valores aprobados en Figma:
  - `colors.ts`: `lightColors`, `darkColors` y `ColorTokens`; el alias `colors` se conserva;
  - `typography.ts`, `spacing.ts` (con radios y `touchMin`) e `index.ts` (`Theme`, `lightTheme`, `darkTheme`);
  - `contrast.ts`, con `contrastRatio` y `CONTRAST_PAIRS`;
  - `contrast.test.ts`: la fórmula contra valores conocidos (negro/blanco 21:1; `#5C6B49` sobre `#EDEAE1` 4.78:1) y que cada par cumpla su mínimo en los dos temas.

  (CA-1, CA-3)
- [ ] T9 — `frontend/lib/theme/hardcodedColors.test.ts`: recorre `pages/`, `components/` y `App.tsx` y falla con cualquier literal `#RGB`, `#RRGGBB` o `rgb(`. Lleva una lista temporal de archivos aún sin migrar (hoy 8), que cada tarea de pantallas va vaciando. (CA-10)
- [ ] T10 — Dependencias y configuración. Primero leer la documentación de Expo SDK 57 de `expo-font`, `expo-system-ui` y `userInterfaceStyle` (`frontend/AGENTS.md`). Después:
  - `npx expo install @react-navigation/bottom-tabs expo-font @expo/vector-icons expo-system-ui`;
  - fuente en `frontend/assets/fonts/` y plugin `expo-font` en `app.json`;
  - `userInterfaceStyle: "automatic"`;
  - compilar un development build nuevo.

  (CA-11, CA-14)
- [ ] T11 — `frontend/hooks/theme/useTheme.ts` con `useTheme()` y `useThemedStyles(makeStyles)`. En `App.tsx`:
  - tema de React Navigation construido con los tokens;
  - `SafeAreaView` y el `Gate` con colores del tema;
  - `StatusBar` con `style="auto"`.

  (CA-10, CA-11)
- [ ] T12 — Componentes en `frontend/components/ui/`:
  - `PrimaryBtn`, `BgBtn` (secundario) y `TextBtn` con tokens, 48 dp de alto mínimo y variante `danger`;
  - `SyncBadge` con `secondaryText`;
  - los componentes nuevos que use el prototipo: `TextField`, `Card`, `ScreenHeader`, `Notice` e `Icon` (con `accessibilityLabel` obligatorio sin texto);
  - `components/brand/Logo.tsx`.

  (CA-9, CA-13, CA-14)
- [ ] T13 — Navegación:
  - `HomeTabs` (Inicio, Actividades, Rutas, Seguridad) anidado como `Home` en `RootStack`;
  - `EmergencyContactsPage` registrada también como `EmergencyContacts` en el stack;
  - `index.tsx:14` y `login.tsx:66` resetean a `Home`;
  - quitar de `mainPage.tsx` los botones que reemplazan las pestañas;
  - accesos a "Mis rutas" y "Favoritas" en el encabezado de `exploreRoutesPage.tsx`.

  (CA-6, CA-9, CA-15)
- [ ] T14 — Grupo **cuenta**: `pages/auth/index.tsx` (con `Logo`), `login.tsx`, `register.tsx` y `pages/main/mainPage.tsx` a tokens, componentes e íconos como en Figma. Sacarlos de la lista temporal de T9. (CA-9, CA-10, CA-14)
- [ ] T15 — Grupo **actividad**: `activityPage.tsx` (métricas con `metric` y `data`, "Puntos" en `bodySmall`, pausar y finalizar en barra fija abajo), `activitySummaryPage.tsx` y `activityHistoryPage.tsx`. (CA-9, CA-10, CA-12, CA-13)
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
| CA-1 | Caso F1 (variables y estilos en Figma) + `contrast.test.ts` usa los mismos nombres de token | Manual + Automatizada | Pendiente |
| CA-2 | Caso F1 | Manual | Pendiente |
| CA-3 | `frontend/lib/theme/contrast.test.ts` › "cada par cumple su mínimo en claro y oscuro" + tabla de contraste en F1 | Automatizada | Pendiente |
| CA-4 | Caso F1 | Manual | Pendiente |
| CA-5 | Caso F2 | Manual | Pendiente |
| CA-6 | Caso F2 | Manual | Pendiente |
| CA-7 | Caso F2 | Manual | Pendiente |
| CA-8 | Entrada de aprobación en el historial de `spec.md` (T7) | Manual | Pendiente |
| CA-9 | Caso manual M1 | Manual | Pendiente |
| CA-10 | `frontend/lib/theme/hardcodedColors.test.ts` › "sin colores sueltos en pantallas y componentes" | Automatizada | Pendiente |
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
3. Revisar qué textos son los más grandes y dónde quedan pausar y finalizar.
4. Provocar el aviso "¿Estás bien?" (spec 008, caso M4) y revisar dónde queda "Estoy bien".
- **Esperado:** distancia, tiempo y elevación son los textos más grandes y se leen sin acercarse. Las cifras no saltan al cambiar. Pausar, finalizar y "Estoy bien" quedan en la mitad inferior.

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
