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

- [ ] T1 — `jwt.config.ts`: fallar al arrancar si falta `JWT_SECRET` (sin valor por defecto). (RN-2)
- [ ] T2 — Reemplazar `PATCH /user/:id` y `DELETE /user/:id` por `/user/me` usando `req.user.id`, o quitarlos hasta la spec 008. (CA-8)
- [ ] T3 — Pruebas Vitest de `AuthService.validateUser`: usuario inexistente → `401`; contraseña incorrecta → `401`; correcta → `{ id }`. (CA-1, CA-2)
- [ ] T4 — Prueba e2e: login correcto → `200` con token; con ese token `GET /user/profile` → `200` sin `passwordHash`; sin token → `401`. (CA-1, CA-7)

### Frontend

- [ ] T5 — Tras login exitoso usar `navigation.reset` a `MainPage` (hoy usa `navigate` y se puede volver a Login). (CA-1)
- [ ] T6 — Mostrar el error `401` en pantalla y deshabilitar el botón mientras `isPending`. (CA-2)
- [ ] T7 — Manejo central de `401`: si una petición autenticada responde `401`, llamar `logout()` y volver a `Index`. (CA-5)

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | T4 + caso M1 | Ambas | Parcial (login ok; la navegación permite volver a Login) |
| CA-2 | T3 + caso M2 | Ambas | Parcial (API ok, UI no muestra error) |
| CA-3 | Caso M2 | Manual | Cumple |
| CA-4 | Caso M3 | Manual | Cumple |
| CA-5 | Caso M4 | Manual | Pendiente |
| CA-6 | Caso M5 | Manual | Cumple |
| CA-7 | T4 | Automatizada | Pendiente de prueba |
| CA-8 | T2 + revisión de rutas | Revisión | Pendiente |

### Casos manuales

**M1 — Login correcto:** iniciar sesión con una cuenta válida → llega a la pantalla principal con "Hola, <nombre>"; el botón atrás no regresa a Login.

**M2 — Login incorrecto:** contraseña equivocada → mensaje "Credenciales invalidas" visible. Correo mal formado → error en el campo, sin petición.

**M3 — Sesión persistente:** iniciar sesión, cerrar la app por completo, abrirla → spinner breve y entra directo a la pantalla principal.

**M4 — Token expirado:** poner `JWT_EXPIRE_IN=30s`, iniciar sesión, esperar 1 min y reabrir → la app regresa a la pantalla de inicio.

**M5 — Cerrar sesión:** presionar "Cerrar sesión" → pantalla de inicio; atrás no regresa; reabrir la app → sigue sin sesión.
