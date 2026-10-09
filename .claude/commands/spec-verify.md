---
description: Verifica una spec contra el código y sus criterios de aceptación
argument-hint: <NNN o carpeta de la spec>
---

Verifica la spec $ARGUMENTS.

1. Lee `spec.md`, `plan.md` y `tasks.md` de la spec y `specs/constitution.md`.
2. Para cada `CA-x`:
   - Si tiene prueba automatizada, ejecútala (`npm test` / `npm run test:e2e` en `backend/`) y reporta el resultado real.
   - Si es manual, revisa el código para confirmar que el comportamiento existe y lista los pasos del caso `Mn` para que el usuario lo ejecute.
3. Revisa que el código respete la constitución (en especial los artículos 2, 3 y 4).
4. Actualiza la columna "Estado" de la tabla de verificación en `tasks.md`.
5. Reporta: CA que cumplen, CA que fallan (con evidencia) y desviaciones entre código y spec. Propón el estado final (`Implementada` o `Implementada con pendientes`) y actualiza `specs/roadmap.md` solo si el usuario lo confirma.
