---
description: Crea una nueva spec (spec.md) a partir de una descripción de la funcionalidad
argument-hint: <descripción de la funcionalidad>
---

Crea una nueva especificación para: $ARGUMENTS

1. Lee `specs/constitution.md`, `specs/roadmap.md` y `specs/_templates/spec.md`.
2. Determina el siguiente número `NNN` revisando las carpetas existentes en `specs/`, y un nombre corto en kebab-case en español.
3. Crea `specs/NNN-nombre/spec.md` usando la plantilla. Estado: `Borrador`.
   - Solo **qué** y **por qué**: nada de endpoints, tablas ni librerías.
   - Criterios de aceptación numerados (`CA-x`), verificables, en formato Dado/Cuando/Entonces y ligados a una historia (`HU-x`).
   - Llena "Fuera de alcance" indicando qué spec futura del roadmap cubre cada punto excluido.
   - Lo que no puedas deducir va en "Preguntas abiertas"; no lo inventes.
4. Agrega o actualiza la fila en `specs/roadmap.md`.
5. No escribas plan, tareas ni código. Termina con las preguntas abiertas para que el usuario las resuelva y apruebe la spec.
