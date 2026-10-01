# 002 — Plan técnico

Spec: [spec.md](spec.md)

## Resumen

Passport con dos estrategias: `local` (email + contraseña → `AuthService.validateUser`, bcrypt) para `POST /auth/login`, y `jwt` (Bearer) para rutas protegidas vía `JwtAuthGuard`. En la app, `AuthContext` guarda el token en `expo-secure-store` y `Index` redirige a `MainPage` si hay token.

## Verificación contra la constitución

- [x] Art. 3.3 — `GET /user/profile` usa el id del token.
- [ ] Art. 3.3 — `PATCH /user/:id` y `DELETE /user/:id` toman el id de la URL (hoy son stubs que no hacen nada; corregir antes de implementarlos).
- [x] Art. 3.4 — Token en `expo-secure-store`.
- [ ] Art. 3.6 — `jwt.config.ts` usa `''` como secreto por defecto.

## Backend

### Endpoints

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| POST | `/auth/login` | Pública (`LocalAuthGuard`) | `{ email, password }` | `200 { id, token }` | `401` |
| GET | `/user/profile` | JWT | — | `200` usuario sin `passwordHash` | `401` |
| PATCH | `/user/:id` | JWT | — | stub | — |
| DELETE | `/user/:id` | JWT | — | stub | — |

### Archivos

- `backend/src/auth/auth.controller.ts`, `auth.service.ts`, `auth.module.ts`
- `backend/src/auth/strategies/local.strategies.ts`, `jwt.strategies.ts`
- `backend/src/auth/guards/local-auth/`, `guards/jwt-auth/`
- `backend/src/auth/config/jwt.config.ts`
- `backend/src/user/user.controller.ts` — `GET /user/profile`

## Frontend

- `frontend/context/AuthContext.tsx` — `token`, `isLoading`, `login(token)`, `logout()`.
- `frontend/lib/auth/tokenStorage.ts` — SecureStore, clave `sendabc_token`.
- `frontend/App.tsx` — `Gate` muestra spinner mientras `isLoading`; stack `Index → Login/Register → MainPage`.
- `frontend/pages/auth/index.tsx` — redirige con `navigation.reset` a `MainPage` si hay token.
- `frontend/pages/auth/login.tsx` — formulario + `useLogin()`.
- `frontend/pages/main/mainPage.tsx` — `useProfile()` y botón de cerrar sesión.

## Decisiones

| Decisión | Alternativas | Motivo |
|---|---|---|
| JWT sin refresh token | Access + refresh | Suficiente para el alcance del proyecto; expiración configurable. |
| Manejo central de `401` en `apiFetch` | Revisarlo en cada hook | Un solo lugar para cerrar sesión cuando el token deja de servir (CA-5). |
| Rutas de "mi usuario" como `/user/me` | `/user/:id` + verificar dueño | Imposible apuntar a otro usuario por diseño (CA-8). |

## Riesgos

- El login depende de que el trigger de Supabase guarde hashes bcrypt al registrar. Mientras el trigger no esté en una migración (spec 001, T2), una base recreada rompería el login.
