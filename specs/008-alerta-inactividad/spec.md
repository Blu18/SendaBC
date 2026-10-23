# 008 — Contacto de emergencia y alerta por inactividad

- **Estado:** Aprobada (2026-10-22)
- **Semana:** 8
- **Autor(es):**
- **Fecha:** 2026-10-21

## Contexto y objetivo

Objetivo de la semana 8: **si a alguien le pasa algo durante una actividad, las personas de su confianza se enteran y saben dónde buscarlo.**

En la Sierra de Juárez o en San Pedro Mártir es común salir solo y quedarse sin señal durante horas. Una caída o un golpe de calor pueden dejar a alguien sin poder pedir ayuda. Esta spec agrega contactos de emergencia a la cuenta y un módulo de seguridad que, durante una actividad:

- detecta que la persona dejó de moverse, aun con la pantalla bloqueada, le pregunta si está bien y, si no responde, avisa a sus contactos por WhatsApp con su última ubicación conocida;
- permite pedir ayuda a mano (SOS);
- si el teléfono no tiene señal, deja que el servidor avise cuando pasa la hora de regreso que la persona indicó al salir.

La spec 005 dejó para esta enviar la ubicación al servidor durante la actividad. La edición del perfil y de la cuenta, que las specs 001 y 002 habían dejado aquí, pasa a la 009 (P7).

## Historias de usuario

- **HU-1:** Como usuario, quiero registrar de uno a tres contactos de emergencia (nombre y teléfono), para que alguien de confianza se entere si me pasa algo.
- **HU-2:** Como usuario, quiero enviar un mensaje de prueba a un contacto, para confirmar que le llega y que reconocerá el remitente si algún día hay una alerta.
- **HU-3:** Como usuario, quiero indicar al iniciar una actividad a qué hora planeo regresar, para que avisen a mis contactos si no regreso y mi teléfono no tiene señal.
- **HU-4:** Como usuario que hace una actividad, quiero que la app note que dejé de moverme, aunque tenga la pantalla bloqueada, y me pregunte si estoy bien, para que no se dispare una alerta por una pausa normal.
- **HU-5:** Como usuario que no puede responder, quiero que mis contactos reciban una alerta con mi última ubicación y que sigan recibiendo mi ubicación si me muevo, para que sepan dónde buscarme.
- **HU-6:** Como usuario en problemas, quiero pedir ayuda a mano en cualquier momento de la actividad, sin esperar a la detección de inactividad.
- **HU-7:** Como usuario, quiero cancelar una alerta que se envió por error, para que mis contactos sepan que estoy bien.
- **HU-8:** Como contacto de emergencia, quiero recibir un mensaje claro (quién, qué pasó, dónde y cuándo), para poder actuar aunque no use SendaBC.

## Criterios de aceptación

### Contactos de emergencia

- **CA-1 (HU-1):** Dado que tengo menos de tres contactos, cuando abro la configuración de seguridad, entonces puedo agregar uno con su nombre y su teléfono. Con tres contactos ya no puedo agregar más (RN-3).
- **CA-2 (HU-1):** Dado un nombre vacío o un teléfono que no es un celular de México (RN-2), cuando intento guardar, entonces veo un mensaje en español junto al campo y no se guarda nada.
- **CA-3 (HU-1):** Dado que tengo contactos, cuando edito o quito uno, entonces el cambio se guarda en mi cuenta y lo veo igual al iniciar sesión en otro teléfono.
- **CA-4 (HU-1):** Solo yo puedo ver y cambiar mis contactos de emergencia. No aparecen en ninguna otra parte de la app ni en lo que ven otros usuarios.
- **CA-5 (HU-2):** Dado un contacto guardado, cuando toco "Enviar mensaje de prueba", entonces le llega por WhatsApp un mensaje que dice que lo registré como contacto de emergencia en SendaBC y qué recibirá si hay una alerta. Veo si se envió o por qué no.

### Al iniciar una actividad

- **CA-6 (HU-3):** Dado que tengo al menos un contacto, cuando abro la pantalla para iniciar una actividad, entonces veo que el módulo de seguridad está activo, a quiénes se avisaría, y puedo indicar, si quiero, mi hora de regreso (RN-10).
- **CA-7 (HU-3):** Dado que no tengo contactos, cuando abro la pantalla para iniciar una actividad, entonces veo un aviso de que sin contactos no se puede avisar a nadie, con una forma de configurarlos. Puedo iniciar la actividad de todos modos.
- **CA-8 (HU-4):** Dado que la app no tiene el permiso para seguir mi ubicación con la pantalla bloqueada, cuando inicio una actividad con contactos, entonces me explica para qué lo necesita y me lo pide. Si no lo doy, la actividad se graba como hasta ahora (pantalla encendida, spec 003) y veo que la detección solo funciona con la app abierta.

### Detección de inactividad

- **CA-9 (HU-4):** Dada una actividad en curso, con la app abierta o con la pantalla bloqueada, cuando no me alejo más de 30 m durante 10 minutos (RN-4), entonces recibo la pregunta "¿Estás bien?" con una cuenta regresiva de 2 minutos, sonido y vibración. Con la pantalla bloqueada, la pregunta llega como notificación y puedo responder desde ella.
- **CA-10 (HU-4):** Dada la pregunta "¿Estás bien?", cuando respondo "Estoy bien" antes de que termine la cuenta regresiva, entonces no se envía nada y la detección vuelve a empezar desde ese momento.
- **CA-11 (HU-4):** Dada una actividad terminada, o sin ninguna actividad en curso, entonces no se detecta inactividad: fuera de una actividad iniciada por mí no se vigila nada (constitución 3.5). La app no permite pausar una actividad (specs 003 y 004), así que una parada larga cuenta como inactividad y se resuelve respondiendo "Estoy bien".

### Alerta a los contactos

- **CA-12 (HU-5):** Dada la pregunta "¿Estás bien?", cuando termina la cuenta regresiva sin respuesta, entonces se genera una alerta y todos mis contactos reciben por WhatsApp el mensaje de RN-6.
- **CA-13 (HU-5):** Dado que se generó una alerta y no hay conexión, entonces la alerta no se pierde: se envía en cuanto la haya. Si no la hay, aplica la hora de regreso (CA-16).
- **CA-14 (HU-5):** Dada una alerta activa, cuando me sigo moviendo, entonces mis contactos reciben mi ubicación actualizada mientras haya conexión, con la frecuencia de RN-11.
- **CA-15 (HU-5):** Dada una alerta activa, cuando abro la app, entonces veo que la alerta está activa, cuándo se envió y a quiénes.

### Hora de regreso

- **CA-16 (HU-3):** Dada una actividad con hora de regreso, cuando pasa esa hora más el margen (RN-10) y la actividad no ha terminado, entonces el servidor genera una alerta y avisa a mis contactos con la última ubicación que recibió y la hora en que la recibió, aunque mi teléfono no tenga señal.
- **CA-17 (HU-3):** Dada una actividad con hora de regreso, cuando la termino o la cambio con conexión antes de que pase, entonces el servidor ya no avisa a esa hora.
- **CA-18 (HU-3):** Dada una actividad en curso con conexión, entonces el teléfono le envía al servidor mi ubicación de vez en cuando (RN-9), para que la alerta por hora de regreso tenga la más reciente posible.
- **CA-19 (HU-3):** Dada una actividad con hora de regreso, cuando la termino sin conexión, entonces la app me avisa que, si el teléfono no se conecta antes de la hora de regreso más el margen, mis contactos recibirán un mensaje de que no he confirmado mi regreso.
- **CA-20 (HU-3, HU-7):** Dado que el servidor ya avisó por la hora de regreso, cuando mi teléfono se conecta y le informa que la actividad terminó, entonces mis contactos reciben automáticamente un mensaje de que ya terminé y estoy bien, y la alerta queda resuelta.

### SOS manual

- **CA-21 (HU-6):** Dada una actividad en curso, cuando uso la opción de pedir ayuda y la confirmo, entonces se genera una alerta como en CA-12, sin esperar a la detección de inactividad. La confirmación evita que se dispare por un toque accidental (RN-7).

### Cancelar una alerta

- **CA-22 (HU-7):** Dada una alerta activa, cuando la cancelo, entonces mis contactos reciben un mensaje de que estoy bien, la alerta queda como cancelada y dejan de llegarles mis ubicaciones.
- **CA-23 (HU-7):** Dada una alerta activa, cuando termino la actividad, entonces la app me pregunta si quiero cancelar la alerta antes de terminar.

### Reglas y acceso

- **CA-24 (HU-5, HU-6):** Una actividad tiene como máximo una alerta activa a la vez. Volver a pedir ayuda con una alerta activa no envía otro mensaje de alerta (RN-8).
- **CA-25 (HU-1 a HU-7):** Configurar contactos, enviar el mensaje de prueba, indicar la hora de regreso, ver y cancelar alertas requieren sesión iniciada. El servidor solo acepta alertas, ubicaciones y horas de regreso de actividades del usuario de la sesión.

## Reglas de negocio y validaciones

- RN-1: El nombre de un contacto es obligatorio, sin contar los espacios del principio y del final, y tiene como máximo 40 caracteres (como el nombre de una ruta, spec 007).
- RN-2: El teléfono debe ser un celular de México: 10 dígitos, con o sin el +52 al principio. La app lo guarda siempre con +52.
- RN-3: Una cuenta tiene de cero a tres contactos de emergencia. Una alerta avisa a todos. No se puede repetir el mismo teléfono.
- RN-4: Inactividad es no alejarse más de **30 m** de un punto durante **10 minutos** seguidos de una actividad en curso. La cuenta regresiva de "¿Estás bien?" dura **2 minutos**. Estos valores se revisan en la prueba de campo (009).
- RN-5: Una alerta usa la última ubicación conocida y la hora en que se registró. Si es vieja (por ejemplo, el GPS dejó de dar posición), el mensaje dice de cuándo es.
- RN-6: El mensaje de alerta dice, en español: que es una alerta de SendaBC, el nombre del usuario, el motivo, la hora, la última ubicación conocida con un enlace a un mapa y de qué hora es, el tipo de actividad y, si la actividad sigue una ruta publicada, su nombre. No incluye el correo del usuario. Por inactividad sin respuesta o por pedido de ayuda, el mensaje dice que puede necesitar ayuda. Por la hora de regreso, dice que **no ha confirmado su regreso** y que puede deberse a falta de señal (P11).
- RN-7: El SOS manual pide una confirmación explícita (por ejemplo, mantener presionado o confirmar en un diálogo).
- RN-8: Una actividad tiene como máximo una alerta activa. Cancelar una alerta permite que se genere otra más adelante en la misma actividad.
- RN-9: Durante una actividad, la ubicación solo sale del teléfono hacia el servidor para la hora de regreso (CA-18) y hacia los contactos dentro de una alerta (CA-12, CA-14). Al terminar la actividad, deja de enviarse.
- RN-10: La hora de regreso es **opcional** y posterior a la hora de inicio. El servidor avisa cuando pasa esa hora más **30 minutos** de margen. Se puede cambiar durante la actividad; el cambio necesita conexión para que el servidor lo sepa.
- RN-11: Con una alerta activa, la ubicación actualizada se envía a los contactos cada **15 minutos** o cuando la persona se haya movido más de **200 m**, lo que pase primero, mientras haya conexión.
- RN-12: Los mensajes a los contactos van solo por WhatsApp. Un contacto sin WhatsApp no los recibe; el mensaje de prueba (CA-5) lo deja ver al configurarlo (P12).

## Requisitos no funcionales

- **Offline-first:** la detección de inactividad, la pregunta "¿Estás bien?" y la creación de la alerta funcionan sin conexión (constitución 2.1). Entregar los mensajes y enviar la ubicación al servidor necesitan red; la hora de regreso cubre el caso de no recuperarla.
- **Pantalla bloqueada:** la grabación y la detección siguen con la pantalla bloqueada o la app en segundo plano, con el permiso de ubicación en segundo plano que permite la constitución 3.5 (v1.5), solo durante una actividad iniciada por el usuario.
- **Privacidad:** los contactos y la ubicación solo los ve el usuario y, en los mensajes, sus contactos (constitución 3.3 y 3.5). La ubicación no se envía fuera de una actividad (RN-9).
- **Batería:** grabar con la pantalla bloqueada y enviar la ubicación de vez en cuando no debe gastar más batería que la grabación actual con la pantalla encendida (spec 003) en una actividad de 3 horas.
- **Claridad:** la app dice en algún lugar visible que SendaBC no sustituye a los servicios de emergencia (911) y que la alerta depende de la señal y de que los contactos vean el mensaje.
- **Accesibilidad:** la pregunta "¿Estás bien?" se nota con la pantalla encendida o bloqueada, con sonido y vibración, y su botón es grande y fácil de tocar con guantes o con prisa.

## Fuera de alcance

- Llamar o avisar a los servicios de emergencia (911, Protección Civil) → no está en el roadmap.
- Un enlace de seguimiento en vivo de toda la actividad (fuera de una alerta) → no está en el roadmap.
- Detección de caídas con el acelerómetro → no está en el roadmap.
- Mensajería satelital o por radio cuando no hay señal celular → no está en el roadmap.
- Teléfonos de otros países → no está en el roadmap (P5).
- Más de tres contactos de emergencia → no está en el roadmap (P4).
- Ajustar los umbrales de RN-4 con lo aprendido en la prueba de campo, y dejar que el usuario los cambie → **009-estabilidad**.
- Editar el perfil (nombre, avatar) y editar o borrar la cuenta, que las specs 001 y 002 habían dejado para esta → **009-estabilidad** (P7).

## Preguntas abiertas

Resueltas el 2026-10-21:

- [x] **P1 — Sin señal:** **las dos**: el teléfono envía la alerta cuando hay señal, y el servidor avisa si pasa la hora de regreso (CA-13, CA-16 a CA-18).
- [x] **P2 — Canal:** el aviso a los contactos va **por WhatsApp** (CA-5, CA-12). "¿Estás bien?" llega como **notificación con la pantalla bloqueada** (CA-9).
- [x] **P3 — Umbrales:** **30 m durante 10 minutos, con 2 minutos de cuenta regresiva** (RN-4).
- [x] **P4 — Número de contactos:** **de uno a tres** (RN-3).
- [x] **P5 — Teléfonos:** **solo México** (RN-2).
- [x] **P6 — Pantalla bloqueada:** **la detección debe funcionar con la pantalla bloqueada** (CA-8, CA-9).
- [x] **P7 — Perfil y cuenta:** **pasan a la 009**.
- [x] **P8 — Aviso al contacto:** **mensaje de prueba** (CA-5).
- [x] **P9 — Después de la alerta:** **la app vuelve a mandar la ubicación** mientras haya conexión (CA-14).

Surgen de esas respuestas:

Resueltas el 2026-10-22:

- [x] **P10 — Hora de regreso:** **opcional**, con **30 minutos** de margen (RN-10).
- [x] **P11 — Terminar sin señal:** se acepta el riesgo de un aviso por error y se reduce: el mensaje por hora de regreso dice "no ha confirmado su regreso" (RN-6), los contactos reciben "ya terminó y está bien" en cuanto el teléfono se conecta (CA-20), y la app avisa al terminar sin señal (CA-19). Un margen más largo solo retrasaría los avisos reales. Confirmado por el usuario.
- [x] **P12 — Contacto sin WhatsApp:** **se acepta**; el mensaje de prueba lo deja ver (RN-12).
- [x] **P13 — Frecuencia con alerta activa:** cada **15 minutos** o **200 m**, lo que pase primero (RN-11).
- [x] **P14 — Constitución 3.5:** **aprobado**. La constitución pasa a v1.5 y permite el permiso en segundo plano solo durante una actividad iniciada por el usuario.

## Historial

- 2026-10-22 — Aprobada por el usuario, con P11 confirmada. No quedan preguntas abiertas.
- 2026-10-22 — Se resuelven P10, P12, P13 y P14 (constitución v1.5). P11 queda con la recomendación del agente, pendiente de confirmar: nuevos CA-19 y CA-20; los anteriores CA-19 a CA-23 pasan a CA-21 a CA-25.
- 2026-10-21 — Se resuelven P1–P9: contactos de uno a tres solo de México, aviso por WhatsApp, "¿Estás bien?" como notificación con la pantalla bloqueada, hora de regreso además del envío desde el teléfono, umbrales de 30 m, 10 y 2 minutos, mensaje de prueba, ubicación actualizada con alerta activa, y perfil y cuenta a la 009. Surgen P10–P14; P14 requiere cambiar la constitución.
- 2026-10-21 — Creación.
