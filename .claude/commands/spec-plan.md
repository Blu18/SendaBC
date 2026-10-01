---
description: Escribe el plan técnico (plan.md) de una spec aprobada
argument-hint: <NNN o carpeta de la spec>
---

Escribe el plan técnico de la spec $ARGUMENTS.

1. Lee la `spec.md` de esa carpeta, `specs/constitution.md` y `specs/_templates/plan.md`.
2. Si la spec está en `Borrador` o tiene preguntas abiertas sin resolver, avísalo y pregunta si continuar.
3. Revisa el código relacionado (`backend/prisma/schema.prisma`, módulos de NestJS, hooks y pantallas del frontend) para que el plan parta de lo que ya existe.
4. Escribe `plan.md` con la plantilla:
   - Llena "Verificación contra la constitución" artículo por artículo.
   - Documenta cada endpoint (método, ruta, auth, request, response, errores).
   - Cambios de esquema: nombre de la migración de Prisma o versión nueva de SQLite.
   - Toda dependencia nueva fuera del stack de la constitución va en "Decisiones" con su justificación.
5. No escribas código. Pide al usuario que revise el plan.
