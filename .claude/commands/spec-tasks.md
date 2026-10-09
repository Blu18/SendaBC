---
description: Divide el plan de una spec en tareas verificables (tasks.md)
argument-hint: <NNN o carpeta de la spec>
---

Genera las tareas de la spec $ARGUMENTS.

1. Lee `spec.md` y `plan.md` de esa carpeta y `specs/_templates/tasks.md`.
2. Escribe `tasks.md`:
   - Tareas pequeñas (idealmente un commit cada una), ordenadas por dependencia, con ID `Tn` y los `CA-x` que cubren.
   - Todo `CA-x` de la spec debe estar cubierto por al menos una tarea. Si alguno no lo está, dilo.
   - Tabla de verificación: cada `CA-x` con su prueba Vitest (backend) o caso manual `Mn` con pasos y resultado esperado (frontend).
3. Propón cómo agrupar las tareas en al menos 3 commits de la semana (`feat(NNN)`, `test/fix(NNN)`, `chore/docs(NNN)`).
