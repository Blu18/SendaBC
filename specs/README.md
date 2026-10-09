# Especificaciones de SendaBC

Esta carpeta es la fuente de verdad del proyecto. El código se deriva de lo que aquí está escrito. Si cambia un requisito, se cambia primero aquí.

## Contenido

| Archivo / carpeta | Para qué sirve |
|---|---|
| [`constitution.md`](constitution.md) | Principios y reglas técnicas que ninguna spec puede romper |
| [`roadmap.md`](roadmap.md) | Mapa de las 10 semanas → specs, con su estado |
| [`_templates/`](_templates/) | Plantillas de `spec.md`, `plan.md` y `tasks.md` |
| `NNN-nombre/` | Una carpeta por funcionalidad |

## Flujo por funcionalidad

```
spec.md  ──aprobación──▶  plan.md  ──aprobación──▶  tasks.md  ──▶  código + pruebas  ──▶  verificación
 (qué/por qué)            (cómo)                    (pasos)                               (CA cumplidos)
```

1. Copia `_templates/` a `specs/NNN-nombre-corto/` (o usa `/spec-new`).
2. Escribe `spec.md`. Estado: `Borrador` → `Aprobada` cuando el equipo la revise.
3. Escribe `plan.md` respetando la constitución.
4. Escribe `tasks.md`; cada tarea cita los criterios de aceptación (`CA-x`) que cubre.
5. Implementa tarea por tarea, marcando `[x]`.
6. Verifica cada `CA-x` (prueba automatizada o caso manual) y pasa la spec a `Implementada`.

## Estados de una spec

`Borrador` → `Aprobada` → `En progreso` → `Implementada`. Una spec también puede quedar como `Implementada con pendientes` si se cerró la semana con brechas conocidas (se listan en `tasks.md`).

## Numeración

Tres dígitos, en orden de creación: `001-registro-usuario`, `002-inicio-sesion`, ... El número se usa en ramas (`003-captura-gps`) y commits (`feat(003): ...`).
