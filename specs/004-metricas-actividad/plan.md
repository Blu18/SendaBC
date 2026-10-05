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
| `summary.ts` | `computeActivityMetrics({ points, barometerReadings, source, startedAt, endedAt })` → `{ distanceMeters, durationSeconds, elevationGainMeters, elevationLossMeters, elevationSource }`; `averagePace(distance, duration)` y `averageSpeed(distance, duration)`. |
| `constants.ts` | `MAX_ACCURACY_M = 20`, `BARO_NOISE_M = 3`, `GPS_NOISE_M = 10`. |

**Distancia (CA-7, CA-8, CA-9):**
1. Se descartan los puntos con `accuracy > 20 m`. Los puntos sin dato de precisión (`null`) se aceptan.
2. Se usa un punto **ancla**: se mide la distancia del punto nuevo al ancla. Solo si supera `max(5 m, accuracy del punto nuevo)`, se suma al total y el punto nuevo pasa a ser el ancla. Así, el titubeo del GPS con el teléfono quieto, que queda dentro de su propio margen de error, no suma. El movimiento real se acumula hasta cruzar el umbral y no se pierde.

**Elevación (CA-10, CA-11), con histéresis:**
- Se guarda una altitud de referencia. Si la altitud nueva supera la referencia por ≥ umbral, se suma la diferencia a `gain` y la referencia se mueve. Si queda por debajo por ≥ umbral, se suma a `loss` y la referencia se mueve. Las oscilaciones menores al umbral no cambian nada.
- Umbral: 3 m con barómetro, 10 m con GPS.

**Altitud según la fuente:**
- Barómetro en **iOS:** `relativeAltitude` (CMAltimeter ya la entrega filtrada, en metros).
- Barómetro en **Android:** `pressureToAltitude(pressure)` = `44330 × (1 − (p / 1013.25)^0.1903)`. La presión de referencia no importa porque solo se usan diferencias.
- **GPS:** `altitude` de los puntos que pasan el filtro de precisión.

**Fuente por actividad (RN-3, CA-12, CA-13):**
- Se decide al iniciar: si `Barometer.isAvailableAsync()` devuelve verdadero y, en iOS, se concede el permiso de movimiento → `BAROMETER`. Si no → `GPS`.
- Si al terminar hay menos de 2 lecturas del barómetro, toda la actividad usa `GPS` y la fuente se guarda como `GPS`.

**Duración (CA-4):** `endedAt − startedAt` en segundos.

**Ritmo y velocidad (CA-5, CA-6, RN-5):** se calculan al mostrar, sin guardarse. Si la distancia es 0, devuelven `null` y la pantalla muestra `—`.

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
- `computeMissingMetrics()`: aplica `finalizeMetrics` a toda actividad terminada con `distance_meters IS NULL` (CA-19).

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
| D3 | Ancla con umbral `max(5 m, accuracy)` contra el titubeo del GPS | Suavizado (media móvil o filtro de Kalman) | Simple de probar y entender. Si en la prueba de campo (009) no basta, se cambia. |
| D4 | Histéresis para la elevación | Suavizar y luego sumar diferencias | Cumple CA-11 por definición y es fácil de probar. |
| D5 | `relativeAltitude` en iOS, fórmula barométrica en Android | Fórmula en ambos | En iOS, CMAltimeter ya entrega una altitud relativa filtrada. Android solo da presión. |
| D6 | Las métricas se guardan como columnas de la actividad; ritmo y velocidad no | Recalcular siempre al abrir el resumen | La spec 005 sube estos campos sin recalcular (CA-18). Ritmo y velocidad se derivan (RN-5). |
| D7 | Barómetro a 1 lectura por segundo, una fila por lectura | Guardar promedios por bloques | ~10 800 filas en 3 h es poco para SQLite, y deja los datos crudos para la 009. |
| D8 | Historial con `useState` + `useFocusEffect` y no TanStack Query | TanStack Query sobre SQLite | TanStack Query se usa para datos remotos. Con datos locales basta recargar al recibir el foco. |

## Riesgos

- **Deriva del clima:** en actividades largas, un cambio de presión atmosférica de 1–3 hPa equivale a 8–25 m de altitud falsa. La histéresis no lo corrige. Se mide en la prueba de campo (009).
- **Ruido del GPS con mala señal:** puntos con precisión entre 10 y 20 m pasan el filtro y el ancla podría quedarse corta. CA-9 se valida con datos sintéticos aquí y con datos reales en la 009.
- **Permiso de movimiento en iOS:** pedirlo justo después del de ubicación son dos diálogos seguidos. Si se niega, la actividad sigue con GPS (CA-13).
- **Expo Go:** `expo-sensors` está incluido en Expo Go, pero el texto del permiso de movimiento solo aplica en un *development build*.
- **Carga de la semana:** barómetro, métricas, vista en vivo, resumen e historial. El historial (CA-20 a CA-24) es lo más fácil de mover a otra semana si hace falta.
