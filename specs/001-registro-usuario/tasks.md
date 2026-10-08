# 001 — Tareas

Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md)

## Hecho (semana 2)

- [x] Endpoint `POST /user` con Prisma y manejo de email duplicado → `409` (CA-4)
- [x] Respuesta sin `passwordHash` (CA-1)
- [x] Trigger en Supabase que hashea la contraseña con bcrypt al insertar (CA-2, CA-3)
- [x] Pantalla de registro con validación en cliente (CA-5)
- [x] Hook `useRegistrar` con TanStack Query

## Pendiente (brechas detectadas al adoptar SDD)

### Backend

- [x] T1 — Crear `CreateUserDto` propio con `email` (`@IsEmail`), `displayName` (`@IsNotEmpty`), `password` (`@MinLength(8)`) y dejar de heredar de la entidad. El servicio mapea `password` → `passwordHash` al crear para que el trigger lo hashee. (CA-6, RN-2, RN-3)
- [x] T2 — Versionar el trigger de hash en `prisma/migrations/20260930000000_hash_password_trigger` (función `public.hash_password`, trigger `hash_password_trigger`, idempotente). (CA-3, constitución 5.1)
- [x] T2b — Migración aplicada en Supabase (`prisma migrate deploy`, 2026-09-30). Verificado con un INSERT revertido: un solo trigger, hash `$2a$`, `bcrypt.compare` de Node → `true`.
- [x] T3 — Normalizar email (trim + minúsculas) al crear y en `findByEmail`. (RN-1)
- [x] T4 — `ValidationPipe`: responder `400` con los mensajes por campo (en español) en lugar de "Validation failed"; activar `whitelist` para descartar campos no declarados. (CA-6)
- [x] T5 — Pruebas Vitest de `UserService.create`: omite `passwordHash` y lanza `ConflictException` en `P2002`. (CA-1, CA-4)
- [x] T6 — Prueba e2e contra una base con migraciones aplicadas: `POST /user` → `201`; el `passwordHash` guardado empieza con `$2`; repetido → `409`; body inválido → `400`; luego `POST /auth/login` con esas credenciales → `200`. (CA-1, CA-2, CA-3, CA-4, CA-6)

### Frontend

- [x] T7 — Enviar `password` en lugar de `passwordHash` en `useRegistrar` y en el tipo `Registrar`. (depende de T1)
- [x] T8 — Mostrar el error del servidor en pantalla (p. ej. el `409`) en vez de solo `console.log`; deshabilitar el botón mientras `isPending`. (CA-4)
- [x] T9 — Tras registro exitoso: mensaje de confirmación y navegación a Login. (CA-7)

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | T5 + T6 (`user.service.spec.ts`, `test/user.e2e-spec.ts`) | Automatizada | Cumple |
| CA-2 | T6 (registro → login) + caso M3 | Ambas | Cumple |
| CA-3 | T6 (el hash empieza con `$2`) | Automatizada | Cumple |
| CA-4 | T5 + T6 + `lib/api/errors.test.ts`, `lib/api/client.test.ts` + casos M2 y M4 | Ambas | Cumple |
| CA-5 | Caso M1 (incluye RN-4) | Manual | Cumple |
| CA-6 | T6 + `create-user.dto.spec.ts` + `validation.pipe.spec.ts` | Automatizada | Cumple |
| CA-7 | Caso M3 | Manual | Cumple |

En `frontend/`, `npm test` corre `lib/api/errors.test.ts` (lectura del error de la API) y `lib/api/client.test.ts` (tiempo límite de la petición). En `backend/`, `npm test` corre las unitarias; `npm run test:e2e` corre T6 contra la base de `DATABASE_URL` (crea un usuario `e2e-<uuid>@senda.bc` y lo borra al terminar).

### Casos manuales

M1–M4 ejecutados en dispositivo el 2026-10-08: todos pasan.

**M1 — Validación en cliente**
1. Abrir Registro, dejar campos vacíos y presionar "Registrarse".
2. Probar correo `abc`, usuario `Ana` (y `  Ana  `), contraseña `123`, confirmación distinta.
- **Esperado:** cada campo muestra su error; no hay petición de red.

**M2 — Correo duplicado**
1. Registrar `prueba@senda.bc`. 2. Volver a registrar el mismo correo.
- **Esperado:** mensaje "Ya existe un usuario con ese email" visible en pantalla. Mientras la petición está en curso el botón dice "Registrando..." y no responde a toques.

**M3 — Registro exitoso**
1. Registrar un correo nuevo con datos válidos.
- **Esperado:** la app pasa a Login con el correo ya escrito y el mensaje "Tu cuenta se creó correctamente…"; el botón atrás no regresa al formulario; iniciar sesión con esos datos funciona.

**M4 — Sin conexión**
1. Apagar el backend (o el wifi) y enviar un registro válido.
- **Esperado:** en 10 s o menos aparece "Error al registrar usuario. Inténtalo más tarde." y el botón vuelve a habilitarse.
