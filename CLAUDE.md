# SendaBC — Guía para agentes

App móvil para registrar actividades al aire libre (senderismo, trail running, ciclismo) en Baja California: captura GPS offline-first, catálogo de rutas con PostGIS y módulo de seguridad por inactividad.

- `backend/` — NestJS 12 + Prisma 7 (adapter `pg`) + PostgreSQL/PostGIS en Supabase. Pruebas con Vitest.
- `frontend/` — Expo SDK 57 + React Native + TypeScript. TanStack Query, React Navigation (API estática), `expo-sqlite`, `expo-location`, `expo-secure-store`. Lee `frontend/AGENTS.md` antes de tocar código de Expo.
- `specs/` — **fuente de verdad del proyecto**. Constitución, roadmap, plantillas y una carpeta por funcionalidad.

## Metodología: Spec-Driven Development

Todo cambio de funcionalidad sigue este flujo. No lo saltes.

1. **Spec** (`specs/NNN-nombre/spec.md`): qué y por qué. Historias de usuario y criterios de aceptación verificables. Nada de detalles de implementación.
2. **Plan** (`plan.md`): cómo. Endpoints, modelos, pantallas, decisiones técnicas. Debe respetar `specs/constitution.md`.
3. **Tareas** (`tasks.md`): checklist ordenada; cada tarea cita los criterios de aceptación (`CA-x`) que cubre.
4. **Implementación**: una tarea a la vez; marca `[x]` en `tasks.md` al terminarla.
5. **Verificación**: cada `CA-x` se comprueba con una prueba automatizada (backend) o un caso manual documentado en `tasks.md` (frontend).

Reglas para el agente:
- Antes de escribir código de una funcionalidad, lee su `spec.md`, `plan.md` y `tasks.md`, y `specs/constitution.md`. Si no existe spec, propón crearla (`/spec-new`) en lugar de programar directamente.
- No cambies el estado de una spec a `Aprobada` tú mismo: el usuario aprueba spec y plan antes de implementar.
- Si durante la implementación descubres que la spec es incorrecta o incompleta, **detente y actualiza primero la spec** (anota el cambio en su sección "Historial"), luego el código.
- Excepciones al flujo completo: fixes triviales, chores de configuración y documentación. Aun así, si tocan comportamiento descrito en una spec, actualiza la spec.
- Al terminar una spec, actualiza su estado y `specs/roadmap.md`.

Comandos del flujo (en `.claude/commands/`): `/spec-new`, `/spec-plan`, `/spec-tasks`, `/spec-implement`, `/spec-verify`.

## Comandos útiles

Backend (`cd backend`):
- `npm run start:dev` — servidor en modo watch (puerto `PORT`, por defecto 3000)
- `npm test` — pruebas unitarias (Vitest) · `npm run test:e2e` — e2e
- `npm run lint` — oxlint · `npm run format` — Prettier
- `npx prisma migrate dev --name <nombre>` — nueva migración

Frontend (`cd frontend`):
- `npx expo start` — servidor de desarrollo
- Variable `EXPO_PUBLIC_BACKEND_IP` con la URL base del backend

## Commits

Conventional commits que citen la spec: `feat(003): guardar puntos GPS en SQLite`, `fix(002): ...`, `docs(specs): ...`. Meta: mínimo 3 commits por semana (feat / fix-test / chore-docs).
