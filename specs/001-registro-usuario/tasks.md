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
- [ ] T3 — Normalizar email (trim + minúsculas) al crear y en `findByEmail`. (RN-1)
- [ ] T4 — `ValidationPipe`: responder `400` con los mensajes por campo (en español) en lugar de "Validation failed"; activar `whitelist` para descartar campos no declarados. (CA-6)
- [ ] T5 — Pruebas Vitest de `UserService.create`: omite `passwordHash` y lanza `ConflictException` en `P2002`. (CA-1, CA-4)
- [ ] T6 — Prueba e2e contra una base con migraciones aplicadas: `POST /user` → `201`; el `passwordHash` guardado empieza con `$2`; repetido → `409`; body inválido → `400`; luego `POST /auth/login` con esas credenciales → `200`. (CA-1, CA-2, CA-3, CA-4, CA-6)

### Frontend

- [ ] T7 — Enviar `password` en lugar de `passwordHash` en `useRegistrar` y en el tipo `Registrar`. (depende de T1)
- [ ] T8 — Mostrar el error del servidor en pantalla (p. ej. el `409`) en vez de solo `console.log`; deshabilitar el botón mientras `isPending`. (CA-4)
- [ ] T9 — Tras registro exitoso: mensaje de confirmación y navegación a Login. (CA-7)

## Verificación

| CA | Cómo se verifica | Tipo | Estado |
|---|---|---|---|
| CA-1 | T5 + T6 | Automatizada | Cumple (falta prueba) |
| CA-2 | T6 (registro → login) + caso M3 | Ambas | Cumple (falta prueba) |
| CA-3 | T6 (el hash empieza con `$2`) | Automatizada | Cumple (falta prueba) |
| CA-4 | T5 + T6 + caso M2 | Ambas | Parcial (API ok, UI no muestra el error) |
| CA-5 | Caso M1 | Manual | Cumple |
| CA-6 | T6 | Automatizada | Parcial (no valida longitud mínima) |
| CA-7 | Caso M3 | Manual | Pendiente |

### Casos manuales

**M1 — Validación en cliente**
1. Abrir Registro, dejar campos vacíos y presionar "Registrarse".
2. Probar correo `abc`, contraseña `123`, confirmación distinta.
- **Esperado:** cada campo muestra su error; no hay petición de red.

**M2 — Correo duplicado**
1. Registrar `prueba@senda.bc`. 2. Volver a registrar el mismo correo.
- **Esperado:** mensaje "Ya existe un usuario con ese email" visible en pantalla.

**M3 — Registro exitoso**
1. Registrar un correo nuevo con datos válidos.
- **Esperado:** confirmación visible y la app navega a Login; iniciar sesión con esos datos funciona.
