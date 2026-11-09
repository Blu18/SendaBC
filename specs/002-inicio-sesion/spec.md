# 002 — Inicio de sesión y sesión persistente

- **Estado:** Implementada
- **Semana:** 2
- **Fecha:** 2026-09-30 (retro-spec)

## Contexto y objetivo

Una persona con cuenta debe poder entrar a la app y no tener que volver a escribir sus credenciales cada vez que la abre. El backend debe proteger los datos de cada usuario.

## Historias de usuario

- **HU-1:** Como usuario registrado, quiero iniciar sesión con correo y contraseña para acceder a mis datos.
- **HU-2:** Como usuario, quiero que la app recuerde mi sesión al cerrarla y abrirla de nuevo.
- **HU-3:** Como usuario, quiero cerrar sesión para que nadie más use mi cuenta en este teléfono.
- **HU-4:** Como usuario, quiero que solo yo pueda ver y modificar mi perfil.

## Criterios de aceptación

- **CA-1 (HU-1):** Dadas credenciales válidas, cuando inicio sesión, la API responde `200 { id, token }` y la app me lleva a la pantalla principal sin poder regresar a Login con el botón "atrás".
- **CA-2 (HU-1):** Dadas credenciales inválidas (correo inexistente o contraseña incorrecta), la API responde `401` con el mismo mensaje en ambos casos ("Credenciales invalidas") y la app lo muestra en pantalla.
- **CA-3 (HU-1):** La app valida formato de correo y contraseña ≥ 8 caracteres antes de llamar a la API.
- **CA-4 (HU-2):** Dada una sesión iniciada, cuando cierro y abro la app, entro directo a la pantalla principal (con un indicador de carga mientras se lee el token).
- **CA-5 (HU-2):** Dado un token expirado o inválido, cuando la API responde `401`, la app cierra la sesión local y me regresa a la pantalla de inicio.
- **CA-6 (HU-3):** Cuando presiono "Cerrar sesión", el token se borra del dispositivo y regreso a la pantalla de inicio sin poder volver atrás.
- **CA-7 (HU-4):** `GET /user/profile` con token válido devuelve mis datos sin `passwordHash`; sin token responde `401`.
- **CA-8 (HU-4):** Ningún endpoint permite leer, modificar o borrar a **otro** usuario. Las operaciones sobre "mi usuario" toman el id del token.

## Reglas de negocio

- RN-1: El token es un JWT con payload `{ id }`, firmado con `JWT_SECRET` y con expiración `JWT_EXPIRE_IN`.
- RN-2: El backend no arranca si `JWT_SECRET` no está definido.

## Fuera de alcance

- Refresh tokens, cierre de sesión en todos los dispositivos, recuperación de contraseña.
- Edición de perfil y cuenta (spec 011, HU-9 y HU-10; el contacto de emergencia está en la 008).

## Historial

- 2026-11-06 — Referencia actualizada: la edición de perfil está en la spec 011 (HU-9). Sin cambios de comportamiento.
- 2026-11-05 — Referencias actualizadas por la nueva numeración del roadmap: 010-mapa-3d-animaciones, 011-estabilidad y 012-entrega. Sin cambios de comportamiento.
- 2026-11-01 — Pasos de navegación de los casos manuales actualizados a la barra de pestañas de la spec 009 (T19, CA-15). La "pantalla principal" es la pestaña Inicio y la "pantalla de inicio" pasa a llamarse bienvenida (M1, M3, M4 y M5). Los CA no cambian.
- 2026-10-21 — La edición del perfil y de la cuenta pasa de la spec 008 a la 009 (spec 008, P7).
- 2026-09-30 — Retro-spec creada a partir del código existente.
- 2026-10-08 — CA-8: se quitan los stubs `PATCH /user/:id` y `DELETE /user/:id` (y `UpdateUserDto`). Editar o borrar la cuenta se especifica en la spec 008, con rutas `/user/me`.
- 2026-10-08 — Tareas de backend T1–T4 completadas, con pruebas Vitest y e2e. Quedan las de frontend (T5–T7).
- 2026-10-08 — Tareas de frontend T5–T7 completadas. El login también usa el límite de 10 s y el mensaje genérico sin conexión (como el registro, spec 001), con su caso manual M6. Quedan los casos manuales en dispositivo.
- 2026-10-08 — Casos manuales M1–M6 aprobados en dispositivo. Todos los CA verificados; la spec pasa a Implementada.
