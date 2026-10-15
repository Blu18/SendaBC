# Constitución de SendaBC

Versión 1.4 · 2026-10-09 · **Aprobada**

Principios que toda spec, plan y línea de código debe respetar. Cambiar la constitución requiere acuerdo explícito del equipo y una entrada en el historial al final de este archivo.

---

## Artículo 1 — La spec primero

1.1. Ninguna funcionalidad se implementa sin `spec.md` aprobada y `plan.md` revisado.
1.2. La spec describe **qué** y **por qué**. El plan describe **cómo**. No se mezclan.
1.3. Si la implementación contradice la spec, se corrige la spec primero (con nota en su historial) y después el código.
1.4. Excepciones: fixes triviales, configuración y documentación que no cambian comportamiento especificado.

## Artículo 2 — Offline-first

2.1. Grabar una actividad **nunca** depende de la red. Durante la grabación, la base local (SQLite) es la fuente de verdad.
2.2. Toda entidad creada en el dispositivo lleva un `client_generated_id` (UUID v4) para que la sincronización sea idempotente.
2.3. Los estados de una actividad son `RECORDING` → `PENDING_SYNC` → `SYNCED` y solo avanzan en ese orden.
2.4. Un fallo de red o del backend nunca borra datos locales sin sincronizar.

## Artículo 3 — Seguridad y privacidad

3.1. Las contraseñas se guardan solo como hash bcrypt, generado en el **servidor**, nunca en la app. Hoy lo genera un trigger de PostgreSQL en Supabase (`pgcrypto`) al insertar en `users`. El cliente envía la contraseña en texto plano solo por HTTPS en producción.
3.2. Ninguna respuesta de la API incluye `passwordHash`.
3.3. Todo endpoint que lea o modifique datos de un usuario usa `JwtAuthGuard` y obtiene el id del usuario **del token**, no de parámetros de la URL ni del body.
3.4. En el dispositivo, el JWT se guarda solo en `expo-secure-store`.
3.5. La ubicación se pide con permiso de primer plano y un texto de propósito claro. No se rastrea fuera de una actividad iniciada por el usuario.
3.6. Secretos (JWT_SECRET, DATABASE_URL, claves de terceros) solo en variables de entorno, nunca en el repositorio.

## Artículo 4 — Contratos de API explícitos

4.1. Toda entrada al backend se valida con DTOs de `class-validator`.
4.2. Códigos HTTP consistentes: `400` validación, `401` no autenticado, `403` sin permiso, `404` no existe, `409` conflicto (p. ej. email duplicado).
4.3. Los mensajes de error para el usuario están en español.
4.4. Cada endpoint nuevo se documenta en el `plan.md` de su spec (método, ruta, auth, request, response, errores).

## Artículo 5 — Datos y esquema

5.1. `backend/prisma/schema.prisma` es la fuente de verdad del modelo de datos del servidor. Los cambios se hacen con migraciones con nombre descriptivo (`prisma migrate dev --name ...`), nunca editando la base a mano. Esto incluye triggers, funciones y políticas creadas en Supabase: deben existir en una migración para poder recrear la base desde cero.
5.2. Datos geoespaciales en PostGIS con SRID 4326 (WGS84), coordenadas en orden longitud, latitud.
5.3. El esquema local SQLite se define en `frontend/lib/db/sqlite.ts`. Cambios incompatibles requieren migración local versionada (`PRAGMA user_version`).
5.4. Unidades: distancias en metros, duraciones en segundos, fechas en ISO 8601 / `timestamptz` UTC.

## Artículo 6 — Verificación

6.1. Cada criterio de aceptación (`CA-x`) de una spec tiene al menos una forma de verificarse, indicada en `tasks.md`:
- **Backend:** prueba automatizada con Vitest (unitaria o e2e con supertest).
- **Frontend, lógica pura** (`frontend/lib/` sin imports de React Native, p. ej. cálculos y formato): prueba automatizada con Vitest.
- **Frontend, pantallas, sensores y comportamiento en dispositivo:** caso de prueba manual con pasos y resultado esperado.
6.2. Una spec no pasa a `Implementada` con criterios sin verificar; si se cierra la semana así, queda como `Implementada con pendientes`.
6.3. Se valida con la colección de Postman de la API antes de cerrar una spec que agregue endpoints.

## Artículo 7 — Simplicidad y stack

7.1. Stack aprobado (ver tabla). Agregar una dependencia fuera de él requiere justificarla en la sección "Decisiones" del `plan.md`.
7.2. Preferir la solución más simple que cumpla la spec. Nada de funcionalidades especulativas fuera del alcance de la spec.
7.3. Se sigue el estilo del código existente: Prettier en backend, hooks por dominio en `frontend/hooks/`, utilidades en `frontend/lib/`.

| Capa | Tecnología |
|---|---|
| App móvil | Expo SDK 57, React Native 0.86, TypeScript |
| Navegación / datos remotos | React Navigation 7 (API estática), TanStack Query 5 |
| Dispositivo | `expo-location`, `expo-sensors` (barómetro), `expo-sqlite`, `expo-secure-store`, `expo-keep-awake`, `expo-network`, `expo-notifications`, `react-native-maps` |
| Backend | NestJS 12, Passport (local + JWT), class-validator |
| Datos | Prisma 7 con `@prisma/adapter-pg`, PostgreSQL + PostGIS en Supabase |
| Calidad | Vitest + supertest (backend), Vitest para lógica pura (frontend), oxlint, Prettier, Postman |
| Despliegue | Railway o Render (API), Supabase (BD), Expo EAS Build (app) |

Diferencias respecto al plan original: se usa **Vitest** en lugar de Jest y **oxlint** en lugar de ESLint en el backend (ya venían configurados con la plantilla de NestJS 12).

## Artículo 8 — Ritmo de trabajo

8.1. Una spec por objetivo semanal del roadmap (puede haber más si el objetivo es grande).
8.2. Rama por spec (`NNN-nombre`), conventional commits que citen la spec: `feat(003): ...`.
8.3. Mínimo 3 commits por semana: funcionalidad, pruebas/ajustes, chore/docs.

---

## Historial

- 2026-09-30 — v1.0. Adopción de Spec-Driven Development en la semana 3.
- 2026-09-30 — v1.1. 3.1: el hash lo genera un trigger en Supabase, no el código de NestJS. 5.1: triggers y funciones de la base también van en migraciones.
- 2026-09-30 — v1.2. Aprobada por el equipo. Se agrega `expo-keep-awake` al stack (spec 003).
- 2026-10-05 — v1.3. 6.1 y stack: Vitest en el frontend para lógica pura (spec 004, decisión D1). Aprobada junto con el plan de la spec 004.
- 2026-10-09 — v1.4. Se agrega `expo-network` al stack (spec 005, decisión D2). Aprobada junto con el plan de la spec 005.
