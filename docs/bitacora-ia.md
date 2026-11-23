# Bitácora de IA

Registro de cómo se usó la inteligencia artificial para construir SendaBC: con qué herramientas, bajo qué reglas, qué hizo la IA y qué decidió el equipo en cada funcionalidad, y qué incidentes hubo. Las decisiones del proyecto, una por una, están en el [diario de decisiones](diario-de-decisiones.md).

## 1. Herramientas

| Herramienta | Para qué se usó |
|---|---|
| **Claude Code** (modelo Claude Opus 5.5), en la app de escritorio de Claude | Escribir specs, planes y tareas; programar el backend y la app; escribir y correr pruebas; revisar el código; documentar. |
| Comandos del repositorio en `.claude/commands/` | `/spec-new`, `/spec-plan`, `/spec-tasks`, `/spec-implement` y `/spec-verify`: cada uno guía a la IA por un paso de Spec-Driven Development. |
| **MCP de Figma** | Prototipo y sistema de diseño de la spec 009, las propuestas de Inicio de la 013, los marcos de la 014 y la 015, y la exportación del logo cuadrado para el ícono de la app (012). |
| **`adb`** contra el emulador y el Galaxy S9+ | Casos manuales corridos por la IA (capturas, toques, GPS simulado, modo avión) y las capturas del manual. |
| CLI de Azure, SSH, EAS CLI y Supabase | Despliegue de la entrega (012), siempre con la sesión del usuario. |
| Lectura de documentación | La documentación versionada de Expo SDK 57 (`frontend/AGENTS.md` pide leerla antes de tocar Expo), EAS y Telegram. |
| Memoria del agente | Notas que la IA conserva entre sesiones: cómo correr los casos manuales, el emulador en uso, el flujo de ramas y PR y el servidor de producción. |

## 2. Reglas de trabajo con la IA

Las reglas están en [`CLAUDE.md`](../CLAUDE.md) y en la [constitución](../specs/constitution.md). Las que más pesaron:

- **La spec primero.** La IA no programa una funcionalidad sin `spec.md`, `plan.md` y `tasks.md`. Si no hay spec, propone crearla.
- **El usuario aprueba.** La IA redacta specs y planes, pero nunca cambia su estado a `Aprobada`. Las preguntas abiertas (`P-x`) las resuelve el usuario. Cuando la IA recomienda algo, queda escrito como recomendación aceptada.
- **Si la spec está mal, se detiene.** Cuando la implementación descubre que la spec o el plan no sirven, la IA para, explica el problema, propone el cambio y anota el motivo en el historial de la spec antes de tocar el código. Ejemplos: el umbral 1.05 de T13 (012) y el cambio de Oracle a Azure (012).
- **Una tarea a la vez**, marcada `[x]` con una nota de lo hecho y de cómo se verificó.
- **Verificación con evidencia.** Cada criterio de aceptación tiene una prueba automatizada (Vitest, e2e, Postman) o un caso manual con su resultado en `tasks.md`. Lo que no se pudo comprobar se escribe como pendiente.
- **Commits** con conventional commits que citan la spec y la línea `Co-Authored-By: Claude`. La IA no hace commit ni push sin que el usuario lo pida.
- **Secretos.** Los secretos no se escriben en el repositorio ni en el chat: contraseñas, tokens, URLs de la base. El usuario los escribe en sus archivos de entorno, y la IA comprueba que estén sin mostrarlos.
- **Acciones con datos reales.** Antes de borrar datos, publicar o crear recursos en la nube, la IA muestra qué va a pasar y espera la confirmación. Ejemplo: en T17, la consulta de las 75 actividades a borrar se mostró y el borrado esperó al respaldo.

## 3. Números

Del 2026-09-07 al 2026-11-23:

| Dato | Valor |
|---|---|
| Commits en total | 289 |
| Commits con coautoría de Claude | 265 (todos desde la adopción de SDD, el 2026-09-30) |
| Commits sin IA | 24: los 10 iniciales, anteriores a SDD, y las fusiones de PR que hace el usuario en GitHub |
| Specs | 15, todas escritas con la IA |
| Versiones de la constitución | 1.0 a 1.12 |

## 4. Bitácora por funcionalidad

Las fechas son las del historial de cada spec.

| Spec | Fechas | Qué hizo la IA | Qué decidió el usuario | Verificación |
|---|---|---|---|---|
| Semanas 1 y 2 (antes de SDD) | 2026-09-07 a 09-28 | — | El equipo armó la base: monorepo, NestJS, Prisma, PostGIS y Expo. | — |
| [001](../specs/001-registro-usuario/spec.md) Registro | 2026-09-30 | Pasó el registro existente a spec y movió el hash al trigger de PostgreSQL (constitución v1.1). | Adoptar SDD (v1.0) y aprobar la constitución (v1.2). | Vitest y e2e |
| [002](../specs/002-inicio-sesion/spec.md) Inicio de sesión | 2026-09-30 | Spec, plan e implementación de la sesión persistente con `expo-secure-store`. | Aprobación de spec y plan. | Vitest, e2e y casos manuales |
| [003](../specs/003-captura-gps/spec.md) Captura GPS | 2026-09-30 | Grabación offline en SQLite y `expo-keep-awake`. | Agregar `expo-keep-awake` al stack (v1.2). | Casos manuales |
| [004](../specs/004-metricas-actividad/spec.md) Métricas | 2026-10-05 | Algoritmos de distancia y elevación con filtros, barómetro y Vitest en el frontend (v1.3). | P1 a P7: umbral de 20 m, ruido aceptable, ritmo o velocidad, historial. | Vitest y casos en el dispositivo |
| [005](../specs/005-sincronizacion/spec.md) Sincronización | 2026-10-08 | Endpoint por lotes idempotente, cola local con reintentos y recuperación al reinstalar. | P1 a P8: reintentos, sincronizar deslizando, aviso al cerrar sesión. | e2e, Postman y casos manuales |
| [006](../specs/006-rutas-cercanas/spec.md) Rutas cercanas | 2026-10-16 | Consulta con PostGIS, rutas de ejemplo de trazas GPX y mapa. | P1 a P7: rutas de ejemplo, radio de 25 km, 50 rutas. | e2e y casos manuales |
| [007](../specs/007-publicar-rutas/spec.md) Publicar rutas | 2026-10-20 | Publicar, editar, archivar, borrar y favoritas; regla de dificultad y perfil de elevación. | P1 a P13: la app calcula la dificultad, mínimo de 1.5 km, umbrales de ciclismo. | e2e, Postman y casos manuales |
| [008](../specs/008-alerta-inactividad/spec.md) Alerta por inactividad | 2026-10-21 | Detector en segundo plano, sesión de seguridad, bot de Telegram y tarea de la hora de regreso. | P1 a P15: Telegram en lugar de WhatsApp, umbrales y permiso en segundo plano (v1.5). | e2e, Postman y casos manuales |
| [009](../specs/009-diseno-interfaz/spec.md) Diseño | 2026-10-30 | Con el MCP de Figma: sistema de diseño, logo, prototipo de 14 pantallas en modo claro y oscuro; luego la implementación. | Prototipo aprobado el 2026-10-30; paleta, logo y tipografía. | Vitest de contraste y casos manuales |
| [010](../specs/010-mapa-3d-animaciones/spec.md) Mapa 3D | 2026-11-05 | Prueba técnica con Mapbox antes de programar; mapa 3D y animaciones. | Agregar Mapbox al stack (v1.8). | Casos manuales |
| [011](../specs/011-estabilidad/spec.md) Estabilidad | 2026-11-06 | Corrección de los bugs de la prueba de campo, mapas sin conexión, cuenta y avatares, recálculo de distancias infladas, módulo nativo del barómetro y casos por `adb`. | P1 a P15: túnel para la salida, teléfonos de prueba y funciones aplazadas. P6 lo eligió la IA a petición del usuario. | 60 commits; Vitest, e2e y la salida de campo |
| [013](../specs/013-inicio-rediseno/spec.md) Inicio | 2026-11-20 | Tres propuestas de diseño en Figma y la implementación con Mapbox en toda la app (v1.10). | Eligió una cuarta propuesta que combina partes de las otras (P12). | Vitest y casos por `adb` |
| [014](../specs/014-resumen-bitacora/spec.md) Resumen y bitácora | 2026-11-21 | Perfil de elevación, miniaturas, línea de contexto y sombras en toda la app. | P1 a P9: reglas de la línea de contexto, mínimo para el perfil, orden frente a la entrega. | Vitest y casos por `adb` en el S9+ |
| [015](../specs/015-filtros-y-ajustes/spec.md) Filtros | 2026-11-22 | Filtros de Mis actividades, 3D en Explorar y ajustes de diseño. | P1 a P9. P4 fue una recomendación de la IA aceptada. | Vitest y casos por `adb` |
| [012](../specs/012-entrega/spec.md) Entrega | 2026-11-22 y 23 | Regla de 3 puntos válidos en el servidor y la app; ícono desde Figma; despliegue en Azure; base recreable; Postman contra producción; APK con EAS; README y manual con capturas. | Hospedaje (P1, luego Azure), APK adjunto, demo en vivo, F5 como limitación, borrar las actividades cortas tras el respaldo. | Vitest, e2e, Postman (141 de 141) y casos manuales |

## 5. Incidentes y lecciones

| Fecha | Qué pasó | Qué se hizo | Lección |
|---|---|---|---|
| 2026-10-22 | La spec de la 008 pedía avisos por WhatsApp, pero su API cobra por mensaje y pide una cuenta de negocio verificada. | Se compararon costos en P15; el usuario eligió Telegram y la spec se reescribió. | Revisar el costo y los requisitos de un servicio antes de planear con él. |
| 2026-11 (011) | Distancias infladas por saltos del GPS en actividades ya guardadas. | Se corrigió el algoritmo y se recalcularon las actividades con el mismo código en el servidor y el teléfono (D7). | Una corrección de datos se versiona y se prueba igual que el código. |
| 2026-11-22 | Metro con `CI=1` no vigila los archivos y servía un bundle viejo durante los casos manuales. | Se anotó en la memoria del agente cómo arrancar Metro. | Lo que se aprende del entorno se guarda para la siguiente sesión. |
| 2026-11-23 | Oracle Cloud rechazó los datos de pago. | La IA comparó Azure for Students con el túnel de VS Code (que no cumplía CA-7, CA-9 ni CA-10); el usuario eligió Azure y se actualizaron spec, plan y constitución (v1.12) antes del despliegue. | Un cambio de infraestructura se trata como un cambio de spec. |
| 2026-11-23 | La primera migración de producción (T4) borraba datos reales y `actualizar.sh` la aplicaba en el primer despliegue. | La IA lo detectó antes de desplegar y agregó `SIN_MIGRAR=1`; el borrado esperó al respaldo (T17). | Leer qué migraciones están pendientes antes de correr `migrate deploy` en producción. |
| 2026-11-23 | Al cargar un archivo de entorno con bash, la terminal mostró parte de la contraseña de la base de prueba. | El proyecto de prueba se borra al terminar T18; desde ahí, los archivos de entorno se cargan con `dotenv`. | No interpretar archivos con secretos con el shell. |
| 2026-11-23 | `npx newman --env-var` imprimió en la salida el secreto del webhook de producción. | Se cambió el secreto en el servidor, se registró el webhook otra vez y se comprobó que el viejo da 401. | Los secretos no van en la línea de comandos: npm la repite. |
| 2026-11-23 | Una actividad de prueba con el teléfono quieto se guardó porque tuvo 4 puntos válidos. | El usuario pidió borrarla; se borró en el servidor y sale del teléfono al volver a entrar. | La regla de 3 puntos cuenta precisión, no movimiento: es la regla de la spec. |
| 2026-11-23 | El EAS Build sube todo el repositorio, y había un respaldo de la base sin ignorar. | Se agregó `respaldo-*.sql` a `.gitignore` antes del build. | Revisar qué sube un servicio en la nube antes de usarlo. |

## 6. Qué no hace la IA

- No aprueba specs ni planes, y no resuelve preguntas abiertas por su cuenta.
- No escribe contraseñas, tokens ni datos de pago. Las cuentas (Azure, Expo, Supabase, Telegram) las crea y maneja el usuario.
- No fusiona PR ni hace push sin que se lo pidan.
- No activa ajustes del sistema del teléfono como TalkBack: esos casos quedan para el usuario.
