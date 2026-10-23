# 008 — Contacto de emergencia y alerta por inactividad

- **Estado:** Aprobada (2026-10-22)
- **Semana:** 8
- **Autor(es):**
- **Fecha:** 2026-10-21

## Contexto y objetivo

Objetivo de la semana 8: **si a alguien le pasa algo durante una actividad, las personas de su confianza se enteran y saben dónde buscarlo.**

En la Sierra de Juárez o en San Pedro Mártir es común salir solo y quedarse sin señal durante horas. Una caída o un golpe de calor pueden dejar a alguien sin poder pedir ayuda. Esta spec agrega contactos de emergencia a la cuenta y un módulo de seguridad que, durante una actividad:

- detecta que la persona dejó de moverse, aun con la pantalla bloqueada, le pregunta si está bien y, si no responde, avisa a sus contactos por Telegram con su última ubicación conocida;
- permite pedir ayuda a mano (SOS);
- si el teléfono no tiene señal, deja que el servidor avise cuando pasa la hora de regreso que la persona indicó al salir.

Los avisos van por Telegram porque es gratuito. A cambio, cada contacto tiene que tener Telegram y aceptar una invitación antes de poder recibir avisos (P2, P15).

La spec 005 dejó para esta enviar la ubicación al servidor durante la actividad. La edición del perfil y de la cuenta, que las specs 001 y 002 habían dejado aquí, pasa a la 009 (P7).

## Historias de usuario

- **HU-1:** Como usuario, quiero registrar de uno a tres contactos de emergencia, para que alguien de confianza se entere si me pasa algo.
- **HU-2:** Como usuario, quiero que cada contacto acepte serlo en Telegram y poder enviarle un mensaje de prueba, para confirmar que le llegarán los avisos.
- **HU-3:** Como usuario, quiero indicar al iniciar una actividad a qué hora planeo regresar, para que avisen a mis contactos si no regreso y mi teléfono no tiene señal.
- **HU-4:** Como usuario que hace una actividad, quiero que la app note que dejé de moverme, aunque tenga la pantalla bloqueada, y me pregunte si estoy bien, para que no se dispare una alerta por una pausa normal.
- **HU-5:** Como usuario que no puede responder, quiero que mis contactos reciban una alerta con mi última ubicación y que sigan recibiendo mi ubicación si me muevo, para que sepan dónde buscarme.
- **HU-6:** Como usuario en problemas, quiero pedir ayuda a mano en cualquier momento de la actividad, sin esperar a la detección de inactividad.
- **HU-7:** Como usuario, quiero cancelar una alerta que se envió por error, para que mis contactos sepan que estoy bien.
- **HU-8:** Como contacto de emergencia, quiero recibir un mensaje claro (quién, qué pasó, dónde y cuándo), para poder actuar aunque no use SendaBC.

## Criterios de aceptación

### Contactos de emergencia

- **CA-1 (HU-1, HU-2):** Dado que tengo menos de tres contactos, cuando agrego uno con su nombre, entonces queda "Pendiente de aceptar" y la app me da un enlace de invitación para compartírselo por el medio que yo quiera. Con tres contactos ya no puedo agregar más (RN-3).
- **CA-2 (HU-1):** Dado un nombre vacío o de más de 40 caracteres (RN-1), cuando intento guardar, entonces veo un mensaje en español junto al campo y no se guarda nada.
- **CA-3 (HU-1):** Dado que tengo contactos, cuando edito el nombre de uno o lo quito, entonces el cambio se guarda en mi cuenta y lo veo igual al iniciar sesión en otro teléfono. Un contacto quitado deja de recibir avisos.
- **CA-4 (HU-1):** Solo yo puedo ver y cambiar mis contactos de emergencia. No aparecen en ninguna otra parte de la app ni en lo que ven otros usuarios.
- **CA-5 (HU-2):** Dado un enlace de invitación, cuando el contacto lo abre en Telegram y acepta, entonces recibe un mensaje que dice quién lo registró como contacto de emergencia en SendaBC y qué recibirá si hay una alerta, y en mi app el contacto pasa a "Activo".
- **CA-6 (HU-2):** Dado un contacto activo, cuando toco "Enviar mensaje de prueba", entonces le llega por Telegram un mensaje de prueba y veo si se envió o por qué no. Un contacto pendiente no tiene esa opción.
- **CA-7 (HU-2):** Dado un contacto que bloqueó o borró la conversación con SendaBC en Telegram, cuando un envío falla por eso, entonces en mi app el contacto aparece como "No recibe mensajes" y puedo volver a compartirle la invitación (RN-13).

### Al iniciar una actividad

- **CA-8 (HU-3):** Dado que tengo al menos un contacto activo, cuando abro la pantalla para iniciar una actividad, entonces veo que el módulo de seguridad está activo, a quiénes se avisaría, y puedo indicar, si quiero, mi hora de regreso (RN-10).
- **CA-9 (HU-3):** Dado que no tengo ningún contacto activo (no tengo contactos o ninguno ha aceptado), cuando abro la pantalla para iniciar una actividad, entonces veo un aviso de que no se puede avisar a nadie, con una forma de configurarlos. Puedo iniciar la actividad de todos modos.
- **CA-10 (HU-4):** Dado que la app no tiene el permiso para seguir mi ubicación con la pantalla bloqueada, cuando inicio una actividad con contactos activos, entonces me explica para qué lo necesita y me lo pide. Si no lo doy, la actividad se graba como hasta ahora (pantalla encendida, spec 003) y veo que la detección solo funciona con la app abierta.

### Detección de inactividad

- **CA-11 (HU-4):** Dada una actividad en curso, con la app abierta o con la pantalla bloqueada, cuando no me alejo más de 30 m durante 10 minutos (RN-4), entonces recibo la pregunta "¿Estás bien?" con una cuenta regresiva de 2 minutos, sonido y vibración. Con la pantalla bloqueada, la pregunta llega como notificación y puedo responder desde ella.
- **CA-12 (HU-4):** Dada la pregunta "¿Estás bien?", cuando respondo "Estoy bien" antes de que termine la cuenta regresiva, entonces no se envía nada y la detección vuelve a empezar desde ese momento.
- **CA-13 (HU-4):** Dada una actividad terminada, o sin ninguna actividad en curso, entonces no se detecta inactividad: fuera de una actividad iniciada por mí no se vigila nada (constitución 3.5). La app no permite pausar una actividad (specs 003 y 004), así que una parada larga cuenta como inactividad y se resuelve respondiendo "Estoy bien".

### Alerta a los contactos

- **CA-14 (HU-5):** Dada la pregunta "¿Estás bien?", cuando termina la cuenta regresiva sin respuesta, entonces se genera una alerta y todos mis contactos activos reciben por Telegram el mensaje de RN-6.
- **CA-15 (HU-5):** Dado que se generó una alerta y no hay conexión, entonces la alerta no se pierde: se envía en cuanto la haya. Si no la hay, aplica la hora de regreso (CA-18).
- **CA-16 (HU-5):** Dada una alerta activa, cuando me sigo moviendo, entonces mis contactos reciben mi ubicación actualizada mientras haya conexión, con la frecuencia de RN-11.
- **CA-17 (HU-5):** Dada una alerta activa, cuando abro la app, entonces veo que la alerta está activa, cuándo se envió y a quiénes.

### Hora de regreso

- **CA-18 (HU-3):** Dada una actividad con hora de regreso, cuando pasa esa hora más el margen (RN-10) y la actividad no ha terminado, entonces el servidor genera una alerta y avisa a mis contactos activos con la última ubicación que recibió y la hora en que la recibió, aunque mi teléfono no tenga señal.
- **CA-19 (HU-3):** Dada una actividad con hora de regreso, cuando la termino o la cambio con conexión antes de que pase, entonces el servidor ya no avisa a esa hora.
- **CA-20 (HU-3):** Dada una actividad en curso con conexión, entonces el teléfono le envía al servidor mi ubicación de vez en cuando (RN-9), para que la alerta por hora de regreso tenga la más reciente posible.
- **CA-21 (HU-3):** Dada una actividad con hora de regreso, cuando la termino sin conexión, entonces la app me avisa que, si el teléfono no se conecta antes de la hora de regreso más el margen, mis contactos recibirán un mensaje de que no he confirmado mi regreso.
- **CA-22 (HU-3, HU-7):** Dado que el servidor ya avisó por la hora de regreso, cuando mi teléfono se conecta y le informa que la actividad terminó, entonces mis contactos reciben automáticamente un mensaje de que ya terminé y estoy bien, y la alerta queda resuelta.
- **CA-23 (HU-3):** Dada una hora de regreso que el servidor todavía no recibe (por ejemplo, porque inicié sin señal), entonces la app me muestra que está pendiente de enviarse y que, hasta que se envíe, el servidor no podrá avisar por ella. Cuando el servidor la recibe, lo veo.

### SOS manual

- **CA-24 (HU-6):** Dada una actividad en curso, cuando uso la opción de pedir ayuda y la confirmo, entonces se genera una alerta como en CA-14, sin esperar a la detección de inactividad. La confirmación evita que se dispare por un toque accidental (RN-7).

### Cancelar una alerta

- **CA-25 (HU-7):** Dada una alerta activa, cuando la cancelo, entonces mis contactos reciben un mensaje de que estoy bien, la alerta queda como cancelada y dejan de llegarles mis ubicaciones.
- **CA-26 (HU-7):** Dada una alerta activa, cuando termino la actividad, entonces la app me pregunta si quiero cancelar la alerta antes de terminar.

### Reglas y acceso

- **CA-27 (HU-5, HU-6):** Una actividad tiene como máximo una alerta activa a la vez. Volver a pedir ayuda con una alerta activa no envía otro mensaje de alerta (RN-8).
- **CA-28 (HU-1 a HU-7):** Configurar contactos, enviar el mensaje de prueba, indicar la hora de regreso, ver y cancelar alertas requieren sesión iniciada. El servidor solo acepta alertas, ubicaciones y horas de regreso de actividades del usuario de la sesión. Aceptar una invitación solo requiere el enlace, no una cuenta de SendaBC.

## Reglas de negocio y validaciones

- RN-1: El nombre de un contacto es el que el usuario le da (por ejemplo, "Mamá"). Es obligatorio, sin contar los espacios del principio y del final, y tiene como máximo 40 caracteres (como el nombre de una ruta, spec 007).
- RN-2: Un contacto se vincula a una cuenta de Telegram cuando acepta la invitación. La app no pide ni guarda su número de teléfono.
- RN-3: Una cuenta tiene de cero a tres contactos de emergencia, activos o pendientes. Una alerta avisa a todos los activos. Una misma cuenta de Telegram no puede ser dos veces contacto del mismo usuario.
- RN-4: Inactividad es no alejarse más de **30 m** de un punto durante **10 minutos** seguidos de una actividad en curso. La cuenta regresiva de "¿Estás bien?" dura **2 minutos**. Estos valores se revisan en la prueba de campo (009).
- RN-5: Una alerta usa la última ubicación conocida y la hora en que se registró. Si es vieja (por ejemplo, el GPS dejó de dar posición), el mensaje dice de cuándo es.
- RN-6: El mensaje de alerta dice, en español: que es una alerta de SendaBC, el nombre del usuario, el motivo, la hora, la última ubicación conocida con un enlace a un mapa y de qué hora es, y el tipo de actividad. No incluye el correo del usuario. Por inactividad sin respuesta o por pedido de ayuda, el mensaje dice que puede necesitar ayuda. Por la hora de regreso, dice que **no ha confirmado su regreso** y que puede deberse a falta de señal (P11).
- RN-7: El SOS manual pide una confirmación explícita (por ejemplo, mantener presionado o confirmar en un diálogo).
- RN-8: Una actividad tiene como máximo una alerta activa. Cancelar una alerta permite que se genere otra más adelante en la misma actividad.
- RN-9: Durante una actividad, la ubicación solo sale del teléfono hacia el servidor para la hora de regreso (CA-20) y hacia los contactos dentro de una alerta (CA-14, CA-16). Al terminar la actividad, deja de enviarse.
- RN-10: La hora de regreso es **opcional** y posterior a la hora de inicio. El servidor avisa cuando pasa esa hora más **30 minutos** de margen. Se puede cambiar durante la actividad; el cambio necesita conexión para que el servidor lo sepa.
- RN-11: Con una alerta activa, la ubicación actualizada se envía a los contactos cada **15 minutos** o cuando la persona se haya movido más de **200 m**, lo que pase primero, mientras haya conexión.
- RN-12: Los mensajes a los contactos van solo por Telegram. Un contacto que no aceptó la invitación, o que bloqueó a SendaBC, no los recibe (P12).
- RN-13: El enlace de invitación sirve hasta que el contacto lo acepta o el usuario lo quita, y se puede volver a compartir. Un contacto que dejó de recibir mensajes vuelve a "Activo" si acepta de nuevo la invitación.

## Requisitos no funcionales

- **Offline-first:** la detección de inactividad, la pregunta "¿Estás bien?" y la creación de la alerta funcionan sin conexión (constitución 2.1). Entregar los mensajes y enviar la ubicación al servidor necesitan red; la hora de regreso cubre el caso de no recuperarla.
- **Pantalla bloqueada:** la grabación y la detección siguen con la pantalla bloqueada o la app en segundo plano, con el permiso de ubicación en segundo plano que permite la constitución 3.5 (v1.5), solo durante una actividad iniciada por el usuario.
- **Privacidad:** los contactos y la ubicación solo los ve el usuario y, en los mensajes, sus contactos (constitución 3.3 y 3.5). La ubicación no se envía fuera de una actividad (RN-9). No se guarda el teléfono de los contactos (RN-2).
- **Batería:** grabar con la pantalla bloqueada y enviar la ubicación de vez en cuando no debe gastar más batería que la grabación actual con la pantalla encendida (spec 003) en una actividad de 3 horas.
- **Costo:** enviar los avisos no tiene costo por mensaje (P15).
- **Claridad:** la app dice en algún lugar visible que SendaBC no sustituye a los servicios de emergencia (911) y que la alerta depende de la señal y de que los contactos vean el mensaje.
- **Accesibilidad:** la pregunta "¿Estás bien?" se nota con la pantalla encendida o bloqueada, con sonido y vibración, y su botón es grande y fácil de tocar con guantes o con prisa.

## Fuera de alcance

- Llamar o avisar a los servicios de emergencia (911, Protección Civil) → no está en el roadmap.
- Avisos por WhatsApp o SMS → no está en el roadmap (P15: tienen costo por mensaje).
- Un enlace de seguimiento en vivo de toda la actividad (fuera de una alerta) → no está en el roadmap.
- Detección de caídas con el acelerómetro → no está en el roadmap.
- Mensajería satelital o por radio cuando no hay señal celular → no está en el roadmap.
- Más de tres contactos de emergencia → no está en el roadmap (P4).
- Ajustar los umbrales de RN-4 con lo aprendido en la prueba de campo, y dejar que el usuario los cambie → **009-estabilidad**.
- Editar el perfil (nombre, avatar) y editar o borrar la cuenta, que las specs 001 y 002 habían dejado para esta → **009-estabilidad** (P7).

## Preguntas abiertas

Resueltas el 2026-10-21:

- [x] **P1 — Sin señal:** **las dos**: el teléfono envía la alerta cuando hay señal, y el servidor avisa si pasa la hora de regreso (CA-15, CA-18 a CA-20).
- [x] **P2 — Canal:** ~~por WhatsApp~~ → **por Telegram** desde el 2026-10-22 (P15). "¿Estás bien?" llega como **notificación con la pantalla bloqueada** (CA-11).
- [x] **P3 — Umbrales:** **30 m durante 10 minutos, con 2 minutos de cuenta regresiva** (RN-4).
- [x] **P4 — Número de contactos:** **de uno a tres** (RN-3).
- [x] **P5 — Teléfonos:** ~~solo México~~ → ya no aplica: con Telegram no se guarda el teléfono (RN-2).
- [x] **P6 — Pantalla bloqueada:** **la detección debe funcionar con la pantalla bloqueada** (CA-10, CA-11).
- [x] **P7 — Perfil y cuenta:** **pasan a la 009**.
- [x] **P8 — Aviso al contacto:** **mensaje de prueba** (CA-6). Con Telegram, además, el contacto recibe un mensaje al aceptar la invitación (CA-5).
- [x] **P9 — Después de la alerta:** **la app vuelve a mandar la ubicación** mientras haya conexión (CA-16).

Resueltas el 2026-10-22:

- [x] **P10 — Hora de regreso:** **opcional**, con **30 minutos** de margen (RN-10).
- [x] **P11 — Terminar sin señal:** se acepta el riesgo de un aviso por error y se reduce: el mensaje por hora de regreso dice "no ha confirmado su regreso" (RN-6), los contactos reciben "ya terminó y está bien" en cuanto el teléfono se conecta (CA-22), y la app avisa al terminar sin señal (CA-21). Un margen más largo solo retrasaría los avisos reales. Confirmado por el usuario.
- [x] **P12 — Contacto sin el canal:** **se acepta** que un contacto sin Telegram, o que no aceptó la invitación, no reciba avisos (RN-12).
- [x] **P13 — Frecuencia con alerta activa:** cada **15 minutos** o **200 m**, lo que pase primero (RN-11).
- [x] **P14 — Constitución 3.5:** **aprobado**. La constitución pasa a v1.5 y permite el permiso en segundo plano solo durante una actividad iniciada por el usuario.
- [x] **P15 — Costo del canal:** WhatsApp (API de Meta) cobra cada mensaje enviado y pide una cuenta de negocio verificada y plantillas aprobadas; un SMS a México cuesta entre 10 y 18 veces más. Se elige **Telegram**, que no cobra por mensaje, aceptando que cada contacto tenga Telegram y acepte una invitación, porque un bot no puede escribirle primero a nadie (CA-1, CA-5, RN-2, RN-12, RN-13).

## Historial

- 2026-10-22 — Cambio de canal decidido por el usuario al revisar el plan (P15): los avisos pasan de WhatsApp a Telegram por costo. Los contactos ya no se registran por teléfono sino con una invitación que aceptan en Telegram (CA-1, CA-5, CA-7, RN-2, RN-3, RN-12, RN-13). P5 ya no aplica. Los CA se renumeran (ahora 28): CA-5 a CA-7 son los de la invitación, la prueba y el contacto que dejó de recibir, y la antigua CA-26 (hora de regreso pendiente) pasa a CA-23.
- 2026-10-22 — Correcciones al escribir el plan: RN-6 ya no menciona el nombre de la ruta que sigue la actividad, porque la app no tiene esa noción (seguir una ruta quedó fuera de alcance en la 007). Se agrega CA-26: la hora de regreso solo sirve cuando el servidor la recibió, y la app muestra si está pendiente.
- 2026-10-22 — Aprobada por el usuario, con P11 confirmada. No quedan preguntas abiertas.
- 2026-10-22 — Se resuelven P10, P12, P13 y P14 (constitución v1.5). P11 queda con la recomendación del agente, pendiente de confirmar: nuevos CA-19 y CA-20; los anteriores CA-19 a CA-23 pasan a CA-21 a CA-25.
- 2026-10-21 — Se resuelven P1–P9: contactos de uno a tres solo de México, aviso por WhatsApp, "¿Estás bien?" como notificación con la pantalla bloqueada, hora de regreso además del envío desde el teléfono, umbrales de 30 m, 10 y 2 minutos, mensaje de prueba, ubicación actualizada con alerta activa, y perfil y cuenta a la 009. Surgen P10–P14; P14 requiere cambiar la constitución.
- 2026-10-21 — Creación.
