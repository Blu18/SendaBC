# Roadmap SendaBC

Duración: 10 semanas. Semana actual: **8**.

Cada objetivo semanal del plan de desarrollo se convierte en una o más specs. Las specs de semanas futuras se escriben al inicio de su semana (o antes, si hay tiempo), no todas de golpe.

| Sem. | Objetivo | Spec | Estado |
|---|---|---|---|
| 1 | Configuración y arquitectura base (monorepo, Prisma, PostGIS) | — (previo a SDD) | Hecho |
| 2 | Registro de usuario | [001-registro-usuario](001-registro-usuario/spec.md) | Implementada |
| 2 | Inicio de sesión y sesión persistente | [002-inicio-sesion](002-inicio-sesion/spec.md) | Implementada |
| 3 | Captura de GPS y guardado local | [003-captura-gps](003-captura-gps/spec.md) | Implementada |
| 4 | Barómetro y métricas de actividad (distancia, tiempo, elevación, resumen) | [004-metricas-actividad](004-metricas-actividad/spec.md) | Implementada (casos en dispositivo corridos en la 011) |
| 5 | Sincronización offline-first (cola local, endpoint batch, reintentos) | [005-sincronizacion](005-sincronizacion/spec.md) | Implementada |
| 6 | Catálogo de rutas cercanas con PostGIS y mapa | [006-rutas-cercanas](006-rutas-cercanas/spec.md) | Implementada |
| 7 | Publicar rutas, detalle y favoritas | [007-publicar-rutas](007-publicar-rutas/spec.md) | Implementada |
| 8 | Seguridad: contacto de emergencia, inactividad y alerta por Telegram | [008-alerta-inactividad](008-alerta-inactividad/spec.md) | Implementada |
| 9 | Diseño de la interfaz: prototipo en Figma e implementación en la app | [009-diseno-interfaz](009-diseno-interfaz/spec.md) | Implementada |
| 9 | Mapa 3D al grabar y animaciones de la interfaz | [010-mapa-3d-animaciones](010-mapa-3d-animaciones/spec.md) | Implementada |
| 9 | Pulido, prueba de campo, pruebas unitarias, bugs | [011-estabilidad](011-estabilidad/spec.md) | Implementada con pendientes (CA-2 y CA-5 por F5, pasado a la 012; CA-58 en parte) |
| 10 | Rediseño de la pantalla de inicio y mapa de rutas con Mapbox | [013-inicio-rediseno](013-inicio-rediseno/spec.md) | Implementada |
| 10 | Rediseño del resumen y Mis actividades, y estilo con sombras en toda la app | [014-resumen-bitacora](014-resumen-bitacora/spec.md) | Aprobada (ampliada) |
| 10 | Cierre: README, manual, EAS Build, despliegue, demo | 012-entrega | Por escribir |

## Notas

- El modelo de datos de Prisma (semana 1) ya contempla actividades, puntos, rutas, favoritas, alertas y dispositivos. Las specs 004–008 deben partir de él y documentar en su `plan.md` cualquier cambio de esquema.
- Las brechas de las specs 001 y 002 (ver sus `tasks.md`) conviene cerrarlas antes de la semana 5, porque la sincronización depende de que la autenticación funcione de punta a punta.
- La spec 008 necesita, para la 012, un hospedaje del backend que no se duerma (la tarea de la hora de regreso corre cada minuto) y un development build nuevo (ubicación en segundo plano y notificaciones).
- La spec 011 debe cubrir lo que dejó abierto la 010 (ver su `tasks.md`, T15, T16, T24 y T25):
  - En un teléfono real y en la prueba de campo: consumo de batería con los límites de 30 % en 3D y 15 % en 2D; descarte de la ubicación vieja al iniciar (spec 003, CA-13); avance del mapa cada 10 s a velocidad de bicicleta (plan de la 010, R3); repetir el toque inmediato en "Estoy bien", que se perdió una vez (M18); 004 M3, con un teléfono con barómetro.
  - Por investigar o programar: `database is locked` al iniciar justo tras abrir la app, visto una vez; mapas descargados, para que una zona nunca vista no se vea azul sin red; distancia inflada de actividades antiguas con punto viejo y saltos a media actividad en rutas publicadas (spec 007, RN-10); publicar por `DatabaseNotReachable` dice que falta internet (spec 010, T25); `npm run test:e2e` falla de forma intermitente con los archivos en paralelo contra Supabase, y en serie pasa.
  - Limitación aceptada, sin trabajo previsto: al cambiar el tamaño de letra con la app abierta, los textos ya en pantalla quedan recortados hasta volver a abrir esa pantalla o la app (spec 003, CA-14).
- Para la 012 (desde la 011, 2026-11-20): el build de entrega no debe usar la URL del túnel de VS Code (Dev Tunnels) ni definir `EXPO_PUBLIC_BATTERY_TEST`, que solo existe para medir la batería (011, RN-7). El backend necesita su hospedaje propio.
- La spec 011 pasa a la 012 el fallo F5 (2026-11-20): en segundo plano, la altitud del GPS salta a un valor casi fijo y la elevación de los teléfonos sin barómetro sale unas 4 veces la real; el perfil de las rutas también lo hereda. Por esto no cumplen 011 CA-2 (solo la elevación con GPS) ni CA-5. Detalle y datos en `011-estabilidad/tasks.md` (F5). Antes de corregirlo falta la caminata de diagnóstico con la pantalla bloqueada.
- Orden (2026-11-20): la 013 (rediseño de Inicio) se hace antes de la 012 (entrega), para que la demo muestre el Inicio nuevo.
- Orden (2026-11-21): la 014 (resumen, Mis actividades y estilo con sombras en toda la app) también va completa antes de la 012, por la misma razón.
- Para la 012 (desde la 013, 2026-11-21): en la prueba de campo, observar P-B (una vez, el primer encuadre de Explorar no quedó en los 25 km; está mitigado y no se pudo reproducir) y P-E ("Cerca de ti" en Inicio tarda de 20 a 35 s en volver después del modo avión). Detalle en `013-inicio-rediseno/tasks.md`. El APK de entrega debe compilarse de nuevo, porque la 013 agregó `react-native-svg` y quitó `react-native-maps`.
- Numeración (2026-11-05): 010 es el mapa 3D y las animaciones, 011 es estabilidad y 012 es entrega. Antes, 009 y 010 eran estabilidad y entrega, y después 010 y 011. Las entradas fechadas de historiales y bitácoras conservan el número que tenían en su momento.
