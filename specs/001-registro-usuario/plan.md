# 001 — Plan técnico

Spec: [spec.md](spec.md)

## Resumen

Endpoint público `POST /user` en NestJS que valida el body con class-validator y crea el usuario con Prisma. Un trigger de PostgreSQL en Supabase reemplaza la contraseña recibida por su hash bcrypt (`pgcrypto`) antes de insertar en `users`. En la app, la pantalla `Register` valida en cliente y llama al endpoint con TanStack Query.

## Verificación contra la constitución

- [x] Art. 3.1 — Hash bcrypt generado en el servidor por el trigger de Supabase.
- [x] Art. 5.1 — Trigger versionado en `backend/prisma/migrations/20260930000000_hash_password_trigger/`.
- [x] Art. 3.2 — `UserService.create` omite `passwordHash` de la respuesta.
- [x] Art. 4.1 — Validación con `class-validator` vía `ValidationPipe` global.
- [ ] Art. 4.3 — El `ValidationPipe` responde un mensaje genérico en inglés ("Validation failed").

## Backend

### Endpoints

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| POST | `/user` | Pública | `{ email, displayName, password }` | `201 { id, email, displayName, avatarUrl, emergencyContactName, emergencyContactPhone, createdAt, updatedAt }` | `400` validación, `409` email duplicado |

> El request usa `password`; el servicio lo guarda en `passwordHash` y el trigger lo hashea (T1).

### Archivos

- `backend/src/user/user.controller.ts` — `POST /user`.
- `backend/src/user/user.service.ts` — `create()`: captura `P2002` → `ConflictException` (409).
- `backend/src/user/dto/create-user.dto.ts` — DTO propio con `email`, `displayName`, `password` (mensajes en español).
- `backend/src/validation/validation.pipe.ts` — pipe global de validación.

### Esquema

Usa el modelo `User` (`users`). Trigger `hash_password_trigger` (`BEFORE INSERT OR UPDATE` en `users`) que ejecuta `public.hash_password()`: hashea con `crypt(..., gen_salt('bf'))` de `pgcrypto` al insertar o cuando cambia `passwordHash`. Migración: `20260930000000_hash_password_trigger`. `bcrypt.compare` de Node acepta los hashes `$2a$` que genera `pgcrypto`.

## Frontend

- `frontend/pages/auth/register.tsx` — formulario y validación en cliente (`validarCampos`).
- `frontend/hooks/auth/auth.hooks.ts` — `useRegistrar()` (mutación a `POST /user`).
- `frontend/lib/api/client.ts` — `apiFetch` con `EXPO_PUBLIC_BACKEND_IP`.

## Decisiones

| Decisión | Alternativas | Motivo |
|---|---|---|
| Auth propia con Passport + JWT | Supabase Auth | Ya implementada en la semana 2; control total del flujo y menos dependencia externa. |
| Hash con trigger en Supabase (`pgcrypto`) | Hash en NestJS con `bcrypt`; hash en cliente | Ya implementado así. El hash en cliente está prohibido (el hash se volvería la contraseña real). |
| DTO de registro propio | Reusar la entidad `User` con `OmitType` | La entidad expone campos que no deben aceptarse al registrar (`passwordHash`, avatar, contacto). |

## Riesgos

- Como el trigger también actúa en `UPDATE`, cualquier código que escriba `passwordHash` debe mandar la contraseña en texto plano, nunca un hash ya calculado (se hashearía dos veces).
