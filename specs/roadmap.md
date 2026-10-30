# Roadmap SendaBC

Duración: 10 semanas. Semana actual: **8**.

Cada objetivo semanal del plan de desarrollo se convierte en una o más specs. Las specs de semanas futuras se escriben al inicio de su semana (o antes, si hay tiempo), no todas de golpe.

| Sem. | Objetivo | Spec | Estado |
|---|---|---|---|
| 1 | Configuración y arquitectura base (monorepo, Prisma, PostGIS) | — (previo a SDD) | Hecho |
| 2 | Registro de usuario | [001-registro-usuario](001-registro-usuario/spec.md) | Implementada |
| 2 | Inicio de sesión y sesión persistente | [002-inicio-sesion](002-inicio-sesion/spec.md) | Implementada |
| 3 | Captura de GPS y guardado local | [003-captura-gps](003-captura-gps/spec.md) | Implementada |
| 4 | Barómetro y métricas de actividad (distancia, tiempo, elevación, resumen) | [004-metricas-actividad](004-metricas-actividad/spec.md) | Implementada con pendientes (falta prueba en dispositivo) |
| 5 | Sincronización offline-first (cola local, endpoint batch, reintentos) | [005-sincronizacion](005-sincronizacion/spec.md) | Implementada |
| 6 | Catálogo de rutas cercanas con PostGIS y mapa | [006-rutas-cercanas](006-rutas-cercanas/spec.md) | Implementada |
| 7 | Publicar rutas, detalle y favoritas | [007-publicar-rutas](007-publicar-rutas/spec.md) | Implementada |
| 8 | Seguridad: contacto de emergencia, inactividad y alerta por Telegram | [008-alerta-inactividad](008-alerta-inactividad/spec.md) | Implementada |
| 9 | Diseño de la interfaz: prototipo en Figma e implementación en la app | [009-diseno-interfaz](009-diseno-interfaz/spec.md) | Aprobada (plan aprobado) |
| 9 | Pulido, prueba de campo, pruebas unitarias, bugs | 010-estabilidad | Por escribir |
| 10 | Cierre: README, manual, EAS Build, despliegue, demo | 011-entrega | Por escribir |

## Notas

- El modelo de datos de Prisma (semana 1) ya contempla actividades, puntos, rutas, favoritas, alertas y dispositivos. Las specs 004–008 deben partir de él y documentar en su `plan.md` cualquier cambio de esquema.
- Las brechas de las specs 001 y 002 (ver sus `tasks.md`) conviene cerrarlas antes de la semana 5, porque la sincronización depende de que la autenticación funcione de punta a punta.
- La spec 008 necesita, para la 011, un hospedaje del backend que no se duerma (la tarea de la hora de regreso corre cada minuto) y un development build nuevo (ubicación en segundo plano y notificaciones).
