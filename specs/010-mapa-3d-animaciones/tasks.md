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
- [x] T16 — Correr los casos M1 a M13 y anotar los resultados. Revisar si los saltos cada 10 s son aceptables (R3). (CA-18)

  Hecho (2026-11-06), en el emulador con recorridos simulados. M1 a M13 pasan, y los hallazgos de abajo quedaron corregidos.
  - **M1, pasa:** perspectiva y relieve real en la sierra (`-115.80 32.15`). En la Laguna Hanson, que es plana, casi no se nota.
  - **M2, pasa:** sigue, gira con la dirección de avance y conserva la orientación al detenerse. El salto de más de 5 km no se une con una línea: con los puntos reales, `computeTrack` da dos segmentos, de 15 y 4 puntos. La distancia marcó 241 m contra unos 340 m caminados, y `computeDistance` da lo mismo con esos puntos: es el suavizado de la spec 004, no el mapa.
  - **M3, pasa:** aviso y encuadre de Baja California sin marcador; con el primer punto aparece el marcador. El emulador repite la última posición, así que el primer punto llegó a los pocos segundos sin enviar otra.
  - **M4, pasa con una observación:** probado con letra normal y al 200 %, con hora de regreso y con alerta activa. El panel se desplaza sin cortar texto y los botones siguen abajo. Al 200 %, "Alerta activa" y "Cancelar alerta" tapan el marcador. También lo tapan con letra normal si además está el aviso "Mapa no disponible". El panel conserva el desplazamiento de la pantalla previa, porque usan el mismo `ScrollView`.
  - **M5, pasa:** de 23 a 29 puntos con la pantalla bloqueada. El trazo los incluye y se mantuvo el 2D.
  - **M6, pasa:** sin solicitudes de ubicación antes de iniciar ni en el resumen. Durante la grabación el mismo filtro sí encuentra la solicitud, con una sola escucha cada 10 s.
  - **M7, pasa:** 3D y 2D en oscuro, y regreso a claro sin detener la actividad. En 2D oscuro no hay sombreado (T11).
  - **M8, pasa:** el cambio conserva posición, trazo y seguimiento, y el 2D se mantiene al volver del bloqueo. Una actividad terminada en 2D deja a la siguiente en 3D.
  - **M9, pasa:** el arrastre deja de seguir mientras puntos y métricas siguen aumentando (29 a 33), y el botón regresa, vuelve a seguir y girar, y desaparece. Girar y acercar con dos dedos los probó el usuario a mano, con Ctrl + arrastre en la ventana del emulador, y salió bien; desde `adb` no se pueden simular dos dedos.
  - **M10, pasa:** con modo avión y Wi-Fi apagado, 13 puntos y 199 m. Aviso "Mapa sin conexión", resumen completo y `PENDING_SYNC`, y se sincronizó al volver la red. En zona ya vista se conserva el mapa, no el fondo liso (T14). En 3D una loma tapó el trazo; en 2D se ve completo.
  - **M11, pasa:** sin bloqueos ni acciones pedidas, y el trazo se conserva. Al volver la red se quita el aviso y el mapa de una zona nueva se recuperó en unos 20 s, sin reiniciar la actividad.
  - **M12, pasa:** con un estilo inexistente se ve "Mapa no disponible" sobre el estilo local, con trazo y posición. Las métricas aumentan, y "Pedir ayuda" (`TELEGRAM_MODE=log`), "Cancelar alerta" y "Detener actividad" funcionan. El cambio en `style.ts` se revirtió.
  - **M13, pasa con un hallazgo:** 10 minutos con el mapa visible en 3D, 8 caminando y 2 a velocidad de bicicleta, más el GPS quieto: 62 puntos y 1.56 km. Entre puntos hubo 10 s en 58 casos, 11 s en uno y 20 s en otro; este último coincide con una captura que retrasó el GPS simulado, así que el punto se habría descartado por estar a menos de 5 m. El tiempo coincide con el reloj real (11:16 a los 677 s). "¿Estás bien?" apareció encima del mapa 57 s después de dejar el GPS quieto, y "Estoy bien" funcionó sin enviar alerta. Sin cierres de la app.
  - **R3, aceptable:** el marcador se queda fijo y el mapa se desliza, con una transición de 1 s por punto, y el tiempo sigue en vivo. El usuario lo vio en movimiento en el emulador, a velocidad de caminata, y lo aceptó.
  - **Hallazgo, corregido:** un toque en la flecha o el gesto atrás terminaba la actividad sin preguntar, y al usuario le pasó dos veces durante M9. Ahora la app pregunta antes de salir (spec 003, CA-15).
  - **Hallazgo grave, punto viejo al iniciar:** el punto 1 de la actividad 47 fue una posición guardada del GPS, de 25 minutos antes de iniciar y a 146 km de distancia, y se guardó como parte del recorrido. `debeGuardarPunto` no revisa la antigüedad. Aquí no sumó distancia porque esos 94 m/s cuentan como salto, pero un traslado normal queda bajo el límite de 50 m/s. Con `computeDistance` y `computeTrack`, una caminata de 540 m con un punto viejo a unos 31 km da **31,675 m**, y el trazo une los dos lugares con una línea. También contradice CA-5, porque muestra una posición que no es la actual. No lo causa el mapa. **Corregido** con la spec 003 (CA-13, RN-5): `esUbicacionVieja` en `lib/safety/recording.ts` descarta la ubicación si es de más de 30 s antes de iniciar, mientras la actividad no tenga puntos y solo en su primer minuto, para que un reloj desfasado no pierda la grabación. Con 7 pruebas nuevas en `recording.test.ts`. Al repetir el caso en el emulador el primer punto salió correcto, pero no se puede saber si el GPS entregó una ubicación vieja esa vez, así que falta verlo en un teléfono real.
  - **Hallazgo:** cambiar el tamaño de letra del sistema durante una grabación la corta sin avisar. `fontScale` no está en `configChanges`, Android recrea la pantalla, la app vuelve a Inicio y la actividad se cierra como huérfana (actividad 40, con 1 punto). Los puntos guardados se conservan, pero el GPS se detiene. No lo causa el mapa. M4 se corrió poniendo la letra antes de iniciar. **Corregido** con la spec 003 (CA-14): `plugins/withFontScaleConfigChange.js` agrega `fontScale` a `configChanges`, y el build se regeneró. La grabación sigue, pero los textos ya en pantalla quedan recortados hasta volver a abrir esa pantalla o la app.
  - **Hallazgo, solo en desarrollo:** el aviso rojo de LogBox por las teselas fallidas tapa "Detener actividad" y "Estoy bien", y reaparece. Salió sin red y también con red, por `ERR_NAME_NOT_RESOLVED` en el emulador (15 errores en M13), sin que el mapa dejara de cargar. No existe en un build de producción.

## Fase D — Animaciones

- [x] T17 — `lib/theme/motion.ts` con los tokens de duración, expuestos en `Theme`, y prueba de que ninguno pasa de 300 ms. (RN-5)

  Hecho (2026-11-06): `press` 100 ms, `release` 150, `content` 200 y `screen` 300, con 2 pruebas en `lib/theme/motion.test.ts`. Se empezó con T16 abierta por decisión del usuario, aunque RN-10 pide terminar antes el mapa. Aún no los usa ninguna pantalla. `screen` es solo una referencia: la duración real de la transición nativa se mide en T20 (R4).
- [x] T18 — `hooks/theme/useReducedMotion.ts` con `getReducedMotion()`. Con la opción activa, la cámara del mapa se mueve sin transición. (CA-27)

  Hecho (2026-11-06): el hook usa `AccessibilityInfo` y guarda el valor fuera de React, para que `getReducedMotion()` funcione en las opciones de navegación. `RecordingMap` usa duración 0 con la opción activa. Probado en el emulador con un registro temporal, ya retirado: la cámara pasó de 1000 a 0 durante una grabación, sin reiniciar, y usó 0 desde el inicio al abrir la app con la opción activa. Solo se comprobó la duración que se pide a la cámara, no el movimiento en pantalla; se ve en M19. M19 y el plan usaban `animator_duration_scale`, que React Native no lee: lee `transition_animation_scale`, y ya están corregidos.
- [x] T19 — `components/ui/PressableScale.tsx` y migración de `BaseBtn`, `Card`, `Chip`, `IconButton`, `SosButton`, `TabBar` y la fila de `activityHistoryPage`. (CA-20, CA-21, CA-22, CA-27)

  Hecho (2026-11-06): `PressableScale` escala a 0.97 y anima la capa de presionado de cada componente, con `motion.press` y `motion.release`. Con movimiento reducido no escala y la capa cambia sin transición. También se migró `MapViewToggle`, que no estaba en la lista porque se creó en T11. `SosButton` ya no lleva estado propio: la capa de `PressableScale` hace de indicador. Probado en el emulador: "Empezar" y "Pedir ayuda" se animan y vuelven a su estado normal, deslizar fuera de "Iniciar actividad" cancela sin ejecutar la acción, el doble toque en "Iniciar actividad" crea una sola actividad, y "Pedir ayuda" no se activa al soltar antes de 2 s y sí al mantener. Falta M14 en T24: los demás tipos de elemento, el botón deshabilitado y el movimiento reducido.
- [x] T20 — `RootStack` con `animation: 'slide_from_right'`. Medir la duración real en Android (R4). (CA-23)

  Hecho (2026-11-06) con `ios_from_right`, no `slide_from_right`, por R4. Medido en el emulador con `dumpsys gfxinfo framestats`, 3 veces de ida y 3 de vuelta entre Inicio y Nueva actividad: `slide_from_right` 450 ms, por encima de RN-5, e `ios_from_right` de 250 a 267 ms. Las dos entran por la derecha. Con movimiento reducido usa `none`. Sin comprobar a la vista el sentido de la vuelta ni el gesto del sistema: las capturas son demasiado lentas para atrapar la transición, y se ve en M15.
- [x] T21 — `HomeTabs` con `animation: 'fade'` y animación del indicador en `TabBar`, ambas sin movimiento con la opción reducida. (CA-24, CA-27)

  Hecho (2026-11-06): `fade` de `bottom-tabs` (150 ms de valor nominal) y `TabIndicator`, que crece a lo ancho y aparece con `motion.content`. Probado en el emulador: las 4 pestañas cambian, Rutas conserva su mapa y no hubo cierres. Con la opción reducida, un registro temporal, ya retirado, confirmó que la pestaña recibe `none`, y al apagarla vuelve a `fade` sin reiniciar. Medido con `framestats`, cada cambio da de 83 a 417 ms de cuadros seguidos, pero eso suma el toque, el fundido, el indicador y lo que dibuje cada pantalla, así que no mide cada animación por separado. Sin explicar: con la opción reducida quedan rachas irregulares de 17 a 267 ms, aunque un toque en una zona vacía no produce cuadros. Revisar en M19 si se ve movimiento. Sin comprobar: que el mapa de Rutas no parpadee, que se ve en M16.
- [x] T22 — `components/ui/Appear.tsx` en `Notice`, `Card` y las filas de las listas, con entrada y salida. Capa de selección animada en `Chip`. (CA-25, CA-27)

  Hecho (2026-11-06): `Appear` envuelve la condición en cada lugar de uso, no el componente, porque `{error && <Notice />}` lo desmonta antes de poder animar la salida. `useLeavingItems` y `lib/lists/leaving.ts`, con 7 pruebas, conservan la fila quitada en contactos y favoritas; en "Mis rutas" y el historial no se quita nada en pantalla, así que solo tienen entrada. Probado en el emulador con `motion.content` en 3 s y un contacto quitado solo en la lista local, ambos temporales y ya revertidos: las tarjetas entran, la fila sale en su lugar, la lista se acomoda sin hueco, y los chips cambian de fondo. Límites: `FlatList` vuelve a montar las filas al desplazarse, así que pueden repetir la entrada; las pantallas que devuelven otro contenido de inmediato (`RouteListNotice`, aviso de `RouteDetail`) solo tienen entrada; al salir un aviso, lo de abajo sube de golpe, sin animarse; y durante los 200 ms del chip el texto ya cambió y el contraste baja. Sin probar: quitar un contacto o favorita real, los avisos de `login` y `register`, y la opción reducida; se ven en M17 y M19.
- [x] T23 — `AreYouOkModal` con `animationType="none"` si la opción reducida está activa. (CA-26, CA-27)

  Hecho (2026-11-06): probado en el emulador con la opción activa y `EXPO_PUBLIC_SAFETY_DEBUG_MINUTES=1`. Un registro temporal, ya retirado, confirmó `none`; el aviso salió completo en la primera captura, con la cuenta en 1:00, y "Estoy bien" funcionó. Con la opción apagada sigue `slide`, que no cambió; el toque durante la entrada se revisa en M18.
- [x] T24 — Correr los casos M14 a M19 y anotar los resultados. (CA-20 a CA-27)

  Hecho (2026-11-06), en el emulador. M14 a M19 pasan con las notas de abajo.
  - **M14, pasa:** tarjeta de "Mis favoritas", fila, pestaña, chip y botón de ícono se animan y vuelven a su estado normal; botones, cancelar deslizando y doble toque se probaron en T19. "Enviar mensaje de prueba" deshabilitado no se anima.
  - **M15, pasa:** la ida se ve en una captura a media transición: la pantalla nueva entra por la derecha. El botón y el gesto del sistema regresan, y la duración es la de T20. El sentido de la vuelta no se atrapó en captura; lo indica la configuración nativa.
  - **M16, pasa:** las 4 pestañas cambian con fundido y el indicador se anima (T21). Al entrar a Rutas el mapa se ve vacío un momento y vuelve a buscar. No lo causan las animaciones: pasa igual sin `fade`, porque `exploreRoutesPage` vuelve a montar el mapa a propósito al entrar desde otra pestaña. El usuario lo aceptó y el resultado esperado de M16 se ajustó.
  - **M17, pasa:** chips y avisos se animan, y "Sin conexión" aparece y desaparece. Con autorización del usuario se quitó y se volvió a agregar el contacto "Beto": la fila se desvanece en su lugar y después la lista sube de golpe, sin animarse (límite de T22). La entrada de la fila nueva no se atrapó en captura, porque la tapa el diálogo "Contacto agregado". Beto queda al final de la lista, pendiente y con una invitación nueva.
  - **M18, pasa con una observación:** el aviso entra con `slide` y "Estoy bien" respondió a 150 y 400 ms de aparecer, sin enviar alerta. Un toque lanzado en cuanto cambió el foco de la ventana se perdió, y ese mismo toque repetido sí funcionó. Se vio una sola vez; probablemente llegó antes de que la hoja estuviera en su lugar, pero no se confirmó.
  - **M19, pasa:** con los tres ajustes en 0, la fila no escala y solo cambia la capa, las pestañas y la ida a otra pantalla cambian en un solo paso en capturas cada 100 ms, y la grabación funciona (4 puntos, 330 m). Eso deja sin movimiento visible los cuadros sin explicar de T21, aunque las capturas no descartan algo más corto. La cámara se revisó en T18 y el aviso en T23.

## Cierre

- [x] T25 — Repetir los casos manuales de las specs 001 a 009 y actualizar los pasos de grabación que cambien. Corregir en las specs 003 y 009 las notas sobre el mapa de grabación, con entrada en su historial. (CA-28)

  Cerrada con pendientes por decisión del usuario (2026-11-06), en el emulador: CA-28 queda parcial. Notas de las specs 003 y 009 corregidas, y 003 M1 actualizado porque los chips ya no se muestran al grabar. Sin fallos en lo que se corrió, salvo el hallazgo de abajo. Varios se corrieron en versión corta, con recorridos simulados de pocos puntos, o se tomaron de los casos M10 y M14 de esta spec.
  - **Pasan:** 001 M1. 002 M1, M2, M3 y M5. 003 M1, M4, M5, M6 y M7. 004 M2, M6 y M9, y M7 sin el paso de la cuenta vacía. 005 M1 y M5. 006 M1, M2, M4 y M5. 008 M4 y M7. 009 M2 y M3. También 007 M4 en lo que no cambia datos: el detalle abre y muestra todo, sin tocar la favorita. 008 M5 solo con `TELEGRAM_MODE=log`.
  - **Hallazgo, corregido:** al salir de la grabación con "Terminar", la actividad quedaba sin métricas ni subida hasta reabrir la app. Ahora `closeOnUnmount` calcula las métricas y pide la sincronización, como al detener.
  - **Segunda ronda, pasan:** 001 M4, 002 M4 y M6, 005 M2, M4, M5 (paso 3) y M7, 006 M3, M6, M7 y M8, 003 M3 y 004 M10 (dos saltos de unos 800 km no sumaron distancia). 009 M4 parcial: sin elementos menores de 48 dp en 5 pantallas, medido con `uiautomator`, sin contar `hitSlop`. 004 M5 corrido con GPS simulado fijo, que no tiene titubeo.
  - **Tercera ronda, pasan:** 001 M2 y M3. 003 M2 (tras borrar los datos de la app) y M8 (con Metro `--no-dev`: encendida 65 s grabando y apagada menos de 18 s después de detener). 004 M8 y el paso de lista vacía de M7. 005 M8 (77 actividades recuperadas, igual que en el servidor; una comparada campo por campo), M9 y M10. 007 M2 a M5 y M7. 008 M6, M9 y M8 pasos 1 a 3 (`returnBy` adelantado con un script sobre esa sesión). 009 M5.
  - **Pasan en parte:** 005 M3: la grabación arrancó bien, pero las 3 pendientes seguían sin subir a los 20 s y subieron después, sin comprobar si fue durante la grabación. 007 M1: faltó el resumen de una pendiente. 007 M6: editar, archivar, volver a publicar y borrar funcionan en "Mis rutas", pero no se revisó el mapa tras archivar ni que el resumen vuelva a ofrecer publicar. 008 M10: 29 puntos con la pantalla bloqueada, sin pregunta tras detener y sin solicitudes de ubicación, pero `LocationTaskService` sigue listado en `dumpsys` y el aviso de la notificación no se confirmó a la vista.
  - **Hallazgo, corregido:** una actividad grabada antes de la spec 003 CA-13 conservaba su punto viejo al publicarse: la actividad 47 mide 1.56 km, pero su perfil llegaba a 148 km y el mapa dibujaba una línea recta de unos 140 km. Ahora la ruta, su inicio, el perfil y la zona propuesta empiezan en el primer punto real (spec 007, CA-28, RN-10). Ninguna ruta publicada estaba afectada. Límites: la distancia guardada de una actividad antigua no se recalcula, así que un punto viejo que sumó kilómetros los conserva; y un salto a media actividad sigue dibujando una línea en la ruta publicada.
  - **Observado una vez:** un intento de publicar falló por `DatabaseNotReachable` entre el backend y Supabase, y funcionó al reintentar. El mensaje dijo que faltaba internet, aunque había red.
  - **Sin correr:** 008 M1 y M2 (teléfono real con Telegram), 008 M3 (sin contactos, requiere quitar los tres), 008 M8 paso 4, 007 M8 en otro dispositivo (se probó cerrando sesión en el mismo) y 009 M1 (comparación con Figma, a cargo del usuario).
  - **No aplican aquí:** 004 M3 y M4 (barómetro e iOS), 005 M6 (opcional).
- [x] T26 — Ejecutar `/spec-verify`, y actualizar el estado de la spec y `specs/roadmap.md`. Pasar a 011-estabilidad la medición de batería con los límites de 30 % y 15 %.

## Cobertura

Los 28 criterios tienen al menos una tarea y una forma de verificarse. RN-5 se cubre con T17 y T20. Los límites de batería no se verifican aquí: la spec los deja para 011-estabilidad.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | Caso manual M1 | Manual | Cumple (emulador, 2026-11-06) |
| CA-2 | Caso manual M2 | Manual | Cumple (emulador) |
| CA-3 | `frontend/lib/map/heading.test.ts` y caso manual M2 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-4 | `frontend/lib/map/track.test.ts` y caso manual M2 | Automatizada y manual | Cumple (Vitest y emulador) |
| CA-5 | Caso manual M3 | Manual | Cumple (emulador) |
| CA-6 | Caso manual M4 | Manual | Cumple con observación: la alerta activa tapa el marcador con letra al 200 % o junto a otro aviso |
| CA-7 | Caso manual M5 | Manual | Cumple (emulador) |
| CA-8 | Caso manual M6 | Manual | Cumple (emulador, `dumpsys location`) |
| CA-9 | Caso manual M7 | Manual | Cumple (emulador) |
| CA-10 | Caso manual M8 | Manual | Cumple (emulador) |
| CA-11 | Caso manual M8 | Manual | Cumple (emulador) |
| CA-12 | Caso manual M8 | Manual | Cumple (emulador) |
| CA-13 | Caso manual M9 | Manual | Cumple (arrastre con `adb`; dos dedos probados a mano por el usuario) |
| CA-14 | Caso manual M9 | Manual | Cumple (emulador) |
| CA-15 | Caso manual M10 | Manual | Cumple (emulador) |
| CA-16 | Caso manual M11 | Manual | Cumple (emulador) |
| CA-17 | Caso manual M12 | Manual | Cumple (emulador) |
| CA-18 | Caso manual M13 | Manual | Cumple (emulador) |
| CA-19 | Caso de revisión F1 | Revisión | Cumple: aprobación del usuario en el historial (2026-11-05) |
| CA-20 | Caso manual M14 | Manual | Cumple (emulador) |
| CA-21 | Caso manual M14 | Manual | Cumple (emulador) |
| CA-22 | Caso manual M14 | Manual | Cumple (emulador) |
| CA-23 | Caso manual M15 | Manual | Cumple con `ios_from_right`, de 250 a 267 ms. El sentido de la vuelta sale de la configuración nativa, no se vio en captura |
| CA-24 | Caso manual M16 | Manual | Cumple (emulador) |
| CA-25 | Caso manual M17 | Manual | Cumple con límites de T22: lo de abajo sube de golpe y `FlatList` puede repetir la entrada |
| CA-26 | Caso manual M18 | Manual | Cumple (emulador). Un toque inmediato se perdió una vez, a repetir en la 011 |
| CA-27 | Caso manual M19 | Manual | Cumple (emulador) |
| CA-28 | Caso manual M20 | Manual | Parcial: ver T25 y "Pendientes conocidos" |
| RN-3 | `frontend/lib/map/track.test.ts` | Automatizada | Cumple (Vitest) |
| RN-5 | `frontend/lib/theme/motion.test.ts` y caso manual M15 | Automatizada y manual | Cumple: Vitest y medición en T20; las pestañas solo por valor nominal |

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
1. Activar el modo avión, apagar Wi-Fi y datos (en el emulador el modo avión deja el Wi-Fi encendido) e iniciar una actividad.
2. Mover el GPS durante 2 minutos y detener la actividad.
- **Esperado:** se ve el aviso "Mapa sin conexión" y el trazo, sobre el mapa guardado en caché si la zona ya se vio, o sobre un fondo sin mapa si no. Los puntos y métricas aumentan, y el resumen muestra la actividad completa.

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
3. Medir la transición con `adb shell dumpsys gfxinfo com.sendabc.app framestats`, reiniciando antes con `reset`, o con un video de `adb shell screenrecord`.
- **Esperado:** la ida y la vuelta son animadas y van en sentido contrario. La duración es de 300 ms o menos, o queda anotada la diferencia para decisión del usuario (R4).

**M16 — Pestañas**
1. Cambiar entre las 4 pestañas, incluida Rutas con su mapa.
- **Esperado:** el contenido cambia con una animación y el indicador se anima. Al entrar a Rutas desde otra pestaña el mapa se recarga y busca de nuevo; es lo previsto (specs 006 y 009).

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
1. Activar la opción con `adb shell settings put global <ajuste> 0` para `transition_animation_scale`, `animator_duration_scale` y `window_animation_scale`, y reiniciar la app. React Native solo lee `transition_animation_scale`.
2. Repetir M2 y M14 a M18.
3. Restaurar los tres ajustes a 1.
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
- Al cambiar el tamaño de letra con la app abierta, los textos ya en pantalla quedan recortados hasta volver a abrir esa pantalla o la app (spec 003, CA-14). La grabación no se afecta.
- CA-28 parcial (T25): sin correr 008 M1, M2 y M3, 008 M8 paso 4, 007 M8 en otro dispositivo y 009 M1; en parte 005 M3, 007 M1, 007 M6 y 008 M10.
- Descarte de la ubicación vieja al iniciar (spec 003, CA-13): probado con Vitest, falta verlo en un teléfono real en la prueba de campo de la 011.
