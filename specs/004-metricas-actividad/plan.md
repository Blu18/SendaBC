# 004 — Plan técnico

Estado: **Aprobado** (2026-10-05)

Spec: [spec.md](spec.md)

## Resumen

Todo ocurre en el frontend; el backend no cambia. Durante la grabación, además del GPS (spec 003), se leen el barómetro una vez por segundo y se guardan esas lecturas en SQLite. Los cálculos (distancia, elevación ganada/perdida, duración, ritmo/velocidad) viven en funciones puras de TypeScript en `frontend/lib/metrics/`, que se usan de dos formas:

- **En vivo:** acumuladores incrementales dentro de `useActivityTracker` (CA-15, CA-16).
- **Al terminar:** se recalcula todo con lo guardado en SQLite y se guardan las métricas en la actividad (CA-18, RN-4).

Al detener, la app navega a una pantalla de resumen. Una pantalla nueva, "Mis actividades", lista las actividades terminadas y abre el mismo resumen.

## Verificación contra la constitución

- [x] **Art. 2.1 Offline-first:** cálculo, resumen e historial salen de SQLite; no hay llamadas de red.
- [x] **Art. 2.3:** calcular métricas no cambia el estado de la actividad (`PENDING_SYNC` se mantiene).
- [x] **Art. 2.4:** las lecturas del barómetro y las métricas se guardan en el teléfono hasta la sincronización.
- [x] **Art. 3.5 Privacidad:** el barómetro se escucha solo entre "Iniciar" y "Detener". En iOS se pide el permiso de movimiento con un texto de propósito propio.
- [x] **Art. 4 Contratos de API:** no aplica (sin endpoints nuevos).
- [x] **Art. 5.3:** el esquema SQLite pasa a **v3** con un paso nuevo en `migrate()`.
- [x] **Art. 5.4 Unidades:** metros, segundos, ISO 8601. Los nombres de las métricas reflejan los campos de Prisma (`distanceMeters`, `durationSeconds`, `elevationGainMeters`, `elevationLossMeters`).
- [x] **Art. 6.1 Verificación:** CA-7, CA-9 y CA-11 piden datos de prueba exactos, que no se pueden comprobar a mano. Se propone agregar **Vitest al frontend** solo para los módulos puros de `lib/metrics/` y `lib/format/`. Enmienda aprobada: constitución v1.3 (D1).
- [x] **Art. 7.1 Stack:** `expo-sensors` ya está en el stack. Vitest en el frontend es nuevo (D1).

## Backend

Sin cambios. El modelo `Activity` de Prisma ya tiene `distanceMeters`, `durationSeconds`, `elevationGainMeters` y `elevationLossMeters`; la spec 005 los llenará con lo calculado aquí.

La **fuente de la elevación** (barómetro o GPS) no existe en Prisma. Se guarda solo en el teléfono; la spec 005 decidirá si se sube.

## Frontend

### Dependencias

- `expo-sensors` (`npx expo install expo-sensors`), con el plugin en `app.json`:
  ```json
  ["expo-sensors", { "motionPermission": "SendaBC usa el sensor de presión para medir el desnivel de tus actividades." }]
  ```
- `vitest` como dependencia de desarrollo (D1), con el script `npm test`.

### Esquema SQLite v3 (`frontend/lib/db/sqlite.ts`)

```sql
-- v3: métricas y fuente de elevación por actividad (CA-18, RN-3)
ALTER TABLE activities ADD COLUMN elevation_source TEXT;        -- 'BAROMETER' | 'GPS'
ALTER TABLE activities ADD COLUMN distance_meters REAL;          -- NULL = aún no calculadas
ALTER TABLE activities ADD COLUMN duration_seconds INTEGER;
ALTER TABLE activities ADD COLUMN elevation_gain_meters REAL;
ALTER TABLE activities ADD COLUMN elevation_loss_meters REAL;

-- v3: lecturas del barómetro (CA-14)
CREATE TABLE barometer_readings (
  local_id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL REFERENCES activities(local_id) ON DELETE CASCADE,
  recorded_at TEXT NOT NULL,          -- hora del teléfono al recibir la lectura
  pressure_hpa REAL NOT NULL,
  relative_altitude_m REAL            -- solo iOS
);
CREATE INDEX idx_baro_activity_time ON barometer_readings(activity_id, recorded_at);
```

`distance_meters IS NULL` en una actividad terminada significa "métricas pendientes". Así también se calculan las actividades viejas (anteriores a v3) y las huérfanas.

### Cálculo: `frontend/lib/metrics/` (funciones puras, sin imports de React Native)

| Archivo | Contenido |
|---|---|
| `geo.ts` | `haversineMeters(a, b)`: distancia sobre la esfera terrestre (radio 6 371 008.8 m). |
| `distance.ts` | `createDistanceAccumulator()` con `add(point)` y `value`; `computeDistance(points)` lo usa sobre la lista completa. |
| `elevation.ts` | `pressureToAltitude(hPa)`; `createElevationAccumulator(threshold)` con `add(altitude)`, `gain` y `loss`; `computeElevation(altitudes, threshold)`. |
| `summary.ts` | `createLiveMetrics(source)`: acumulador combinado de distancia y elevación (`addPoint`, `addBarometerReading`), que usan el hook en vivo y `computeActivityMetrics` (D2). `computeActivityMetrics({ points, barometerReadings, source, startedAt, endedAt })` → `{ distanceMeters, durationSeconds, elevationGainMeters, elevationLossMeters, elevationSource }`; `durationSeconds(startedAt, endedAt)`; `averagePace(distance, duration)` (s/km) y `averageSpeed(distance, duration)` (km/h). |
| `constants.ts` | `MAX_ACCURACY_M = 20`, `SMOOTHING_WINDOW = 5`, `MIN_STEP_M = 5`, `BARO_NOISE_M = 3`, `GPS_NOISE_M = 10`. |

**Distancia (CA-7, CA-8, CA-9):**
1. Se descartan los puntos con `accuracy > 20 m`. Los puntos sin dato de precisión (`null`) se aceptan.
2. Cada punto válido se **suaviza**: su posición y su precisión pasan a ser el promedio de los últimos 5 puntos válidos (`SMOOTHING_WINDOW = 5`). Los puntos sin precisión cuentan como 0 m en ese promedio.
3. Se usa un punto **ancla** (un punto suavizado): se mide la distancia del punto suavizado nuevo al ancla. Solo si supera `max(5 m, precisión del ancla + precisión del punto nuevo)`, se suma al total y el punto nuevo pasa a ser el ancla. El umbral suma ambas precisiones porque las dos posiciones tienen error: con el teléfono quieto, dos lecturas pueden quedar separadas hasta el doble de su precisión. El movimiento real se acumula hasta cruzar el umbral y no se pierde; el promedio solo agrega un retraso de unos 2 puntos al final del recorrido.

**Elevación (CA-10, CA-11), con promedio e histéresis:**
- Cada altitud se promedia con las anteriores hasta completar las últimas 5 (`SMOOTHING_WINDOW`, la misma ventana que la distancia), en ambas fuentes.
- Histéresis **hasta el extremo**: se guarda una altitud de referencia (ya promediada). Cuando la altitud se aleja de ella al menos un umbral, se confirma una dirección (subida o bajada) y se recuerda el extremo alcanzado (la altitud más alta al subir, la más baja al bajar). Cuando la altitud se regresa al menos un umbral desde ese extremo, se confirma la cumbre (o el valle): se suma `extremo − referencia` a `gain` (o a `loss`), el extremo pasa a ser la referencia y la dirección se invierte. Las oscilaciones menores al umbral nunca confirman una dirección y no suman.
- Al terminar, y en vivo, la subida o bajada en curso se cuenta hasta su extremo actual. Así la ganancia en vivo nunca decrece.
- Umbral: 3 m con barómetro, 10 m con GPS.

**Altitud según la fuente:**
- Barómetro en **iOS:** `relativeAltitude` (CMAltimeter ya la entrega filtrada, en metros). La primera lectura decide si la actividad usa altitud relativa o presión, para no mezclar escalas.
- Barómetro en **Android:** `pressureToAltitude(pressure)` = `44330 × (1 − (p / 1013.25)^0.1903)`. La presión de referencia no importa porque solo se usan diferencias.
- **GPS:** `altitude` de los puntos que pasan el filtro de precisión.

**Fuente por actividad (RN-3, CA-12, CA-13):**
- Se decide al iniciar: si `Barometer.isAvailableAsync()` devuelve verdadero y, en iOS, se concede el permiso de movimiento → `BAROMETER`. Si no → `GPS`.
- Si al terminar hay menos de 2 lecturas del barómetro, toda la actividad usa `GPS` y la fuente se guarda como `GPS`.

**Duración (CA-4):** `endedAt − startedAt` en segundos.

**Ritmo y velocidad (CA-5, CA-6, RN-5):** se calculan al mostrar, sin guardarse. Si la distancia (o la duración) es 0, devuelven `null` y la pantalla muestra `—`.

### Sensores: `frontend/lib/sensors/barometer.ts`

- `prepareBarometer()`: revisa si hay barómetro y pide el permiso. Devuelve `'BAROMETER' | 'GPS'`.
- `startBarometer(onReading)`: `Barometer.setUpdateInterval(1000)` y `addListener`. Devuelve la función para detenerlo.
- La hora de cada lectura se toma con `Date.now()` al recibirla. El `timestamp` del sensor está en segundos desde un origen que cambia según la plataforma.

### Datos: `frontend/lib/db/`

En `activities.ts`, funciones nuevas:
- `insertBarometerReading(activityId, reading)`
- `getActivity(localId)`, `getActivityPoints(localId)`, `getBarometerReadings(localId)`
- `saveMetrics(localId, metrics)`
- `listFinishedActivities(userId)`: `status != 'RECORDING' AND user_id = ?`, ordenadas por `startedAt DESC` (CA-20, CA-24, RN-6)

En `activityMetrics.ts` (nuevo):
- `finalizeMetrics(localId)`: lee puntos y lecturas, llama a `computeActivityMetrics` y guarda el resultado.
- `computeMissingMetrics()`: aplica `finalizeMetrics` a toda actividad terminada con `distance_meters IS NULL` (CA-19), obtenidas con `listActivityIdsMissingMetrics()`. Las actividades sin `elevation_source` (anteriores a v3) se calculan con GPS. Si una falla, sigue con las demás para no bloquear el arranque.

### Hook `frontend/hooks/activity/activityTracker.hook.ts`

- `start(type)`: después del permiso de ubicación, llama a `prepareBarometer()` y guarda la fuente en la actividad. Si la fuente es `BAROMETER`, arranca `startBarometer` y guarda cada lectura.
- Acumuladores en vivo de distancia y elevación, alimentados por los puntos GPS y por el barómetro. Expone `liveDistance` y `liveElevationGain` (CA-15).
- `stop()`:
  1. detiene GPS y barómetro;
  2. **espera a que terminen los guardados pendientes** (los `insertPoint` e `insertBarometerReading` en curso), lo que corrige la observación O1 de la spec 003;
  3. llama a `finishActivity` y luego a `finalizeMetrics`;
  4. devuelve el `localId` para navegar al resumen.
- Al desmontar, `closeOnUnmount` también detiene el barómetro. Las métricas de esa actividad las calcula `computeMissingMetrics` al reabrir la app.
- `savedPointCount` se elimina del hook. El número de puntos ahora lo muestra el resumen.

### Formato: `frontend/lib/format/`

En `metrics.ts` (nuevo): `formatDistance` (`640 m` / `3.42 km`), `formatElevation` (`312 m`), `formatPace` (`12:30 /km`), `formatSpeed` (`18.4 km/h`) y `—` para `null` (RN-1). `formatDuration` ya existe.

### Pantallas y navegación

Rutas nuevas en `App.tsx`:

| Ruta | Pantalla | Parámetros |
|---|---|---|
| `ActivitySummary` | `pages/activity/activitySummaryPage.tsx` | `{ localId: number; origin: 'recording' \| 'history' }` |
| `ActivityHistory` | `pages/activity/activityHistoryPage.tsx` | — |

- **`ActivityPage`:** agrega distancia y elevación ganada en vivo junto al tiempo y los puntos. Al detener usa `navigation.replace('ActivitySummary', { localId, origin: 'recording' })`, que saca la pantalla de grabación del stack. El mensaje "Actividad guardada" se quita.
- **`ActivitySummaryPage`:** muestra lo pedido en CA-1, más "N puntos registrados" (para no perder el CA-8 de la spec 003) y la etiqueta de la fuente de elevación.
  - Con `origin: 'recording'`, muestra el botón "Listo", que hace `goBack()` a `MainPage` (CA-2).
  - Con `origin: 'history'`, no hay botón "Listo": atrás regresa a la lista (CA-21).
- **`ActivityHistoryPage`:** `FlatList` con fecha, tipo, duración y distancia, más un mensaje cuando no hay actividades (CA-22). Recarga al recibir el foco (`useFocusEffect`) para mostrar las actividades recién terminadas.
- **`MainPage`:** agrega el botón "Mis actividades".

### Arranque (`App.tsx`, `Gate`)

Después de `closeOrphanActivities()`, se llama a `computeMissingMetrics()`, y la navegación espera a que termine (CA-19).

### Cambio en la spec 003

El mensaje "Actividad guardada: N puntos" (003, CA-8) se reemplaza por la pantalla de resumen, que muestra el mismo N. Al implementar, se anota en el historial de la spec 003.

## Decisiones

| # | Decisión | Alternativas consideradas | Motivo |
|---|---|---|---|
| D1 | **Vitest en el frontend**, solo para módulos puros (`lib/metrics`, `lib/format`) | `jest-expo` (pruebas de componentes RN); seguir solo con casos manuales | CA-7, CA-9 y CA-11 necesitan datos exactos que no se pueden comprobar a mano. Vitest ya se usa en el backend y no necesita el runtime de RN para funciones puras. **Requiere enmendar la constitución (6.1 y tabla del stack → v1.3).** |
| D2 | Funciones puras con acumuladores incrementales, usadas en vivo y al final | Un cálculo en vivo y otro distinto al final | Una sola implementación: lo que se ve en vivo coincide con el resumen (CA-16). |
| D3 | Promedio móvil de 5 puntos + ancla con umbral `max(5 m, precisión del ancla + precisión del nuevo)` contra el titubeo del GPS | Ancla con umbral `max(5 m, accuracy del nuevo)` (versión original); solo la suma de precisiones; filtro de Kalman | Simulación con el teléfono quieto 5 min (150 puntos, precisión 10 m, 200 semillas): la versión original suma ~800–1 300 m con ruido independiente y ~70 m con deriva lenta, así que no cumple CA-9; solo la suma de precisiones aún suma ~345 m con ruido gaussiano; promedio + suma da 0 m de mediana (máx. 23 m) y mide 0.97–0.99 de la distancia real caminando. Sigue siendo un acumulador incremental (D2). Si en la prueba de campo (009) no basta, se cambia. |
| D4 | Promedio móvil de 5 altitudes + histéresis hasta el extremo, en ambas fuentes | Histéresis con la referencia en el punto de cruce (versión original), con o sin promedio; promedio solo con GPS; suavizar y luego sumar todas las diferencias | La histéresis cumple CA-11 por definición. **Promedio:** sin él, con altitud GPS de error independiente por lectura (σ 4 m), una subida de 200 m da ~970 m de ganancia en simulación y 30 min quieto ~410 m; con él, ~200 m y 0 m (máx. 11 m). **Extremo:** con la referencia en el punto de cruce se pierde hasta un umbral a cada lado de cada cumbre; con GPS sin ruido, una sierra de 6 cumbres de 50 m da 190 de 300 m y lomas de 20 m dan 11 de 400 m. Contando hasta el extremo: 293 y 356 m (293–305 y 373–398 m con ruido). Una sola ventana y un solo algoritmo para ambas fuentes. |
| D5 | `relativeAltitude` en iOS, fórmula barométrica en Android | Fórmula en ambos | En iOS, CMAltimeter ya entrega una altitud relativa filtrada. Android solo da presión. |
| D6 | Las métricas se guardan como columnas de la actividad; ritmo y velocidad no | Recalcular siempre al abrir el resumen | La spec 005 sube estos campos sin recalcular (CA-18). Ritmo y velocidad se derivan (RN-5). |
| D7 | Barómetro a 1 lectura por segundo, una fila por lectura | Guardar promedios por bloques | ~10 800 filas en 3 h es poco para SQLite, y deja los datos crudos para la 009. |
| D8 | Historial con `useState` + `useFocusEffect` y no TanStack Query | TanStack Query sobre SQLite | TanStack Query se usa para datos remotos. Con datos locales basta recargar al recibir el foco. |

## Riesgos

- **Distancia subestimada en curvas cerradas y al final:** el promedio y el umbral del ancla recortan las esquinas. En simulación, un zigzag de sendero (vueltas de 90° cada ~100 m) caminando con precisión 5–10 m queda 3–6 % corto, y con puntos cada 10 m ~10 % (vueltas así de cerradas son raras en bici). Además, el último tramo que no alcanza el umbral y el retraso del promedio (~2 puntos) no se suman: una pérdida fija de 10–60 m por actividad, menor a 1 % a partir de ~5 km. Sumar el camino entre anclas en lugar de la cuerda corrige las curvas pero vuelve a contar ruido (hasta 1.5× en recta), así que se descartó. `distance.test.ts` fija el límite del zigzag (< 7 %); se mide con datos reales en la 009.
- **Elevación con GPS en terreno ondulado y en paradas:** el promedio aplana un poco las cumbres; con GPS y lomas de 20 m, la ganancia queda ~10 % corta sin ruido. Y si la altitud GPS deriva despacio ±10 m con el teléfono quieto, esa deriva se cuenta completa (~90 m en 30 min en simulación); el barómetro no lo sufre. `elevation.test.ts` fija los límites; se mide con datos reales en la 009.
- **Deriva del clima:** en actividades largas, un cambio de presión atmosférica de 1–3 hPa equivale a 8–25 m de altitud falsa. La histéresis no lo corrige. Se mide en la prueba de campo (009).
- **Ruido del GPS con mala señal:** puntos con precisión entre 10 y 20 m pasan el filtro. En la simulación con precisión 20 m y ruido gaussiano, el quieto de 5 min llega a ~45 m en el peor caso (mediana 0 m), y en curvas cerradas el umbral de hasta 40 m recorta un poco la distancia. CA-9 se valida con datos sintéticos aquí y con datos reales en la 009.
- **Permiso de movimiento en iOS:** pedirlo justo después del de ubicación son dos diálogos seguidos. Si se niega, la actividad sigue con GPS (CA-13).
- **Expo Go:** `expo-sensors` está incluido en Expo Go, pero el texto del permiso de movimiento solo aplica en un *development build*.
- **Carga de la semana:** barómetro, métricas, vista en vivo, resumen e historial. El historial (CA-20 a CA-24) es lo más fácil de mover a otra semana si hace falta.

## Historial

- 2026-10-05 — D3 y "Distancia" cambian durante T4: el ancla original (`max(5 m, accuracy)`) no cumplía CA-9 en simulación; se agrega promedio móvil de 5 puntos y el umbral suma las precisiones del ancla y del punto nuevo. Aprobado por el usuario. La spec no cambia.
- 2026-10-05 — Riesgos: se documenta que la distancia se subestima en curvas cerradas y en el último tramo (hallado al probar T4 con recorridos en zigzag).
- 2026-10-05 — D4 y "Elevación" cambian durante T5: la histéresis sola inflaba varias veces la elevación con altitud GPS ruidosa; se agrega promedio móvil de 5 altitudes antes de la histéresis en ambas fuentes. Aprobado por el usuario. La spec no cambia.
- 2026-10-05 — D4 cambia otra vez durante T5: la histéresis con la referencia en el punto de cruce perdía hasta un umbral a cada lado de cada cumbre (lomas de 20 m con GPS: 11 de 400 m); pasa a contar hasta el extremo. Aprobado por el usuario. La spec no cambia.
