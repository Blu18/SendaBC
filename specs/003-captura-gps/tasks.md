# 003 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

## Hecho

- [x] Integrar `expo-location` y texto de propósito del permiso en `app.json` (CA-2)
- [x] `useLocationPermission`: leer estado sin diálogo y pedir permiso (CA-2)
- [x] Esquema SQLite v1: `activities` y `activity_points` (CA-4, CA-6)
- [x] `useActivityTracker`: crear actividad, `watchPositionAsync` (alta precisión, 5 m / 2 s), guardar puntos con secuencia (CA-4, CA-6, RN-2)
- [x] Detener: quitar suscripción, `endedAt` y `PENDING_SYNC` (CA-8 parcial)
- [x] Protección contra doble toque con `busy` (CA-9)
- [x] Botones Iniciar/Detener y contador de puntos en `MainPage` (temporal)

## Pendiente

### Datos y sesión

- [x] T1 — Versionar el esquema SQLite con `PRAGMA user_version` y migrar a v2 (`user_id` en `activities`). (RN-4)
  - Las actividades grabadas antes de v2 quedan con `user_id = NULL`; la spec 005 debe decidir qué hacer con ellas al sincronizar.
- [x] T2 — Crear `frontend/lib/db/activities.ts` con `createActivity`, `insertPoint`, `finishActivity`, `countPoints`, `closeOrphanActivities`. (CA-4, CA-6, CA-8, CA-10)
- [x] T3 — Guardar y exponer `userId` en `AuthContext` (SecureStore) a partir de la respuesta de login. (RN-4)
  - Una sesión guardada antes de este cambio (token sin `userId`) se cierra al arrancar y pide iniciar sesión de nuevo.

### Hook

- [x] T4 — `start(type)` recibe el tipo; guardar `user_id`. (CA-1, CA-4)
- [x] T5 — Exponer `startedAt`, `permissionError` (`denied` / `blocked`) y `savedPointCount` tras detener. (CA-3, CA-5, CA-8)
- [x] T6 — Al desmontar con grabación activa, cerrar la actividad además de quitar la suscripción. (CA-10)
- [x] T7 — Usar las funciones de `lib/db/activities.ts` en lugar de SQL en línea.

### Pantalla

- [x] T8 — Crear `pages/activity/activityPage.tsx` con selector de tipo, cronómetro, contador y botón Iniciar/Detener; registrarla en `App.tsx`. (CA-1, CA-5)
- [x] T9 — Mensaje de permiso denegado y botón "Abrir ajustes" (`Linking.openSettings()`). (CA-3)
- [x] T10 — Mostrar "Actividad guardada: N puntos" leyendo `countPoints`. (CA-8)
- [x] T11 — En `MainPage`, reemplazar los controles de grabación por un botón "Nueva actividad". (CA-1)

### Arranque

- [x] T12 — Llamar `closeOrphanActivities()` al iniciar la app. (CA-10)
  - Se llama en `Gate` (`App.tsx`) y la navegación espera a que termine, para que no se cruce con una grabación nueva.

### Pantalla encendida

- [x] T13 — Instalar `expo-keep-awake` (`npx expo install expo-keep-awake`); activarlo en `start` y desactivarlo en `stop` y al desmontar el hook. (CA-11)

### Cierre de observaciones

- [x] T14 — Corregir O3: si `finishActivity` falla en `stop()`, dejar de mostrar "Detener actividad", mostrar el aviso de CA-12 con el botón "Volver" y no permitir iniciar otra actividad desde la pantalla. (CA-12)

## Verificación

Todas manuales (aún no hay runner de pruebas en el frontend). Hacerlas en un dispositivo físico.

Revisión de código: 2026-10-05 (`tsc --noEmit` sin errores). "Código ok" = el comportamiento existe en el código; falta ejecutar el caso en un dispositivo.

| CA | Caso | Estado |
|---|---|---|
| CA-1 | M1 | Cumple (emulador, 2026-10-06) |
| CA-2 | M2 | Cumple |
| CA-3 | M3 | Código ok · falta M3 |
| CA-4 | M4 | Cumple (emulador, 2026-10-06) |
| CA-5 | M1 | Cumple (emulador, 2026-10-06) |
| CA-6 | M4 | Cumple (emulador, 2026-10-06); O2 sigue abierta |
| CA-7 | M5 | Código ok (sin red en la ruta de grabación) · falta M5 |
| CA-8 | M4 | Cumple (emulador, 2026-10-06): el resumen muestra los mismos N puntos que el contador (O1 corregida en la spec 004) |
| CA-9 | M6 | Cumple (emulador, 2026-10-06): doble toque en "Iniciar" crea una sola actividad |
| CA-10 | M7 | Cumple (emulador, 2026-10-06): tras cerrar la app a la fuerza, la actividad aparece terminada con la duración hasta su último punto |
| CA-11 | M8 | Código ok · falta M8 |
| CA-12 | Revisión de código (no se puede provocar un fallo de SQLite desde la app) | Cumple (revisión, 2026-10-15): `stop()` captura el fallo, marca `stopFailed` y la pantalla muestra el aviso con "Volver" en lugar de "Iniciar" |

### Observaciones de la revisión

- ~~**O1 (CA-8):** `stop()` quita la suscripción y cuenta los puntos, pero no espera a un `insertPoint` que siga en curso. Si llega un punto justo al detener, "Actividad guardada: N" puede mostrar uno menos que el contador, y ese punto se guarda en una actividad ya cerrada.~~ **Corregida** en la spec 004 (T14): `stop()` espera los guardados de puntos y lecturas en curso antes de cerrar la actividad.
- **O2 (CA-6) — aceptada como limitación conocida (2026-10-15):** la secuencia se incrementa antes de guardar. Si un `insertPoint` falla, queda un hueco (1, 2, 4...) y el contador en pantalla cuenta el punto que no se guardó.
- **O3 — corregida con CA-12 / T14:** si `finishActivity` falla en `stop()`, el GPS ya se detuvo pero la pantalla sigue en "Detener actividad" y el botón no hace nada. La actividad se recupera al reabrir la app (CA-10). Sigue aplicando tras la spec 004: el error ahora se registra, pero la pantalla no cambia.

### Casos manuales

**M1 — Flujo feliz**
1. Iniciar sesión → "Nueva actividad" → elegir "Trail running" → "Iniciar".
2. Caminar ~2 minutos.
- **Esperado:** el cronómetro avanza cada segundo; el contador de puntos sube; el selector de tipo está deshabilitado.

**M2 — Primer permiso**
1. Instalar la app limpia → "Iniciar".
- **Esperado:** diálogo del sistema con el texto "SendaBC usa tu ubicación para registrar el recorrido de tus actividades."

**M3 — Permiso denegado**
1. Negar el permiso.
- **Esperado:** no inicia; se ve el mensaje explicativo. Negar de forma permanente → aparece "Abrir ajustes" y lleva a los ajustes de la app.

**M4 — Guardado**
1. Grabar, detener.
- **Esperado:** se abre el resumen (spec 004) con "N puntos registrados", N igual al contador mostrado durante la grabación. La actividad tiene estado `PENDING_SYNC`, `endedAt`, tipo y `user_id` correctos.

**M5 — Sin conexión**
1. Activar modo avión, grabar ~2 minutos caminando, detener.
- **Esperado:** se guardan puntos igual que con conexión.

**M6 — Doble toque**
1. Tocar "Iniciar" dos veces rápido.
- **Esperado:** solo existe una actividad nueva en SQLite.

**M7 — Actividad huérfana**
1. Iniciar una actividad, capturar algunos puntos y cerrar la app a la fuerza.
2. Abrir la app.
- **Esperado:** la actividad quedó en `PENDING_SYNC` con `endedAt` igual a la hora de su último punto; no hay ninguna en `RECORDING`.

**M8 — Pantalla encendida**
1. Configurar el apagado automático del teléfono en 30 s. Iniciar una actividad y no tocar la pantalla 1 minuto.
2. Detener la actividad y esperar 1 minuto.
- **Esperado:** durante la grabación la pantalla sigue encendida y los puntos siguen llegando; después de detener, la pantalla se apaga sola.

## Pendientes conocidos

Para pasar la spec a *Implementada*:

- [ ] Ejecutar en un dispositivo físico los casos M1, M3, M4, M5, M6, M7 y M8 y actualizar la tabla de verificación.
- [x] O2 aceptada como limitación conocida y O3 corregida (T14). O1 quedó corregida en la spec 004.
