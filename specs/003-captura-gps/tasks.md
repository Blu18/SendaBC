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

## Verificación

Todas manuales (aún no hay runner de pruebas en el frontend). Hacerlas en un dispositivo físico.

| CA | Caso | Estado |
|---|---|---|
| CA-1 | M1 | Por verificar |
| CA-2 | M2 | Cumple |
| CA-3 | M3 | Por verificar |
| CA-4, CA-6 | M4 | Por verificar |
| CA-5 | M1 | Por verificar |
| CA-7 | M5 | Por verificar |
| CA-8 | M4 | Por verificar |
| CA-9 | M6 | Por verificar |
| CA-10 | M7 | Por verificar |
| CA-11 | M8 | Por verificar |

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
- **Esperado:** "Actividad guardada: N puntos" con N igual al contador mostrado durante la grabación. La actividad tiene estado `PENDING_SYNC`, `endedAt`, tipo y `user_id` correctos.

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
