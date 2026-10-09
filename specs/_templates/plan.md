# NNN — Plan técnico

Spec: [spec.md](spec.md)

## Resumen

Cómo se va a resolver, en un párrafo.

## Verificación contra la constitución

- [ ] Art. 2 Offline-first: ...
- [ ] Art. 3 Seguridad: ...
- [ ] Art. 4 Contratos de API: ...
- [ ] Art. 5 Datos: ...

## Backend

### Endpoints

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| POST | `/...` | JWT | `{ ... }` | `201 { ... }` | `400`, `409` |

### Módulos / archivos

- `backend/src/...` — ...

### Cambios de esquema (Prisma)

Migración: `NNN_nombre`. Modelos y campos afectados.

## Frontend

### Pantallas y navegación

- `frontend/pages/...` — ...

### Hooks / estado / almacenamiento local

- `frontend/hooks/...` — ...
- Cambios a SQLite: ...

## Decisiones

| Decisión | Alternativas consideradas | Motivo |
|---|---|---|

## Riesgos

- ...
