# 010 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de `frontend/lib/` sin imports de React Native incluyen sus pruebas Vitest (constitución 6.1).

Dos tareas detienen el trabajo: T4 (si la prueba técnica falla, se vuelve al plan antes de seguir) y T2 (`activityPage` no se programa hasta aprobar el prototipo, RN-9). El mapa se termina antes de empezar las animaciones (RN-10).

## Antes de empezar (lo hace el usuario)

- Fusionar la 009 en `master`, actualizar el `master` local y crear la rama `010-mapa-3d-animaciones`.
- Crear la cuenta de Mapbox y un token público, y guardarlo en `frontend/.env.local` como `EXPO_PUBLIC_MAPBOX_TOKEN`, sin pegarlo en el chat (plan, D4 y R7).
- Tener sesión de Figma conectada al MCP.

## Backend

Sin tareas: la spec no cambia el backend.

## Fase A — Prototipo en Figma

- [x] T1 — Agregar la pantalla de grabación al archivo "SendaBC — Diseño", en modo claro y oscuro, con las variantes del plan: 3D, 2D, sin seguir al usuario, esperando GPS, sin conexión, mapa no disponible, y con hora de regreso, alerta activa y avisos. Fijar ahí el alto máximo del panel inferior. (CA-19)

  Hecho: sección "Grabación con mapa (spec 010)" en la página Pantallas, con 8 variantes por modo (16 marcos), y componentes nuevos `Mapa de grabación` (3D, 2D, Liso y Región, en claro y oscuro) y `Botón de vista` en Sistema de diseño. El mapa es una ilustración de referencia, no el aspecto final de Mapbox. Alto máximo del panel inferior: 280 dp, que deja al mapa al menos 303 dp en una pantalla de 800. Para caber, la tarjeta de hora de regreso baja a 48 dp. La alerta activa y "Cancelar alerta" van sobre el mapa, para no empujar las métricas. Falta enlazar estas pantallas en la página Prototipo, si se quiere recorrerlas.
- [x] T2 — Presentar el prototipo al usuario y anotar su aprobación en el historial de la spec. (CA-19)

## Fase B — Prueba técnica

Se hace en una rama desechable y puede correr en paralelo con la fase A (plan, D2).

- [x] T3 — Instalar `@rnmapbox/maps` con su plugin y compilar un development build con RN 0.86, Expo 57 y la nueva arquitectura. Revisar antes la documentación de Expo 57 (`frontend/AGENTS.md`). Anotar si el build pide `MAPBOX_DOWNLOADS_TOKEN`. (plan, R1, R7)

  Hecho (2026-11-05): `@rnmapbox/maps` 10.3.17 con Mapbox SDK 11.33.0 compila con RN 0.86, Expo 57 y `newArchEnabled`, sin token de descarga (BUILD SUCCESSFUL, APK x86_64). El plugin hay que escribirlo a mano en `app.config.ts`: `expo install` no lo agrega porque la configuración es dinámica. Solo se comprobó que compila; que funcione en el emulador se ve en T4. Rama `spike/010-mapa` en la carpeta `C:devSendaBC-spike-010`.
- [x] T4 — En una pantalla de prueba, comprobar y anotar el resultado de cada punto en el plan (plan, R2 y R8):
  - relieve visible en la Sierra de Juárez, con la URL de datos de relieve correcta y el valor de exageración;
  - Standard con preset de día y de noche, o Outdoors y Dark (D7);
  - cámara por código con centro, rumbo, inclinación y transición suave;
  - detección de un gesto del usuario sobre el mapa;
  - estilo local mínimo en modo avión, con capas de trazo dibujadas;
  - apagado de la telemetría (D5).

  Si algo falla, detenerse y actualizar primero el plan o la spec. (CA-1, CA-9, CA-13, CA-15)

  Hecho (2026-11-05), en el emulador sobre la Sierra de Juárez (`-115.80 32.15`), sin cierres de la app:
  - **Relieve:** funciona con `mapbox://mapbox.mapbox-terrain-dem-v1`, `tileSize` 514 y exageración 1.5.
  - **Estilos:** Standard queda descartado: de día se ve pálido y de noche casi no se distingue el relieve. Dark v11 solo tampoco lo muestra. De día, Outdoors v12 (con curvas de nivel). De noche, Dark v11 con `HillshadeLayer` sobre la misma fuente de relieve. Falta probar el 2D oscuro.
  - **Trazo en oscuro:** necesita un color claro; el de modo claro casi no se ve.
  - **Cámara:** `setCamera` con centro, rumbo, inclinación y `easeTo` funciona, y el cambio a 2D también.
  - **Gestos:** `CameraGestureObserver` con `onCameraChanged` y `properties.isUserInteraction` distingue el gesto del usuario de los movimientos por código.
  - **Sin red:** el estilo local con `styleJSON` carga y dibuja trazo y posición en modo avión. Una zona ya vista sale de la caché sin ningún error, así que la falta de red se detecta con `expo-network`, no con `onMapLoadingError`. El fallo de estilo se vio con el token inválido, no con una zona nueva en modo avión.
  - **Telemetría:** `setTelemetryEnabled(false)` no falla y el log indica "events dispatch disabled".
  - **Sin probar:** el regreso de la red desde el estilo local con una actividad en curso; se cubre en M11.

## Fase C — Mapa

- [x] T5 — Agregar a la rama real la dependencia, el plugin en `app.config.ts`, la lectura de `EXPO_PUBLIC_MAPBOX_TOKEN` y el apagado de la telemetría. Regenerar el build y confirmar que "Explorar rutas" sigue funcionando (D3, D4, D5). (CA-1)

  Hecho (2026-11-05): `@rnmapbox/maps` y su plugin en `app.config.ts`. `lib/map/mapbox.ts` lee el token y apaga la telemetría, y se importa en `index.ts`. Development build regenerado e instalado. "Explorar rutas" sigue funcionando en el emulador, con mapa de Google, rutas y posición.
- [x] T6 — `lib/metrics/distance.ts`: exportar las reglas de punto impreciso y de salto sin cambiar la distancia. `lib/map/track.ts`: de puntos a trazo GeoJSON, en orden `[longitud, latitud]`, con un segmento nuevo tras un salto. Pruebas en `lib/map/track.test.ts`. (CA-4)

  Hecho (2026-11-05): `isAccurate` e `isJump` exportadas sin cambiar la distancia (las pruebas de 004 siguen pasando). `createTrack` y `computeTrack` en `lib/map/track.ts`, con 12 pruebas. Un segmento de un solo punto no se dibuja.
- [x] T7 — `lib/map/heading.ts`: rumbo entre posiciones, con 10 m mínimos entre ellas y conservando el último al detenerse (D6). Pruebas en `lib/map/heading.test.ts`. (CA-3)

  Hecho (2026-11-05): `bearingDegrees`, `createHeading` y `computeHeading`, con 13 pruebas. Aplica las mismas reglas que el trazo: ignora puntos imprecisos y no calcula rumbo a través de un salto. Límite conocido: un titubeo del GPS de 10 m o más, posible con precisión de hasta 20 m, puede girar el mapa estando quieto; revisar en M2 y en la prueba de campo de la 011.
- [x] T8 — `hooks/activity/activityMap.hook.ts`: carga desde SQLite, escucha `onGrabacion`, relee al volver a `active` y devuelve trazo, posición y rumbo. (CA-2, CA-3, CA-4, CA-7)

  Hecho (2026-11-05): `useActivityMap`, más `lib/map/liveMap.ts` con la lógica pura y 6 pruebas: une trazo y rumbo, y evita contar dos veces un punto al releer SQLite. El hook aún no corre en la app; se comprueba con T9 y los casos M2 y M5.
- [x] T9 — `components/map/RecordingMap.tsx`: mapa con relieve, trazo, marcador de posición y cámara que sigue y gira, sin `UserLocation` ni `followUserLocation`. Transición de cámara suave, para el riesgo R3. (CA-1, CA-2, CA-3, CA-4)

  Hecho (2026-11-05): mapa con relieve, trazo, marcador con flecha de rumbo y cámara que sigue y gira (constantes en `lib/map/camera.ts`), probado en el emulador con un recorrido simulado en la Sierra de Juárez. Zoom 14 e inclinación de 55°. Ya se monta en `activityPage` con el alto máximo del panel; T13 completa esa pantalla. El marcador usa `SymbolLayer` con `iconOcclusionOpacity`, porque una capa de círculo y un `MarkerView` desaparecían detrás de una loma. El trazo sí puede quedar oculto detrás de una loma aunque se le puso `lineOcclusionOpacity`; el 2D lo evita.
- [x] T10 — Estilo según `theme.scheme`, también al cambiar el modo del teléfono durante la grabación. (CA-9)

  Hecho (2026-11-05): `lib/map/style.ts` elige Outdoors o Dark con sombreado, con 2 pruebas. Probado en 3D en el emulador cambiando el modo del teléfono durante una actividad: el mapa cambia, y el trazo, la posición y la grabación siguen. El 2D oscuro se prueba en T11.
- [x] T11 — Control de vista 3D/2D con `MapViewToggle`: empieza en 3D, conserva posición, trazo y seguimiento, y mantiene la vista durante la actividad. (CA-10, CA-11, CA-12)

  Hecho (2026-11-05): `components/map/MapViewToggle.tsx`, el "Botón de vista" de Figma, en lugar de `IconButton`, porque muestra texto. Probado en el emulador en modo claro y oscuro: el cambio conserva posición y trazo, y al volver de un bloqueo de pantalla se mantuvo el 2D. En 2D oscuro no hay sombreado, porque se veía borroso y con rayas: queda el fondo oscuro con trazo y posición. Con T12 se comprobó que el cambio conserva el seguimiento. Falta probar en M5 los puntos grabados con la pantalla bloqueada.
- [x] T12 — Gestos: un gesto apaga `siguiendo`; botón de volver a mi posición, visible solo entonces. (CA-13, CA-14)

  Hecho (2026-11-05): `CameraGestureObserver` apaga el seguimiento y aparece "Volver a mi posición". Probado en el emulador solo con arrastre: el mapa deja de seguir, el marcador y las métricas siguen avanzando, cambiar a 2D no reactiva el seguimiento, y el botón regresa a la posición y desaparece. Sin `quietPeriodMs` y `onMapSteady`, los gestos no llegaban a `onCameraChanged`. Falta probar girar y acercar con dos dedos en M9.
- [x] T13 — `activityPage`, después de T2: mapa arriba, panel de métricas y seguridad debajo, y controles abajo. Montar el mapa solo durante la grabación, ocultar los chips de tipo mientras se graba y mostrar el aviso de espera de GPS con el encuadre de `BAJA_CALIFORNIA_REGION`. (CA-5, CA-6, CA-8)

  Hecho (2026-11-05): mapa arriba, panel de 280 dp como máximo, sin chips al grabar, tarjeta de regreso de 48 dp y aviso "Esperando señal GPS" sobre el encuadre de Baja California. La alerta activa y "Cancelar alerta" van sobre el mapa con la prop `overlay`, y el botón de vista baja debajo de ellas. Diferencia con Figma: "Cancelar alerta" lleva fondo `surface`, porque sobre el mapa no se leía (RN-7). Probado en el emulador en modo claro, incluida una alerta real en `TELEGRAM_MODE=log` y su cancelación. Faltan letra grande y panel con avisos (M4).
- [x] T14 — `hooks/map/useMapConnection.ts` y cambio entre el estilo normal y el estilo local, con su aviso, al perder y recuperar la red. (CA-15, CA-16)

  Hecho (2026-11-05): aviso "Mapa sin conexión" con `expo-network`, y `localMapStyle` para cuando el estilo falla. Probado en el emulador con modo avión y Wi-Fi apagado durante una actividad: puntos, métricas y trazo siguen; en zona ya vista se conserva el mapa; al volver la red se quita el aviso y el mapa de una zona nueva se recupera sin reiniciar la actividad, aunque tardó cerca de 2 minutos en el emulador. Límite conocido: una zona nunca vista sin red se ve azul, como agua, porque el estilo sale de la caché sin error; el aviso sí aparece. El paso al estilo local se prueba en T15, con un token inválido.
- [x] T15 — `components/map/MapErrorBoundary.tsx` y manejo de `onMapLoadingError`, con el aviso "Mapa no disponible". (CA-17)

  Hecho (2026-11-05): `MapErrorBoundary`, textos en `lib/map/messages.ts` y aviso "Mapa no disponible". Probado en el emulador con dos fallos provocados y retirados después: un error de render (se ve el aviso, y la grabación, las métricas y los botones siguen) y un estilo inexistente (pasa al estilo local con trazo y posición). Con un token inválido no se ve fallo, porque el estilo sale de la caché: M12 debe usar un estilo inexistente o una instalación limpia. Observado una vez: al iniciar la actividad justo tras abrir la app, con el emulador saturado, falló con `database is locked` y al reintentar funcionó; revisar en la 011.
- [ ] T16 — Correr los casos M1 a M13 y anotar los resultados. Revisar si los saltos cada 10 s son aceptables (R3). (CA-18)

## Fase D — Animaciones

- [ ] T17 — `lib/theme/motion.ts` con los tokens de duración, expuestos en `Theme`, y prueba de que ninguno pasa de 300 ms. (RN-5)
- [ ] T18 — `hooks/theme/useReducedMotion.ts` con `getReducedMotion()`. Con la opción activa, la cámara del mapa se mueve sin transición. (CA-27)
- [ ] T19 — `components/ui/PressableScale.tsx` y migración de `BaseBtn`, `Card`, `Chip`, `IconButton`, `SosButton`, `TabBar` y la fila de `activityHistoryPage`. (CA-20, CA-21, CA-22, CA-27)
- [ ] T20 — `RootStack` con `animation: 'slide_from_right'`. Medir la duración real en Android (R4). (CA-23)
- [ ] T21 — `HomeTabs` con `animation: 'fade'` y animación del indicador en `TabBar`, ambas sin movimiento con la opción reducida. (CA-24, CA-27)
- [ ] T22 — `components/ui/Appear.tsx` en `Notice`, `Card` y las filas de las listas, con entrada y salida. Capa de selección animada en `Chip`. (CA-25, CA-27)
- [ ] T23 — `AreYouOkModal` con `animationType="none"` si la opción reducida está activa. (CA-26, CA-27)
- [ ] T24 — Correr los casos M14 a M19 y anotar los resultados. (CA-20 a CA-27)

## Cierre

- [ ] T25 — Repetir los casos manuales de las specs 001 a 009 y actualizar los pasos de grabación que cambien. Corregir en las specs 003 y 009 las notas sobre el mapa de grabación, con entrada en su historial. (CA-28)
- [ ] T26 — Ejecutar `/spec-verify`, y actualizar el estado de la spec y `specs/roadmap.md`. Pasar a 011-estabilidad la medición de batería con los límites de 30 % y 15 %.

## Cobertura

Los 28 criterios tienen al menos una tarea y una forma de verificarse. RN-5 se cubre con T17 y T20. Los límites de batería no se verifican aquí: la spec los deja para 011-estabilidad.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | Caso manual M1 | Manual | Pendiente |
| CA-2 | Caso manual M2 | Manual | Pendiente |
| CA-3 | `frontend/lib/map/heading.test.ts` y caso manual M2 | Automatizada y manual | Pendiente |
| CA-4 | `frontend/lib/map/track.test.ts` y caso manual M2 | Automatizada y manual | Pendiente |
| CA-5 | Caso manual M3 | Manual | Pendiente |
| CA-6 | Caso manual M4 | Manual | Pendiente |
| CA-7 | Caso manual M5 | Manual | Pendiente |
| CA-8 | Caso manual M6 | Manual | Pendiente |
| CA-9 | Caso manual M7 | Manual | Pendiente |
| CA-10 | Caso manual M8 | Manual | Pendiente |
| CA-11 | Caso manual M8 | Manual | Pendiente |
| CA-12 | Caso manual M8 | Manual | Pendiente |
| CA-13 | Caso manual M9 | Manual | Pendiente |
| CA-14 | Caso manual M9 | Manual | Pendiente |
| CA-15 | Caso manual M10 | Manual | Pendiente |
| CA-16 | Caso manual M11 | Manual | Pendiente |
| CA-17 | Caso manual M12 | Manual | Pendiente |
| CA-18 | Caso manual M13 | Manual | Pendiente |
| CA-19 | Caso de revisión F1 | Revisión | Pendiente |
| CA-20 | Caso manual M14 | Manual | Pendiente |
| CA-21 | Caso manual M14 | Manual | Pendiente |
| CA-22 | Caso manual M14 | Manual | Pendiente |
| CA-23 | Caso manual M15 | Manual | Pendiente |
| CA-24 | Caso manual M16 | Manual | Pendiente |
| CA-25 | Caso manual M17 | Manual | Pendiente |
| CA-26 | Caso manual M18 | Manual | Pendiente |
| CA-27 | Caso manual M19 | Manual | Pendiente |
| CA-28 | Caso manual M20 | Manual | Pendiente |
| RN-3 | `frontend/lib/map/track.test.ts` | Automatizada | Pendiente |
| RN-5 | `frontend/lib/theme/motion.test.ts` y caso manual M15 | Automatizada y manual | Pendiente |

### Caso de revisión en Figma

**F1 — Prototipo de la pantalla de grabación**
1. Abrir el archivo "SendaBC — Diseño".
2. Revisar cada variante de T1 en modo claro y oscuro.
3. Revisar el historial de la spec.
- **Esperado:** están todas las variantes, con las métricas debajo del mapa y los controles de vista y de volver a mi posición, y la aprobación del usuario está registrada antes del primer commit de T13.

### Casos manuales

Se corren en el emulador con `adb` (`adb emu geo fix <lng> <lat>`). La Sierra de Juárez se simula alrededor de `-115.91 32.04`. Si el emulador no dibuja bien el relieve, M1 y M7 se repiten en un teléfono real.

**M1 — Mapa con relieve**
1. Con conexión, simular una posición en la Sierra de Juárez.
2. Iniciar una actividad y esperar el primer punto.
- **Esperado:** el mapa se ve en perspectiva y las montañas se distinguen por su relieve, no como un plano inclinado.

**M2 — Seguimiento, giro y trazo**
1. Iniciar una actividad y mover el GPS hacia el norte en pasos de 20 m.
2. Girar hacia el este y seguir avanzando.
3. Dejar de mover el GPS durante 30 s.
4. Enviar una posición a más de 5 km del punto anterior.
- **Esperado:** el marcador avanza y el mapa lo sigue. Tras el giro, la dirección de avance queda hacia arriba. Al detenerse, conserva la orientación. El trazo crece desde el primer punto y no une el salto con una línea.

**M3 — Esperando señal GPS**
1. Iniciar una actividad sin enviar posiciones al emulador.
2. Enviar una posición.
- **Esperado:** primero se ve el aviso de espera, sin marcador. Con el primer punto, el aviso desaparece y aparece el marcador.

**M4 — Lugar del mapa y métricas**
1. Grabar y revisar la pantalla con letra normal.
2. Repetir con la letra más grande del sistema.
3. Repetir con hora de regreso y con una alerta activa.
- **Esperado:** el mapa ocupa el espacio superior y nada lo tapa. Tiempo, distancia y elevación son los textos más grandes. "Detener actividad" y "Pedir ayuda" quedan en la mitad inferior. El panel se desplaza sin cortar texto.

**M5 — Volver desde la pantalla bloqueada**
1. Grabar con permiso en segundo plano y dibujar parte del trazo.
2. Bloquear la pantalla y mover el GPS durante 1 minuto.
3. Desbloquear y volver a la grabación.
- **Esperado:** el mapa muestra la posición más reciente y el trazo incluye los puntos registrados con la pantalla bloqueada.

**M6 — Sin mapa fuera de la grabación**
1. Abrir la pantalla de grabación sin iniciar y revisar `adb shell dumpsys location`.
2. Iniciar y detener una actividad, y revisarlo otra vez en el resumen.
- **Esperado:** antes de iniciar y en el resumen no hay mapa en vivo, y la app no tiene solicitudes de ubicación activas.

**M7 — Modo oscuro**
1. Grabar con `adb shell cmd uimode night yes`, en 3D y en 2D.
2. Cambiar a `night no` sin detener la actividad.
- **Esperado:** el mapa sigue el modo del teléfono en las dos vistas, y el relieve se distingue también en oscuro. La grabación continúa sin perder puntos.

**M8 — Alternar 3D y 2D**
1. Iniciar una actividad y confirmar que empieza en 3D.
2. Cambiar a 2D, mover el GPS y volver a 3D.
3. Con el mapa en 2D, bloquear la pantalla y volver.
4. Detener e iniciar otra actividad.
- **Esperado:** el 2D se ve desde arriba y sin relieve, y sigue, gira y dibuja el trazo. Cada cambio conserva posición, trazo y seguimiento. La vista se mantiene al volver del bloqueo. La actividad nueva empieza en 3D.

**M9 — Gestos y volver a mi posición**
1. Durante la grabación, mover, girar y acercar el mapa.
2. Mover el GPS.
3. Tocar el botón de volver a mi posición.
- **Esperado:** el mapa responde y deja de seguir, mientras los puntos y métricas siguen aumentando. El botón regresa a la posición actual y el mapa vuelve a seguir y girar. El botón desaparece al seguir de nuevo.

**M10 — Modo avión desde el inicio**
1. Activar el modo avión e iniciar una actividad.
2. Mover el GPS durante 2 minutos y detener la actividad.
- **Esperado:** se ve el aviso de mapa no disponible y el trazo sobre fondo liso. Los puntos y métricas aumentan, y el resumen muestra la actividad completa.

**M11 — Se pierde y vuelve la conexión**
1. Grabar con conexión y activar el modo avión.
2. Mover el GPS y desactivar el modo avión.
- **Esperado:** la pantalla no se bloquea ni pide ninguna acción, y el trazo se conserva. Al volver la red, el mapa de fondo regresa sin reiniciar la actividad.

**M12 — El mapa no se puede mostrar**
1. En `lib/map/style.ts`, apuntar temporalmente a un estilo inexistente (con token inválido, el estilo sale de la caché y no falla).
2. Iniciar una actividad y mover el GPS.
3. Probar "Pedir ayuda" con `TELEGRAM_MODE=log`, y después "Detener actividad".
- **Esperado:** se ve un aviso en lugar del mapa. La actividad continúa, las métricas aumentan y los dos botones funcionan.

**M13 — Recorrido de 10 minutos**
1. Arrancar con `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES=1` y un contacto de prueba activo.
2. Grabar un recorrido simulado de 10 minutos con el mapa visible.
3. Dejar el GPS quieto hasta que aparezca "¿Estás bien?".
- **Esperado:** los puntos siguen las reglas de la spec 003 y la 008, sin huecos sin causa. El tiempo avanza cada segundo. El aviso aparece encima del mapa.

**M14 — Toques**
1. Presionar y soltar un botón de cada tipo, una tarjeta, un chip, un botón de ícono, una pestaña y una fila del historial.
2. Presionar y deslizar el dedo fuera antes de soltar.
3. Presionar un botón deshabilitado.
4. Tocar "Iniciar actividad" dos veces seguidas.
- **Esperado:** cada elemento se anima y vuelve a su estado normal, también al cancelar, y en ese caso no se ejecuta la acción. El botón deshabilitado no se anima. La acción empieza sin esperar la animación, y el doble toque crea una sola actividad.

**M15 — Cambio de pantallas**
1. Abrir el detalle de una ruta y volver con el botón.
2. Abrirlo de nuevo y volver con el gesto del sistema.
3. Grabar un video con `adb shell screenrecord` y medir la transición.
- **Esperado:** la ida y la vuelta son animadas y van en sentido contrario. La duración es de 300 ms o menos, o queda anotada la diferencia para decisión del usuario (R4).

**M16 — Pestañas**
1. Cambiar entre las 4 pestañas, incluida Rutas con su mapa.
- **Esperado:** el contenido cambia con una animación, el indicador se anima y el mapa de Rutas no parpadea.

**M17 — Contenido**
1. Provocar un aviso de error y hacerlo desaparecer.
2. Abrir el historial y Mis rutas.
3. Agregar y quitar un contacto de emergencia.
4. Cambiar de chip en Explorar rutas.
- **Esperado:** avisos, tarjetas y filas aparecen y desaparecen con animación, en 300 ms o menos, y el chip cambia de selección con animación.

**M18 — Aviso "¿Estás bien?"**
1. Provocar el aviso con `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES=1`.
2. Tocar "Estoy bien" en cuanto empiece a aparecer.
- **Esperado:** el aviso entra con una animación y el toque se registra sin esperar a que termine.

**M19 — Reducir animaciones**
1. Activar la opción con `adb shell settings put global animator_duration_scale 0` y reiniciar la app.
2. Repetir M2 y M14 a M18.
3. Restaurar con `animator_duration_scale 1`.
- **Esperado:** no hay desplazamientos ni movimientos de cámara animados, y todo sigue funcionando.

**M20 — Regresión**
1. Repetir los casos manuales de las specs 001 a 009.
- **Esperado:** todos pasan, adaptando solo los pasos que cambien en la pantalla de grabación. 004 M3 sigue dependiendo de un teléfono con barómetro.

## Commits propuestos

Un commit por tarea cuando sea posible. Mínimo para la semana:

| Tipo | Tareas | Ejemplo |
|---|---|---|
| `docs(010)` | T1, T2, T4 y resultados de casos | `docs(010): resultados de la prueba técnica del mapa` |
| `chore(010)` | T5 | `chore(010): agregar Mapbox y su configuración` |
| `feat(010)` | T6 a T15 | `feat(010): mapa 3D con trazo en la grabación` |
| `feat(010)` | T17 a T23 | `feat(010): animaciones de toques y pantallas` |
| `test(010)` / `fix(010)` | T16, T24, T25 | `fix(010): correcciones de los casos manuales` |
| `docs(010)` | T26 | `docs(010): verificación y cierre` |

## Pendientes conocidos

- Límites de batería: se miden en 011-estabilidad.
- 004 M3 sigue pendiente de un teléfono con barómetro (spec 009).
- `database is locked` al iniciar una actividad justo tras abrir la app (T15, visto una vez con el emulador saturado): revisar en 011-estabilidad.
- Sin red, una zona nunca vista se ve azul (T14): se resuelve con los mapas descargados de 011-estabilidad.
