# 002 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

## Hecho (semana 2)

- [x] Estrategias Passport local y JWT, `LocalAuthGuard`, `JwtAuthGuard`
- [x] `POST /auth/login` → `{ id, token }`; `401` con mensaje genérico (CA-1, CA-2)
- [x] `GET /user/profile` protegido, sin `passwordHash` (CA-7)
- [x] Pantalla de Login con validación en cliente (CA-3)
- [x] `AuthContext` + SecureStore + `Gate` con spinner + redirección en `Index` (CA-4)
- [x] Cerrar sesión con `navigation.reset` (CA-6)

## Pendiente

### Backend

- [x] T1 — `jwt.config.ts`: fallar al arrancar si falta `JWT_SECRET` (sin valor por defecto). (RN-2)
- [x] T2 — Reemplazar `PATCH /user/:id` y `DELETE /user/:id` por `/user/me` usando `req.user.id`, o quitarlos hasta la spec 008. (CA-8)
- [x] T3 — Pruebas Vitest de `AuthService.validateUser`: usuario inexistente → `401`; contraseña incorrecta → `401`; correcta → `{ id }`. (CA-1, CA-2)
- [x] T4 — Prueba e2e: login correcto → `200` con token; con ese token `GET /user/profile` → `200` sin `passwordHash`; sin token → `401`. (CA-1, CA-7)

### Frontend

- [x] T5 — Tras login exitoso usar `navigation.reset` a `MainPage` (hoy usa `navigate` y se puede volver a Login). (CA-1)
- [x] T6 — Mostrar el error `401` en pantalla y deshabilitar el botón mientras `isPending`. (CA-2)
- [x] T7 — Manejo central de `401`: si una petición autenticada responde `401`, llamar `logout()` y volver a `Index`. (CA-5)

## Verificación

En `frontend/`: `npm test` corre `lib/api/client.test.ts` (aviso de `401` con token). En `backend/`: `npm test` corre `auth.service.spec.ts` y `jwt.config.spec.ts`; `npm run test:e2e` corre `test/auth.e2e-spec.ts` contra la base de `DATABASE_URL` (crea un usuario `e2e-login-<uuid>@senda.bc` y lo borra al terminar).

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | T3 + T4 + caso M1 | Ambas | Cumple |
| CA-2 | T3 + T4 + casos M2 y M6 | Ambas | Cumple |
| CA-3 | Caso M2 | Manual | Cumple |
| CA-4 | Caso M3 | Manual | Cumple |
| CA-5 | T4 (token inválido → `401`) + `lib/api/client.test.ts` + caso M4 | Ambas | Cumple |
| CA-6 | Caso M5 | Manual | Cumple |
| CA-7 | T4 | Automatizada | Cumple |
| CA-8 | T2 + `test/auth.e2e-spec.ts` (`GET/PATCH/PUT/DELETE /user/:id` → `404` con token válido) | Automatizada | Cumple |

### Casos manuales

M1–M6 ejecutados en dispositivo el 2026-10-08: todos pasan.

**M1 — Login correcto:** iniciar sesión con una cuenta válida → llega a la pestaña Inicio con "Hola, <nombre>"; el botón atrás no regresa a Login.

**M2 — Login incorrecto:** contraseña equivocada → mensaje "Credenciales invalidas" visible; mientras espera, el botón dice "Iniciando sesión..." y no responde. Correo mal formado → error en el campo, sin petición.

**M3 — Sesión persistente:** iniciar sesión, cerrar la app por completo, abrirla → spinner breve y entra directo a la pestaña Inicio.

**M4 — Token expirado:** poner `JWT_EXPIRE_IN=30s`, iniciar sesión, esperar 1 min y reabrir → la app regresa a la bienvenida y atrás no vuelve a la pestaña Inicio.

**M6 — Sin conexión:** apagar el backend e iniciar sesión → en 10 s o menos aparece "Error al iniciar sesión. Inténtalo más tarde." y el botón vuelve a habilitarse.

**M5 — Cerrar sesión:** en la pestaña Inicio, presionar "Cerrar sesión" → bienvenida; atrás no regresa; reabrir la app → sigue sin sesión.
