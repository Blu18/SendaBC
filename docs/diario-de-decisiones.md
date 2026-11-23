# Diario de decisiones

Las decisiones importantes de SendaBC en orden. Cada una dice qué se decidió, por qué y dónde está el detalle.

- **Del usuario (`P-x`):** las preguntas abiertas de cada `spec.md` que resolvió el usuario: alcance, reglas de negocio, prioridades.
- **Técnicas (`D-x`):** la tabla "Decisiones" de cada `plan.md`, con las alternativas que se descartaron. Las propone la IA y el usuario las aprueba con el plan.
- **De proyecto:** los cambios a la [constitución](../specs/constitution.md), que necesitan acuerdo explícito.

Cómo se usó la IA para llegar a estas decisiones está en la [bitácora de IA](bitacora-ia.md).

## Decisiones de proyecto (constitución)

| Fecha | Versión | Decisión | Motivo |
|---|---|---|---|
| 2026-09-30 | 1.0 | Adoptar Spec-Driven Development | Que cada funcionalidad tenga spec, plan, tareas y verificación antes y después del código. |
| 2026-09-30 | 1.1 | El hash de las contraseñas lo genera un trigger de PostgreSQL, no NestJS | Ninguna ruta del backend puede guardar una contraseña en claro. |
| 2026-09-30 | 1.2 | Aprobación del equipo; `expo-keep-awake` al stack | La grabación necesita la pantalla encendida (003). |
| 2026-10-05 | 1.3 | Vitest también en el frontend, solo para lógica pura | Probar los algoritmos de métricas sin un dispositivo (004, D1). |
| 2026-10-09 | 1.4 | `expo-network` | Saber cuándo hay red para sincronizar (005, D2). |
| 2026-10-22 | 1.5 | Ubicación en segundo plano, solo durante una actividad iniciada | La alerta por inactividad debe funcionar con la pantalla bloqueada (008, P14). |
| 2026-10-22 | 1.6 | `expo-task-manager`, `@nestjs/schedule` y la Bot API de Telegram | Detector en segundo plano, hora de regreso y avisos (008). |
| 2026-10-30 | 1.7 | Pestañas inferiores, tipografía, íconos y modo claro u oscuro | Sistema de diseño de la 009. |
| 2026-11-05 | 1.8 | Mapbox (`@rnmapbox/maps`) para el mapa de grabación | Relieve 3D y estilos propios (010). |
| 2026-11-06 | 1.9 | El trigger también hashea al cambiar la contraseña; código `503` | Cambio de contraseña y base no disponible (011). |
| 2026-11-20 | 1.10 | Todos los mapas con Mapbox; `react-native-svg` | Un solo proveedor de mapas y miniaturas de recorridos (013). |
| 2026-11-22 | 1.11 | `expo-splash-screen`; API en Oracle Cloud Always Free | Pantalla de arranque claro y oscuro; único hospedaje gratis que no se duerme (012). |
| 2026-11-23 | 1.12 | API en una máquina virtual de Azure for Students | Oracle rechazó los datos de pago; Azure para estudiantes no pide tarjeta (012). |

## Por funcionalidad

### [001](../specs/001-registro-usuario/spec.md) Registro, [002](../specs/002-inicio-sesion/spec.md) Inicio de sesión y [003](../specs/003-captura-gps/spec.md) Captura GPS (2026-09-30)

- El código de estas tres ya existía en parte y se pasó a specs al adoptar SDD.
- La contraseña se hashea en la base (constitución 3.1).
- El JWT se guarda solo en `expo-secure-store` (3.4).
- La grabación es offline-first: SQLite es la fuente de verdad mientras se graba (artículo 2).

### [004](../specs/004-metricas-actividad/spec.md) Métricas (2026-10-05)

- **Del usuario:** también se calcula la elevación perdida. Métricas en vivo. Un punto se acepta con precisión de 20 m o mejor. El teléfono quieto debe acumular menos de 20 m en 5 minutos. El ruido de elevación es de 3 m con barómetro y 10 m con GPS. Ritmo para correr y caminar, velocidad para ciclismo. El historial entra en esta spec.
- **Técnicas:**
  - D2: funciones puras con acumuladores, usadas en vivo y al cerrar;
  - D3 y D4: promedio móvil e histéresis contra el ruido del GPS y de la altitud;
  - D5: fórmula barométrica en Android;
  - D6: las métricas se guardan como columnas de la actividad.

### [005](../specs/005-sincronizacion/spec.md) Sincronización (2026-10-08)

- **Del usuario:** las actividades sin dueño se quedan en el teléfono. Las lecturas crudas del barómetro no se suben. Los reintentos van de 30 s a 15 min, sin límite. Se sincroniza a mano deslizando hacia abajo. Al reinstalar, las actividades se recuperan. Si hay pendientes al cerrar sesión, se avisa.
- **Técnicas:**
  - D1: lote con un resultado por actividad (`200` con `results[]`);
  - D3: idempotencia con la restricción única de `clientGeneratedId`;
  - D4: puntos y recorrido con SQL crudo y PostGIS en una transacción;
  - D6: "No se pudo subir" es una columna, no un estado (constitución 2.3).

### [006](../specs/006-rutas-cercanas/spec.md) Rutas cercanas (2026-10-16)

- **Del usuario:** se empieza con rutas de ejemplo de Baja California. Radio de 25 km por omisión, hasta 100 km. Máximo de 50 rutas. Las propias llevan la marca "Tuya". Sin permiso de ubicación, el mapa muestra todo el estado.
- **Técnicas:**
  - D1: `startPoint` como `geography` con índice GIST;
  - D2: un usuario del sistema "SendaBC" es el autor de las rutas de ejemplo;
  - D3: el recorrido se simplifica para la respuesta;
  - D8: las rutas de ejemplo salen de trazas GPX reales.

### [007](../specs/007-publicar-rutas/spec.md) Publicar rutas (2026-10-20)

- **Del usuario:** la dificultad la calcula la app, con umbrales propios para ciclismo. Una actividad se publica una sola vez. Mínimo de 1.5 km. Nombre de 40 caracteres y descripción de 200. Se publica el recorrido completo. Quien publica puede editar, archivar y borrar.
- **Técnicas:**
  - D1: la regla de dificultad está en una función pura, en el backend y en la app;
  - D2: el perfil de elevación se calcula al publicar;
  - D5: el borrado es lógico (`DELETED`);
  - D6: la zona se deduce con `reverseGeocodeAsync`.

### [008](../specs/008-alerta-inactividad/spec.md) Contacto de emergencia y alerta por inactividad (2026-10-21)

- **Del usuario:**
  - avisos por **Telegram** en lugar de WhatsApp, por costo (P15);
  - 30 m durante 10 minutos, con 2 minutos de cuenta regresiva;
  - de uno a tres contactos;
  - debe funcionar con la pantalla bloqueada (constitución v1.5);
  - hora de regreso opcional, con 30 minutos de margen;
  - se acepta que un contacto sin Telegram no reciba avisos.
- **Técnicas:**
  - D1: sesión de seguridad en el servidor, aparte de las actividades;
  - D2: Bot API con `fetch`, sin librería;
  - D3: tarea cada minuto para la hora de regreso;
  - D5: "¿Estás bien?" como notificación local programada;
  - D6: bandeja de salida propia en SQLite;
  - D11: el contacto se vincula con un enlace de invitación de un solo uso;
  - D12: webhook en producción.

### [009](../specs/009-diseno-interfaz/spec.md) Diseño de la interfaz (2026-10-30)

- **Del usuario:** se conserva la paleta y se proponen logo y tipografía. El prototipo lo hace la IA en Figma. Modo claro y oscuro. Las 14 pantallas. Se puede cambiar la navegación. El prototipo se aprobó el 2026-10-30.
- **Técnicas:**
  - D1: barra de cuatro pestañas;
  - D3: Atkinson Hyperlegible Next empaquetada;
  - D6: las variables de Figma y los tokens del código tienen los mismos nombres;
  - D8: el contraste se verifica con Vitest.

### [010](../specs/010-mapa-3d-animaciones/spec.md) Mapa 3D y animaciones (2026-11-05)

- **Técnicas:**
  - D1: Mapbox en la grabación;
  - D2: una prueba técnica desechable antes de programar;
  - D4: el token público va en una variable de entorno;
  - D5: la telemetría de Mapbox va apagada;
  - D8: las animaciones usan `Animated` y respetan "reducir animaciones".

### [011](../specs/011-estabilidad/spec.md) Estabilidad (2026-11-06)

- **Del usuario:**
  - túnel temporal para la salida de campo;
  - teléfonos de prueba: el S9+ con barómetro y el Nothing Phone 2 sin él;
  - se hacen las funciones aplazadas: cuenta, avatares y mapas sin conexión;
  - las distancias infladas se recalculan;
  - "Pedir ayuda" como botón flotante;
  - las rutas de una cuenta borrada se conservan sin autor.
- **Técnicas:**
  - D8: `sinSaltos` descarta saltos imposibles;
  - D7: el recálculo usa el mismo algoritmo en el servidor y en el teléfono;
  - D9: código `503` cuando la base no está disponible;
  - D10: los e2e corren en serie;
  - D13: zonas sin conexión de hasta 900 km²;
  - D16: el barómetro se lee en Android con un módulo nativo propio.

### [013](../specs/013-inicio-rediseno/spec.md) Rediseño de Inicio (2026-11-20)

- **Del usuario:**
  - Inicio con rutas populares y cercanas, el resumen de los últimos 7 días y las 3 actividades más recientes;
  - "Cerrar sesión" pasa al perfil;
  - de las tres propuestas de la IA, eligió una cuarta que combina partes de ellas (P12);
  - la 013 va antes de la entrega.
- **Técnicas:**
  - D1: Mapbox en todos los mapas;
  - D3: las miniaturas son imágenes estáticas de Mapbox;
  - D5: `limit` opcional en `nearby` en lugar de un endpoint nuevo;
  - D7: el total de 7 días se suma en SQLite.

### [014](../specs/014-resumen-bitacora/spec.md) Resumen y bitácora (2026-11-21)

- **Del usuario:** la línea de contexto sigue tres reglas con prioridad. El punto más alto se marca como aproximado. El perfil necesita al menos 10 lecturas y 200 m. Se muestra el perfil de GPS aunque herede F5. La spec va completa antes de la entrega.
- **Técnicas:**
  - D1: el perfil se calcula al abrir el resumen y no se guarda;
  - D2: la serie del barómetro se alinea con la mediana de la altitud GPS;
  - D4: las miniaturas se calculan bajo demanda, con caché;
  - D8 y D11: sombras con `boxShadow` y tokens por modo.

### [015](../specs/015-filtros-y-ajustes/spec.md) Filtros y ajustes (2026-11-22)

- **Del usuario:**
  - filtro por mes;
  - "altura" es el punto más alto, no la subida;
  - los totales cuentan solo lo filtrado;
  - los filtros se olvidan al cerrar la app, por recomendación de la IA (P4);
  - 3D por omisión en Explorar y en el detalle;
  - rangos con un control deslizante.
- **Técnicas:**
  - D2: los filtros se aplican en memoria;
  - D4: un `RangeSlider` propio;
  - D5: el panel es un `Modal` desde abajo.

### [012](../specs/012-entrega/spec.md) Entrega (2026-11-22 y 23)

- **Del usuario:**
  - backend siempre encendido: primero Oracle y luego **Azure for Students** (P1);
  - el APK va adjunto;
  - manual en Markdown;
  - demo en vivo con el bot real;
  - F5 queda como limitación conocida;
  - el ícono es el logo cuadrado de la 009;
  - no se guardan las actividades con menos de 3 puntos válidos, y las que ya existían se borran.
- **Técnicas:**
  - D1: punto válido = precisión de 20 m o mejor, o sin precisión;
  - D3: primero se termina la sesión de seguridad y después se borra la actividad;
  - D4: borrado único con la versión 8 de SQLite y una migración de datos;
  - D6: `expo-splash-screen`;
  - D7: EAS Build en la nube;
  - D8 a D10: Azure con systemd, Caddy y `sslip.io`;
  - D11: apilar los botones del panel desde 110 % de letra.
- **Durante la implementación**, con nota en el historial de la spec:
  - el umbral de D11 es **1.05 y no 1.1**, porque Android entrega la escala un poco por debajo de su valor;
  - el primer despliegue usó `SIN_MIGRAR=1`, para que la migración que borra datos esperara al respaldo (T17);
  - la máquina es `Standard_B2ats_v2`, porque la `B1s` no tenía capacidad en la única región cercana permitida;
  - las 75 actividades cortas del servidor se borraron después de que el usuario las revisó y respaldó la base.
