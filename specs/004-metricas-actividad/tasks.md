# 004 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

Cada tarea indica los criterios de aceptación que cubre. Marca `[x]` al terminar. Las tareas de `lib/metrics` y `lib/format` incluyen sus pruebas Vitest (constitución 6.1, v1.3).

## Preparación

- [x] T1 — Instalar `expo-sensors` (`npx expo install expo-sensors`) y agregar su plugin a `app.json` con `motionPermission`: "SendaBC usa el sensor de presión para medir el desnivel de tus actividades." (CA-12, CA-13)
- [x] T2 — Agregar Vitest al frontend: dependencia de desarrollo, `vitest.config.ts` (entorno `node`, `include: ['lib/**/*.test.ts']`) y script `"test": "vitest run"`. Prueba mínima de `formatDuration` para confirmar que corre. (D1)

## Cálculo (funciones puras + pruebas)

- [x] T3 — `lib/metrics/constants.ts` (`MAX_ACCURACY_M = 20`, `BARO_NOISE_M = 3`, `GPS_NOISE_M = 10`) y `lib/metrics/geo.ts` con `haversineMeters`. Prueba: distancia entre dos coordenadas de referencia conocidas. (CA-7)
- [x] T4 — `lib/metrics/distance.ts`: `createDistanceAccumulator()` (filtro de precisión + promedio móvil de 5 puntos + ancla `max(5 m, precisión del ancla + precisión del nuevo)`, ver D3) y `computeDistance(points)`. (CA-7, CA-8, CA-9, CA-17)
  - Pruebas: recorridos sintéticos de 5 km de distancia conocida (error ≤ 1 %) y límite conocido en zigzag cerrado (< 7 %, ver Riesgos del plan); puntos con `accuracy > 20` ignorados; 150 puntos en 5 min con el teléfono quieto y ruido realista con semilla fija (gaussiano y deriva lenta, precisión 10 m) → < 20 m; 0 y 1 punto → 0.
- [x] T5 — `lib/metrics/elevation.ts`: `pressureToAltitude(hPa)`, `createElevationAccumulator(threshold)` con promedio de 5 altitudes e histéresis hasta el extremo (ver D4) y `computeElevation(altitudes, threshold)`. (CA-10, CA-11, CA-17)
  - Pruebas: subida y bajada en escalones conocidos → ganancia y pérdida exactas; rampa → exacta; subida con ruido GPS con semilla fija → cerca de la real; sierra y lomas → cerca de la real (límite conocido); oscilaciones de ±2 m con umbral 3 → 0/0; oscilaciones de ±8 m con umbral 10 → 0/0; `pressureToAltitude(1013.25) = 0` y una diferencia de presión conocida → diferencia de altitud esperada; lista vacía → 0/0.
- [x] T6 — `lib/metrics/summary.ts`: `createLiveMetrics(source)`, `computeActivityMetrics(...)`, `averagePace` y `averageSpeed`. (CA-4, CA-5, CA-6, CA-12, CA-13, CA-16, CA-17, RN-3)
  - Pruebas: duración = `endedAt − startedAt`; fuente `BAROMETER` con lecturas que usa `relativeAltitude` si existe y la presión si no; menos de 2 lecturas → toda la actividad con `GPS`; ritmo y velocidad con valores conocidos; distancia 0 → `null`; el acumulador incremental da el mismo resultado que el cálculo sobre la lista completa (CA-16); 5 400 puntos + 10 800 lecturas se calculan en menos de 100 ms (requisito de rendimiento).
- [x] T7 — `lib/format/metrics.ts`: `formatDistance`, `formatElevation`, `formatPace`, `formatSpeed`, con `—` para `null`. Pruebas con los ejemplos de RN-1 (`640 m`, `3.42 km`, `312 m`, `12:30 /km`, `18.4 km/h`). (CA-5, CA-6, RN-1)

## Datos locales

- [x] T8 — Migración SQLite **v3** en `lib/db/sqlite.ts`: columnas de métricas y `elevation_source` en `activities`, tabla `barometer_readings` con índice. (CA-14, CA-18)
- [x] T9 — En `lib/db/activities.ts`: `createActivity` recibe la fuente de elevación; nuevas `insertBarometerReading`, `getActivity`, `getActivityPoints`, `getBarometerReadings`, `saveMetrics`, `listFinishedActivities(userId)`. (CA-14, CA-18, CA-20, CA-24, RN-6)
- [x] T10 — `lib/db/activityMetrics.ts`: `finalizeMetrics(localId)` y `computeMissingMetrics()` (con `listActivityIdsMissingMetrics()` en `activities.ts`; las actividades sin fuente, anteriores a v3, usan GPS). (CA-18, CA-19, RN-4)

## Sensores y grabación

- [x] T11 — `lib/sensors/barometer.ts`: `prepareBarometer()` (disponibilidad + permiso en iOS con `DeviceMotion.requestPermissionsAsync()` → `'BAROMETER' | 'GPS'`) y `startBarometer(onReading)` a 1 lectura/s, con la hora tomada de `Date.now()`. (CA-12, CA-13)
- [x] T12 — Hook: en `start` llamar a `prepareBarometer`, guardar la fuente en la actividad y, si es `BAROMETER`, guardar cada lectura. Detener el barómetro en `stop` y en `closeOnUnmount`. (CA-12, CA-13, CA-14)
- [x] T13 — Hook: acumuladores en vivo; exponer `liveDistance` y `liveElevationGain`. (CA-15, CA-16)
- [x] T14 — Hook `stop()`: esperar a los guardados pendientes (corrige O1 de la spec 003), `finishActivity` → `finalizeMetrics` y devolver el `localId`. Quitar `savedPointCount`. (CA-1, CA-18) — Al quitar `savedPointCount` también se quitó de `ActivityPage` el mensaje "Actividad guardada" (parte de T16) para que la app siga compilando; hasta T16, al detener no se muestra nada.

## Pantallas

- [x] T15 — `pages/activity/activitySummaryPage.tsx` y ruta `ActivitySummary` (`{ localId, origin }`): tipo, fecha y hora de inicio, duración, distancia, elevación ganada y perdida, ritmo o velocidad según el tipo, "N puntos registrados" y etiqueta de la fuente. Botón "Listo" (`goBack`) solo con `origin: 'recording'`. (CA-1, CA-2, CA-3, CA-5, CA-6, CA-12, CA-13, CA-17, CA-21)
- [x] T16 — `ActivityPage`: mostrar distancia y elevación en vivo; al detener, `navigation.replace('ActivitySummary', { localId, origin: 'recording' })`; quitar el mensaje "Actividad guardada" (ya quitado en T14). (CA-1, CA-2, CA-15)
- [x] T17 — `pages/activity/activityHistoryPage.tsx`, ruta `ActivityHistory` y botón "Mis actividades" en `MainPage`: lista con fecha, tipo, duración y distancia, más reciente primero; recarga con `useFocusEffect`; mensaje cuando está vacía; al tocar una fila, `ActivitySummary` con `origin: 'history'`. (CA-20, CA-21, CA-22, CA-23, CA-24)
- [x] T18 — `Gate` en `App.tsx`: llamar a `computeMissingMetrics()` después de `closeOrphanActivities()` antes de mostrar la navegación. (CA-19)

## Documentación

- [x] T19 — Spec 003: anotar en su historial que el mensaje de CA-8 se reemplaza por el resumen (que muestra el mismo N) y que O1 quedó corregida por T14; actualizar sus observaciones en `tasks.md`.

## Cambios tras pruebas

- [x] T20 — `lib/metrics/distance.ts`: reinicio por saltos imposibles (`MAX_SPEED_MS = 50`, ver D3); los puntos de distancia llevan `recordedAt`. Pruebas: salto inicial Mountain View → Ensenada no suma; brinco aislado de 500 m pierde menos de 20 m; bajada en bici a 25 m/s sí cuenta; puntos con la misma hora no fallan. (CA-25)

## Cobertura

Los 25 CA están cubiertos por al menos una tarea.

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | M1 | Manual | Cumple (emulador, 2026-10-06) |
| CA-2 | M1 | Manual | Cumple (emulador, 2026-10-06) |
| CA-3 | M2 | Manual | Cumple (emulador, 2026-10-15, durante los casos M2 y M8 de la spec 005): con modo avión, el resumen se mostró completo al detener |
| CA-4 | `summary.test.ts` › duración | Automatizada | Cumple (Vitest) |
| CA-5 | `summary.test.ts` › ritmo y velocidad · `metrics.test.ts` (formato) · M1 (se ve el correcto según el tipo) | Ambas | Cumple (Vitest + M1 emulador, 2026-10-06) |
| CA-6 | `summary.test.ts` › distancia 0 · `metrics.test.ts` › `—` | Automatizada | Cumple (Vitest; M9 muestra `—`) |
| CA-7 | `geo.test.ts` · `distance.test.ts` › recorrido conocido ≤ 1 % | Automatizada | Cumple (Vitest) |
| CA-8 | `distance.test.ts` › descarta precisión > 20 m | Automatizada | Cumple (Vitest) |
| CA-9 | `distance.test.ts` › quieto 5 min < 20 m · M5 | Ambas | Cumple: Vitest ok · M5 en el S9+ al aire libre, 0 m (spec 011, M29, 2026-11-20) |
| CA-10 | `elevation.test.ts` › ganancia y pérdida | Automatizada | Cumple (Vitest; ganancia y pérdida de 50 m simuladas (emulador, 2026-10-06)) |
| CA-11 | `elevation.test.ts` › oscilaciones dentro del umbral | Automatizada | Cumple (Vitest) |
| CA-12 | `summary.test.ts` › fuente barómetro · M3 | Ambas | Cumple: Vitest ok · M3 en el S9+ con un piso, 3.8 m con barómetro, aceptado por el usuario (spec 011, M29, 2026-11-20) |
| CA-13 | `summary.test.ts` › menos de 2 lecturas → GPS · M4 | Ambas | Cumple: Vitest ok · M4 en el Nothing Phone 2, sin barómetro: "Elevación estimada con GPS" (spec 011, M29) |
| CA-14 | M3 (la fuente queda en barómetro, lo que exige lecturas guardadas) + revisión de código (solo se escucha entre iniciar y detener) | Manual | Cumple: M3 en el S9+ quedó con fuente barómetro, lo que exige lecturas guardadas (spec 011, M29, 2026-11-20) |
| CA-15 | M1 | Manual | Cumple (emulador, 2026-10-06) |
| CA-16 | `summary.test.ts` › acumulador incremental = cálculo completo | Automatizada | Cumple (Vitest; en vivo = resumen (emulador, 2026-10-06)) |
| CA-17 | `distance.test.ts`, `elevation.test.ts`, `summary.test.ts` (0 y 1 punto) · M9 | Ambas | Cumple (Vitest + M9 emulador, 2026-10-06) |
| CA-18 | M6 (el historial muestra métricas leídas de SQLite) + revisión de código | Manual | Cumple (emulador, 2026-10-06) |
| CA-19 | M6 | Manual | Cumple (emulador, 2026-10-06) |
| CA-20 | M7 | Manual | Cumple (emulador, 2026-10-06) |
| CA-21 | M7 | Manual | Cumple (emulador, 2026-10-06) |
| CA-22 | M7 | Manual | Cumple (emulador, 2026-10-15, caso M9 de la spec 005): una cuenta sin actividades ve "Aún no tienes actividades…" |
| CA-23 | M2 | Manual | Cumple (emulador, 2026-10-15, caso M8 de la spec 005): la lista y los resúmenes se ven en modo avión |
| CA-24 | M8 | Manual | Cumple (emulador, 2026-10-15, caso M9 de la spec 005): con otra cuenta en el mismo teléfono la lista quedó vacía |
| CA-25 | `distance.test.ts` › saltos imposibles · M10 | Ambas | Cumple (Vitest + M10 emulador, 2026-10-06) |

Requisito de rendimiento (< 1 s): `summary.test.ts` › 5 400 puntos + 10 800 lecturas < 100 ms, más la observación en M1.

### Casos manuales

Hacerlos en un dispositivo físico (el barómetro no existe en emuladores y en web).

**M1 — Flujo completo**
1. Pestaña Inicio → "Empezar" (tarjeta "Nueva actividad") → "Senderismo" → "Iniciar". Caminar ~10 minutos con alguna subida (rampa o escaleras).
2. Mirar la pantalla durante la grabación.
3. Presionar "Detener actividad".
4. Presionar "Listo" y luego el botón atrás.
- **Esperado:** en (2), la distancia y la elevación ganada suben conforme avanzas. En (3), el resumen aparece en menos de 1 s con tipo, fecha y hora, duración, distancia, elevación ganada y perdida, ritmo en `min/km`, "N puntos registrados" y la etiqueta de la fuente. En (4), "Listo" lleva a la pestaña Inicio y atrás no regresa al resumen ni a la actividad. Repetir con "Ciclismo": se muestra velocidad en `km/h`.

**M2 — Sin conexión**
1. Activar modo avión. Grabar ~3 minutos y detener.
2. Abrir la pestaña Actividades y tocar la actividad.
- **Esperado:** el resumen y la lista se muestran completos, igual que con conexión.

**M3 — Elevación con barómetro**
1. En un teléfono con barómetro, iniciar una actividad al pie de una escalera, subir 3 pisos (~9 m) y detener arriba.
- **Esperado:** el resumen dice "Elevación medida con barómetro" y la elevación ganada está entre 6 y 12 m.

**M4 — Elevación con GPS**
1. En iOS, negar el permiso de movimiento al iniciar (o usar un teléfono sin barómetro). Grabar ~3 minutos y detener.
- **Esperado:** la actividad se graba normalmente y el resumen dice "Elevación estimada con GPS".

**M5 — Quieto**
1. Iniciar una actividad al aire libre y dejar el teléfono quieto 5 minutos. Detener.
- **Esperado:** distancia menor a 20 m.

**M6 — Actividad interrumpida**
1. Iniciar una actividad, caminar ~2 minutos y cerrar la app a la fuerza.
2. Abrir la app → pestaña Actividades.
- **Esperado:** la actividad aparece con duración y distancia calculadas; su resumen muestra todas las métricas.

**M7 — Historial**
1. Con una cuenta sin actividades, abrir la pestaña Actividades.
2. Grabar dos actividades y volver a abrir la lista.
3. Tocar la primera fila y luego el botón atrás.
- **Esperado:** (1) mensaje invitando a iniciar una actividad. (2) dos filas con fecha, tipo, duración y distancia, la más reciente arriba. (3) se abre su resumen sin botón "Listo" y atrás regresa a la lista.

**M8 — Otro usuario en el mismo teléfono**
1. Con la cuenta A con actividades, cerrar sesión e iniciar sesión con la cuenta B.
2. Abrir la pestaña Actividades.
- **Esperado:** no aparece ninguna actividad de A.

**M9 — Actividad sin movimiento**
1. "Iniciar" y "Detener" de inmediato.
- **Esperado:** el resumen muestra distancia 0, elevación ganada y perdida 0 y ritmo o velocidad `—`, sin errores.

**M10 — Salto de ubicación (emulador)**
1. En el emulador, dejar la ubicación por defecto (Mountain View). "Iniciar".
2. En Extended controls → Location → Routes, reproducir una ruta en Baja California de ~500 m a velocidad de caminata. Detener al terminar.
- **Esperado:** la distancia del resumen es de unos 500 m (no cientos de km) y el ritmo es razonable (p. ej. `10:00–15:00 /km`).

## Commits propuestos

| # | Commit | Tareas |
|---|---|---|
| 1 | `chore(004): agregar expo-sensors y Vitest al frontend` | T1, T2 |
| 2 | `feat(004): cálculo de distancia, elevación y resumen con pruebas` | T3–T7 |
| 3 | `feat(004): esquema SQLite v3 y persistencia de métricas` | T8–T10 |
| 4 | `feat(004): barómetro y métricas en vivo en la grabación` | T11–T14 |
| 5 | `feat(004): pantallas de resumen e historial de actividades` | T15–T18 |
| 6 | `test(004)`/`fix(004)`: ajustes encontrados en los casos manuales | — |
| 7 | `docs(004): actualizar spec 003 y verificación de la 004` | T19 |

## Pendientes conocidos

Para pasar la spec a *Implementada*, ejecutar en un dispositivo físico:

- [x] M2 — Sin conexión (CA-3, CA-23). Verificado en el emulador durante la spec 005.
- [ ] M3 — Elevación con barómetro (CA-12, CA-14).
- [ ] M4 — Elevación con GPS (CA-13).
- [ ] M5 — Quieto 5 minutos (CA-9).
- [x] M7, paso 1 — Historial vacío con una cuenta sin actividades (CA-22). Verificado en el emulador durante la spec 005.
- [x] M8 — Otro usuario en el mismo teléfono (CA-24). Verificado en el emulador durante la spec 005.
