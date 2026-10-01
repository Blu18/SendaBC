# 002 — Inicio de sesión y sesión persistente

- **Estado:** Implementada con pendientes
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
- Edición de perfil (se especifica junto con el contacto de emergencia en la spec 008).

## Historial

- 2026-09-30 — Retro-spec creada a partir del código existente.
