---
description: Implementa la siguiente tarea pendiente (o una tarea concreta) de una spec
argument-hint: <NNN> [Tn]
---

Implementa tareas de la spec $ARGUMENTS.

1. Lee `specs/constitution.md` y `spec.md`, `plan.md` y `tasks.md` de la spec.
2. Si no se indicó una tarea, toma la primera `[ ]` cuyas dependencias estén hechas. Implementa **una tarea a la vez**.
3. Sigue el plan. Si el plan o la spec resultan incorrectos o incompletos, detente, explica el problema y propone el cambio a la spec/plan antes de seguir.
4. Escribe la prueba de backend indicada en la tabla de verificación junto con el código (Vitest; `npm test` en `backend/`).
5. Al terminar, marca la tarea `[x]` en `tasks.md`, actualiza el estado de la spec a `En progreso` si aún no lo está, y resume qué cambió y cómo verificarlo.
6. No hagas commit salvo que el usuario lo pida. Si lo pide, usa `feat(NNN): ...` / `fix(NNN): ...`.
