# 001 — Registro de usuario

- **Estado:** Implementada con pendientes
- **Semana:** 2
- **Fecha:** 2026-09-30 (retro-spec: documenta lo construido antes de adoptar SDD)

## Contexto y objetivo

Para guardar actividades, publicar rutas y configurar un contacto de emergencia, cada persona necesita una cuenta. Esta spec cubre crear la cuenta desde la app.

## Historias de usuario

- **HU-1:** Como persona nueva, quiero crear una cuenta con mi correo, un nombre visible y una contraseña para guardar mis actividades.
- **HU-2:** Como persona que se equivocó al llenar el formulario, quiero ver qué campo está mal antes de enviarlo y entender por qué falló el registro si el servidor lo rechaza.

## Criterios de aceptación

- **CA-1 (HU-1):** Dado un correo no registrado, un nombre visible de al menos 5 caracteres y una contraseña de al menos 8 caracteres, cuando envío el formulario, entonces se crea la cuenta y la API responde `201` con los datos del usuario **sin** `passwordHash`.
- **CA-2 (HU-1):** Dada una cuenta recién creada, cuando inicio sesión con el mismo correo y contraseña, entonces el inicio de sesión es exitoso (ver spec 002).
- **CA-3 (HU-1):** La contraseña se almacena en la base de datos únicamente como hash bcrypt; nunca en texto plano.
- **CA-4 (HU-2):** Dado un correo ya registrado, cuando envío el formulario, entonces la API responde `409` y la app muestra "Ya existe un usuario con ese email".
- **CA-5 (HU-2):** Dado un formulario con correo inválido, nombre de menos de 5 caracteres, contraseña menor a 8 caracteres o confirmación distinta, cuando presiono "Registrarse", entonces la app muestra el error junto al campo y no llama a la API.
- **CA-6 (HU-2):** Dado un body inválido enviado directo a la API (sin pasar por la app), entonces la API responde `400`. El backend valida lo mismo que la app: correo válido, nombre ≥ 5 caracteres, contraseña ≥ 8 caracteres.
- **CA-7 (HU-1):** Dado un registro exitoso, la app me lleva a iniciar sesión (o directamente a la pantalla principal con sesión iniciada) y me informa que la cuenta se creó.

## Reglas de negocio y validaciones

- RN-1: El correo es único. Se normaliza (minúsculas, sin espacios al inicio/fin) antes de guardarlo y de buscarlo.
- RN-2: Contraseña mínima de 8 caracteres.
- RN-3: En el registro solo se aceptan `email`, `displayName` y `password`. Avatar y contacto de emergencia se configuran después (spec 008).
- RN-4: Nombre visible mínimo de 5 caracteres, sin contar los espacios al inicio y al final (se guarda sin ellos).

## Requisitos no funcionales

- Mensajes de error en español.
- El hash se calcula en el servidor, nunca en la app (constitución 3.1).

## Fuera de alcance

- Verificación de correo, recuperación de contraseña, login social.
- Edición de perfil y contacto de emergencia (spec 008).

## Historial

- 2026-09-30 — Retro-spec creada a partir del código existente. Se detectan brechas (ver `tasks.md`).
- 2026-09-30 — Corrección: el hash bcrypt lo hace un trigger en Supabase; CA-2 y CA-3 sí se cumplen.
- 2026-10-08 — Tareas de backend T1, T3–T6 completadas: `POST /user` recibe `password`, normaliza el correo y responde `400` con mensajes por campo. La app debe enviar `password` (T7) para volver a registrar.
- 2026-10-08 — Tareas de frontend T7–T9 completadas: la app envía `password`, muestra los errores del servidor y, tras registrarse, pasa a Login con confirmación. Quedan pendientes los casos manuales M2–M4 en dispositivo.
- 2026-10-08 — Sin conexión, el registro espera como máximo 10 s y muestra "Error al registrar usuario. Inténtalo más tarde." (también ante un error 5xx), en lugar de "No se pudo conectar con el servidor", que tardaba mucho en aparecer.
- 2026-10-08 — Se agrega RN-4: el nombre visible debe tener al menos 5 caracteres (antes solo no vacío). Se ajustan CA-1, CA-5 y CA-6.
