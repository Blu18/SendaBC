# 011 — Estabilidad: prueba de campo, bugs, pruebas y pulido

- **Estado:** En progreso (aprobada 2026-11-06)
- **Semana:** 9
- **Autor(es):**
- **Fecha:** 2026-11-06

## Contexto y objetivo

Hasta ahora casi todo se ha probado en el emulador, con recorridos simulados. Nadie ha grabado una actividad real en un teléfono real, y eso deja sin respuesta justo lo que más importa en la sierra: si la distancia y la elevación son creíbles, cuánta batería gasta el mapa, si Android deja viva la grabación con la pantalla bloqueada y si la alerta llega a una persona de verdad.

Las specs 003 a 010 dejaron para esta lo que no se pudo comprobar en el emulador, varios fallos vistos una sola vez y algunas funciones aplazadas. El objetivo de la semana 9 es llegar a la entrega (012) con esas dudas resueltas, los fallos conocidos corregidos o descartados con evidencia, y las specs abiertas cerradas. Además, se agregan cinco cambios decididos por el usuario: botones flotantes en la grabación, mapas descargados, consulta de rutas sin conexión, edición de perfil y cuenta, y umbrales de inactividad ajustables. Se hacen antes de la prueba de campo para que esta los cubra (RN-6).

## Historias de usuario

- **HU-1:** Como usuario en la sierra, quiero que una actividad real se grabe completa y con datos creíbles, para confiar en lo que me dice la app.
- **HU-2:** Como usuario que sale varias horas, quiero que el mapa no me acabe la batería, para seguir teniendo teléfono al terminar.
- **HU-3:** Como persona que sale con la alerta activa, quiero que el aviso y sus mensajes funcionen en un teléfono real, para que mis contactos se enteren si algo me pasa.
- **HU-4:** Como usuario, quiero que los fallos conocidos de la app estén corregidos, para no perder tiempo ni datos por ellos.
- **HU-5:** Como usuario que va a una zona sin señal, quiero descargar antes el mapa de la zona que elija, para orientarme aunque nunca la haya visitado.
- **HU-6:** Como equipo, queremos pruebas automáticas estables y que cubran la lógica pendiente, para cambiar el código sin miedo antes de la entrega.
- **HU-7:** Como equipo, queremos cerrar las specs abiertas con evidencia, para llegar a la entrega sabiendo qué funciona y qué no.
- **HU-8:** Como usuario que graba, quiero "Pedir ayuda" y "Detener actividad" flotando sobre el mapa, para tener más espacio para ver el mapa y las métricas.
- **HU-9:** Como usuario, quiero editar mi nombre, mi avatar, mi correo y mi contraseña, para mantener mi cuenta al día.
- **HU-10:** Como usuario, quiero poder borrar mi cuenta, para que mis datos no sigan en SendaBC si dejo de usarla.
- **HU-11:** Como usuario que hace paradas largas, quiero ajustar cuándo me pregunta "¿Estás bien?", para que no me interrumpa sin motivo ni tarde demasiado.
- **HU-12:** Como usuario sin señal, quiero consultar mi última búsqueda, las rutas que ya abrí y mis favoritas, para revisar una ruta aunque no tenga internet.

## Criterios de aceptación

### Prueba de campo

- **CA-1 (HU-1):** Dados los dos teléfonos reales con la app instalada, cuando grabo en cada uno una actividad al aire libre de al menos 30 minutos y la detengo, entonces termina sin cierres de la app, con puntos durante todo el recorrido y con su resumen completo.
- **CA-2 (HU-1):** Dada una actividad de campo y el mismo recorrido grabado por una app de GPS de referencia, cuando comparo los resúmenes, entonces la distancia y la elevación ganada quedan dentro de la tolerancia de RN-10. Si la actividad usó barómetro, se anota además cuánto varió la altitud por el clima (plan de la 004).
- **CA-3 (HU-1):** Dado un teléfono real que estuvo en otro lugar antes de la salida, cuando inicio una actividad, entonces el recorrido no incluye la ubicación vieja (spec 003, CA-13).
- **CA-4 (HU-1):** Dado un recorrido simulado a velocidad de bicicleta, unos 20 km/h, cuando reviso el mapa, entonces el avance cada 10 s se sigue con claridad (plan de la 010, R3). El resultado queda anotado como aceptable o no aceptable, con la nota de que no se probó sobre una bicicleta real.
- **CA-5 (HU-1):** Dada una actividad de campo publicada como ruta, cuando abro su detalle, entonces la distancia del eje del perfil y la de la ruta difieren poco (spec 007, pendientes) y el perfil se ve legible, sin picos falsos (plan de la 007).
- **CA-6 (HU-1):** Dados el Galaxy S9+ y el Nothing Phone 2, cuando corro 004 M3 y M5 en el S9+ y 004 M4 en el Nothing Phone 2, entonces pasan con lecturas reales.
- **CA-7 (HU-3):** Dada una actividad con la pantalla bloqueada y el ahorro de batería normal del teléfono, en cada uno de los dos teléfonos, cuando pasan al menos 30 minutos, entonces Android no detiene la grabación y siguen llegando puntos (plan de la 008).
- **CA-8 (HU-2):** Dado el mismo teléfono y el mismo recorrido, de al menos 30 minutos, cuando comparo el consumo por hora usando la opción de prueba sin mapa (RN-7), entonces el mapa visible no supera al de grabar sin mapa en más de **30 %** en 3D ni de **15 %** en 2D (spec 010). Si no se cumple, se ajusta el mapa y se vuelve a medir antes de cerrar esta spec.

### Seguridad en un teléfono real

- **CA-9 (HU-3):** Dado un teléfono real y un contacto de emergencia real en Telegram, cuando corro 008 M1, M2 y M3, entonces pasan con mensajes reales, no con el modo de registro.
- **CA-10 (HU-3):** Dado que aparece "¿Estás bien?" en un teléfono real, cuando la cuenta regresiva empieza, entonces suena y vibra (008 M4).
- **CA-11 (HU-3):** Dado que aparece "¿Estás bien?", cuando toco "Estoy bien" en cuanto se muestra, repetido al menos 10 veces, entonces el toque nunca se pierde ni se envía una alerta (spec 010, M18).
- **CA-12 (HU-3):** Dada la experiencia de la prueba de campo, cuando reviso los valores por defecto de inactividad (spec 008, RN-4), entonces queda anotado si se conservan o cambian. Si cambian, se actualiza primero la spec 008.

### Bugs conocidos

- **CA-13 (HU-4):** Dado que abro la app, cuando inicio una actividad de inmediato, repetido al menos 20 veces y con el dispositivo cargado, entonces la actividad siempre inicia y nunca aparece `database is locked` (spec 010).
- **CA-14 (HU-4):** Dado que hay red pero el servidor no alcanza su base de datos, cuando publico una ruta, entonces el mensaje dice que el servicio no está disponible y que reintente, no que me falta internet (spec 010, T25).
- **CA-15 (HU-4):** Dada una actividad con un salto de ubicación imposible a media grabación (spec 004, CA-25), cuando la publico, entonces el mapa de la ruta no dibuja ese salto como un tramo recto (spec 010, T25).
- **CA-16 (HU-4):** Dada una actividad con un salto imposible, cuando veo el perfil de elevación de su ruta, entonces el perfil no suma ese salto a su eje de distancia, igual que la distancia de la actividad (spec 009).
- **CA-17 (HU-4):** Dada una actividad antigua cuya distancia guardada se infló por un punto viejo, cuando se recalcula (RN-11), entonces la distancia correcta se ve igual en el teléfono, en el servidor y en la ruta publicada desde ella, si existe.
- **CA-18 (HU-4):** Dada una ruta seleccionada en el mapa de Explorar, cuando toco el marcador de otra, repetido al menos 20 veces en un teléfono real, entonces siempre se selecciona la que toqué (spec 009). Si el fallo no se repite, se aplica RN-3.
- **CA-19 (HU-4):** Dado cualquier fallo que aparezca en la prueba de campo o la regresión, cuando se registra, entonces queda con su severidad (RN-2) y su resolución: corregido, aceptado por el usuario o pasado a la 012.

### Mapas descargados

- **CA-20 (HU-5):** Dado que descargué una zona, cuando grabo allí sin red, entonces veo el terreno en 2D y el relieve en 3D, no un fondo azul, aunque nunca haya visitado esa zona.
- **CA-21 (HU-5):** Dado que no descargué la zona, cuando grabo sin red, entonces la grabación funciona igual y sigue el comportamiento sin conexión de la spec 010.
- **CA-31 (HU-5):** Dado que tengo conexión, cuando elijo una zona en el mapa, entonces veo su tamaño aproximado antes de descargarla y puedo confirmar o cancelar. Si la zona supera el tope de RN-8, la app no deja descargarla y explica por qué.
- **CA-32 (HU-5):** Dada una descarga en curso, cuando la miro, entonces veo su avance. Si se interrumpe, la zona no aparece como lista y puedo reintentar.
- **CA-33 (HU-5):** Dadas mis zonas descargadas, cuando abro su lista, entonces veo cuánto ocupa cada una y puedo borrarla. Una zona borrada deja de estar disponible sin red.
- **CA-34 (HU-5):** Dado que no tengo conexión, cuando intento descargar una zona, entonces la app me lo indica y no empieza la descarga.

### Rutas sin conexión

- **CA-53 (HU-12):** Dado que ya hice una búsqueda con conexión, cuando abro Explorar sin red, entonces veo los resultados de mi última búsqueda (RN-14), con un aviso de que son datos guardados y de cuándo son.
- **CA-54 (HU-12):** Dado que nunca hice una búsqueda en este teléfono, cuando abro Explorar sin red, entonces veo el mensaje de que explorar necesita internet y la pantalla no se queda cargando (spec 006, CA-15).
- **CA-55 (HU-12):** Dada una ruta que ya abrí con conexión o que es favorita, cuando abro su detalle sin red, entonces veo sus datos, su perfil de elevación y su recorrido, con un aviso de que son datos guardados. El recorrido puede verse sin mapa de fondo.
- **CA-56 (HU-12):** Dadas mis favoritas, cuando abro su lista sin red, entonces veo las que tenía la última vez que hubo conexión.
- **CA-57 (HU-12):** Dada una ruta sin datos guardados, cuando intento abrir su detalle sin red, entonces la app explica que necesita internet y no se queda cargando.
- **CA-58 (HU-12):** Dado que estoy sin red, cuando intento cambiar una favorita, publicar o administrar mis rutas, entonces la app me indica que necesita conexión y no cambia nada (spec 007).
- **CA-59 (HU-12):** Dado que vuelve la conexión, cuando abro esas pantallas, entonces los datos se actualizan. Una ruta archivada o borrada deja de mostrarse.
- **CA-60 (HU-12):** Dado que otra persona inicia sesión en el mismo teléfono, cuando abre esas pantallas sin red, entonces no ve las búsquedas, rutas guardadas ni favoritas de la cuenta anterior.

### Pruebas automáticas

- **CA-22 (HU-6):** Dada la suite e2e del backend, cuando corre con su configuración normal 5 veces seguidas, entonces pasa las 5 sin fallos intermitentes.
- **CA-23 (HU-6):** Dada la lógica pura del frontend y del backend que hoy no tiene prueba (constitución 6.1), cuando se revisa, entonces cada módulo tiene su prueba automatizada o queda anotado por qué no aplica. No hay meta de porcentaje de cobertura.
- **CA-24 (HU-6):** Dado cada bug corregido en esta spec que se pueda probar de forma automática, cuando se cierra, entonces tiene una prueba que falla sin la corrección.
- **CA-25 (HU-6):** Dado el cierre de la spec, cuando corro las pruebas unitarias de backend y frontend, las e2e y el lint, entonces todo pasa.

### Cierre de specs y regresión

- **CA-26 (HU-7):** Dados los casos que la spec 010 dejó sin correr o parciales (005 M3; 007 M1, M6 y M8; 008 M8 paso 4 y M10; 009 M1), cuando se corren, entonces pasan o su fallo queda registrado según CA-19. 007 M8 se corre en el segundo teléfono y 009 M1 lo hace el usuario.
- **CA-27 (HU-7):** Dada la colección de Postman de la API, cuando se corre una vez en Postman, entonces pasa (spec 007, pendientes; constitución 6.3). Incluye los endpoints nuevos de esta spec.
- **CA-28 (HU-7):** Dado que se cumplen sus pendientes, cuando cierro esta spec, entonces las specs 004, 009 y 010 pasan a `Implementada`, o siguen con pendientes indicando por qué, y `specs/roadmap.md` lo refleja.
- **CA-29 (HU-7):** Dado el reporte de la prueba de campo, cuando la spec se cierra, entonces indica fecha, lugar, teléfonos, tipo de actividad, resultados de cada CA y lista de fallos.

### Pulido: botones de la grabación

- **CA-30 (HU-8):** Dada una actividad en curso con seguridad activa, cuando miro el mapa, entonces "Pedir ayuda" es un botón flotante circular del mismo tamaño que el botón 3D/2D, en la esquina inferior derecha. Se muestra en las mismas condiciones que hoy y sigue pidiendo mantenerlo presionado 2 s (spec 008, RN-7).
- **CA-35 (HU-8):** Dada una actividad en curso, cuando miro el mapa, entonces "Detener actividad" es un botón flotante abajo y al centro, más pequeño que el botón actual, y funciona igual que antes (spec 003, CA-8).
- **CA-36 (HU-8):** Dado que aparece cualquier aviso sobre el mapa (alerta activa, sin conexión, mapa no disponible o esperando GPS), cuando miro la pantalla, entonces ni el aviso ni los botones 3D/2D y "Volver a mi posición" se enciman con los botones flotantes. El logo del mapa sigue visible.
- **CA-37 (HU-8):** Dado que el mapa no se puede mostrar por cualquier causa, cuando estoy grabando, entonces "Pedir ayuda" y "Detener actividad" siguen visibles y funcionan (spec 010, CA-17).
- **CA-38 (HU-8):** Dado el botón circular de "Pedir ayuda", que ya no tiene espacio para texto, cuando lo toco sin mantenerlo, entonces no se pide ayuda y la app muestra la instrucción de mantenerlo presionado. Un lector de pantalla anuncia su nombre y esa instrucción.
- **CA-39 (HU-8):** Dados los dos botones flotantes, cuando se miden, entonces su área de toque es de al menos 48 × 48 dp, se distinguen sobre el mapa claro y oscuro, y respetan el tema de la app (spec 009).
- **CA-40 (HU-8):** Dada la pantalla antes de iniciar, cuando la miro, entonces "Iniciar actividad" sigue en su lugar actual. Al terminar, si la actividad no se pudo cerrar, "Volver" sigue disponible (spec 003, CA-12).

### Perfil y cuenta

- **CA-41 (HU-9):** Dado mi perfil, cuando cambio mi nombre visible con las reglas del registro (spec 001, RN-4), entonces se guarda en mi cuenta y lo veo igual en otro teléfono. Con un nombre inválido, la app explica el error y no guarda.
- **CA-42 (HU-9):** Dado mi perfil, cuando elijo uno de los avatares predefinidos o lo quito (RN-15), entonces lo veo igual en otro teléfono.
- **CA-43 (HU-9):** Dada mi cuenta, cuando cambio el correo y confirmo con mi contraseña, entonces inicio sesión con el nuevo y ya no con el anterior. Si el correo ya existe, veo el mismo mensaje del registro (spec 001, CA-4).
- **CA-44 (HU-9):** Dada mi cuenta, cuando escribo mi contraseña actual y una nueva de al menos 8 caracteres, entonces inicio sesión con la nueva y ya no con la anterior. Con la actual incorrecta, no cambia nada.
- **CA-45 (HU-9):** Dado que no tengo conexión, cuando intento cambiar mi perfil o mi cuenta, entonces la app me lo indica y no queda ningún cambio a medias.
- **CA-46 (HU-10):** Dada mi cuenta, cuando pido borrarla, entonces la app explica qué se borrará, avisa si hay actividades sin subir y pide mi contraseña. Al confirmar, se borran mis datos del servidor y de este teléfono, se cierra la sesión y ya no puedo entrar.
- **CA-47 (HU-10):** Dada una actividad en curso o una alerta activa, cuando intento borrar la cuenta, entonces la app no lo permite y explica por qué.
- **CA-48 (HU-10):** Dadas mis rutas publicadas, cuando pido borrar la cuenta, entonces la app me avisa que seguirán publicadas sin autor. Al confirmar, siguen en el catálogo y en las favoritas de otros usuarios, sin mi nombre ni otros datos personales (RN-16).
- **CA-49 (HU-10):** Dada una cuenta borrada con sesión abierta en otro teléfono, cuando ese teléfono llama al servidor, entonces se cierra la sesión. Los datos locales de esa cuenta en ese teléfono quedan como decida el plan, sin que la app falle.

### Umbrales de inactividad

- **CA-50 (HU-11):** Dada la pantalla de Seguridad, cuando elijo el tiempo sin moverme y la cuenta regresiva entre las opciones de RN-9, entonces mi elección se conserva al cerrar la app y se usa en mi siguiente actividad.
- **CA-51 (HU-11):** Dada una actividad en curso, cuando cambio los umbrales, entonces la actividad conserva los que tenía al iniciar.
- **CA-52 (HU-11):** Dado que no cambié nada o no hay red, cuando grabo, entonces la detección funciona igual, con mi última elección o con los valores por defecto (spec 008, RN-4).

## Reglas de negocio y validaciones

- RN-1: Las correcciones no pueden afectar la grabación offline ni borrar datos locales sin sincronizar, salvo cuando el usuario borra su cuenta (CA-46).
- RN-2: Severidad de un fallo. **Bloqueante:** pierde datos, cierra la app, impide grabar o impide que salga una alerta. **Mayor:** una función no sirve o muestra datos falsos, pero hay forma de seguir. **Menor:** detalle visual o de texto. Los bloqueantes se corrigen en esta spec. Los mayores y menores se corrigen o los acepta el usuario.
- RN-3: Un fallo visto una sola vez se intenta reproducir las veces que indique su CA. Si no se repite, se cierra como "no reproducible", con los intentos anotados, y no se cambia código por suposición.
- RN-4: Si un resultado o un cambio contradice una spec anterior, se corrige esa spec primero, con nota en su historial (constitución 1.3). Ya se sabe que cambian: 010 CA-6 (hay controles sobre el mapa), 007 RN-1 y RN-10 y 006 RN-3 (recalcular distancias), 008 RN-4 (umbrales ajustables), 006 CA-15 y el requisito offline de la 007 (consulta sin conexión), el autor de una ruta en la 007 (rutas sin autor) y las notas de 006 y 007 que mandan a esta spec los mapas sin conexión.
- RN-5: Los casos que necesitan el mundo real se corren en un teléfono real. El emulador no cuenta para CA-1 a CA-3 ni para CA-5 a CA-11.
- RN-6: Los botones flotantes, los mapas descargados, la consulta sin conexión, el perfil, la cuenta y los umbrales se terminan antes de la prueba de campo, para que esta los cubra.
- RN-7: La opción de grabar sin mapa existe solo para medir la batería. No aparece en la compilación de entrega ni la ve un usuario normal.
- RN-8: Una zona descargada tiene un tope de tamaño, que define el plan según el almacenamiento y los límites del proveedor del mapa. Las zonas solo se usan en el mapa de grabación.
- RN-9: Tiempo sin moverme: 5, 10, 15, 20 o 30 minutos. Cuenta regresiva: 1, 2, 3 o 5 minutos. Los valores por defecto siguen siendo 10 y 2. La distancia de 30 m no se puede cambiar, porque la precisión del GPS ronda ese valor y uno menor daría avisos falsos.
- RN-10: Tolerancia contra la app de referencia. Distancia: ±5 %. Elevación ganada con barómetro: ±15 % o ±15 m, lo que sea mayor. Elevación ganada con GPS: ±30 % o ±30 m, lo que sea mayor.
- RN-11: Se recalcula la distancia de las actividades con puntos del principio de más de 30 s antes de su inicio (spec 007, RN-10), sin esos puntos. Recalcular dos veces da lo mismo. Si hay una ruta publicada desde la actividad, su distancia se actualiza también. Ninguna otra métrica cambia y la actividad no cambia de estado.
- RN-12: En la prueba de campo, la app usa el backend de la computadora por un túnel temporal con HTTPS, que solo existe durante la prueba. Si el túnel falla, la grabación sigue y se sincroniza después.
- RN-13: Los cambios de cuenta y de perfil requieren conexión. La contraseña nueva se guarda solo como hash generado en el servidor (constitución 3.1).
- RN-14: Sin conexión se conserva solo la última búsqueda de cada cuenta, no un historial. Las rutas sin conexión son de solo lectura. Lo guardado es de la cuenta que lo consultó y se quita de este teléfono si borra su cuenta.
- RN-15: El avatar se elige de un conjunto predefinido incluido en la app. No se suben fotos. Sin avatar elegido, se muestra el ícono por defecto.
- RN-16: Una ruta de una cuenta borrada se muestra con el autor "Cuenta eliminada" y nadie puede editarla, archivarla ni borrarla desde la app.

## Requisitos no funcionales

- **Batería:** los límites de CA-8, heredados de la spec 010.
- **Offline:** todo lo que se corrija o se agregue sigue sin depender de la red para grabar (constitución 2.1). Descargar una zona no afecta una grabación en curso.
- **Privacidad:** el reporte de campo no publica la ubicación de casa ni datos de los contactos de emergencia. Borrar la cuenta borra también sus contactos de emergencia.
- **Accesibilidad:** los botones flotantes tienen nombre para lector de pantalla y respetan la opción de reducir animaciones (spec 010).

## Fuera de alcance

- README, manual, EAS Build final, despliegue definitivo y demo: 012-entrega.
- Hospedaje del backend que no se duerma: 012-entrega (spec 008). La prueba de campo usa un túnel temporal (RN-12).
- Prueba sobre una bicicleta real: no hay bicicleta disponible; CA-4 usa una simulación.
- Al cambiar el tamaño de letra con la app abierta, los textos en pantalla quedan recortados hasta reabrirla (spec 003, CA-14), incluidos los chips de Explorar que se enciman (spec 009): limitación aceptada, sin trabajo previsto.
- Botón flotante "Tools" y oferta de Google Password Manager: solo existen en el development build o el emulador.
- Mapas de fondo sin conexión en Explorar y en el detalle de ruta (specs 006 y 007): las zonas descargadas solo se usan al grabar (RN-8); no está en el roadmap.
- Historial de varias búsquedas y "Mis rutas" sin conexión: no está en el roadmap.
- Recuperar una contraseña olvidada: no está en el roadmap.
- Funcionalidad nueva que no esté en esta spec (no está en el roadmap).

## Preguntas abiertas

Ninguna pendiente.

### Resueltas (2026-11-06)

- [x] **P1 — Backend en la salida:** túnel temporal (RN-12).
- [x] **P2 — Teléfonos:** Galaxy S9+ con barómetro y Nothing Phone 2 sin barómetro (CA-1, CA-6, CA-7, CA-26).
- [x] **P3 — La salida:** no hay bicicleta, así que CA-4 usa una simulación. El lugar y la fecha no cambian la spec y se anotan en el reporte (CA-29).
- [x] **P4 — Mapas descargados:** zona elegida por el usuario (CA-20, CA-21, CA-31 a CA-34).
- [x] **P5 — Funciones aplazadas:** se hacen (CA-41 a CA-52).
- [x] **P6 — Tolerancia:** la eligió Claude a petición del usuario (RN-10).
- [x] **P7 — Distancia inflada:** se recalcula (CA-17, RN-11).
- [x] **P8 — Pruebas unitarias:** sin meta de cobertura (CA-23).
- [x] **P9 — Pulido:** "Pedir ayuda" como botón circular flotante abajo a la derecha del mapa, del tamaño del botón 3D/2D, y "Detener actividad" como botón flotante más pequeño abajo al centro (CA-30, CA-35 a CA-40).
- [x] **P10 — Chips de Explorar:** entran en la limitación aceptada.
- [x] **P11 — Medir sin mapa:** opción solo de prueba (CA-8, RN-7).
- [x] **P12 — Avatar:** predefinidos (CA-42, RN-15).
- [x] **P13 — Rutas al borrar la cuenta:** se conservan sin autor y se avisa antes de borrar (CA-48, RN-16).
- [x] **P14 — Umbrales:** se confirman las opciones de RN-9.
- [x] **P15 — Otras funciones sin conexión:** entran las búsquedas anteriores, el detalle y las favoritas (CA-53 a CA-60, RN-14).

## Historial

- 2026-11-06 — Marco de grabación aprobado por el usuario en Figma (T5).
- 2026-11-06 — Al revisar el marco de Figma (T5), el usuario pide "Pedir ayuda" del tamaño del botón 3D/2D y en la esquina inferior derecha (CA-30, P9). Con esto se cumple la spec 009, CA-13, que ya no hace falta cambiar.
- 2026-11-06 — Plan aprobado por el usuario, junto con la constitución v1.9.
- 2026-11-06 — Aprobada por el usuario.
- 2026-11-06 — Preguntas P12 a P15 resueltas por el usuario. Se agregan HU-12, CA-53 a CA-60 y RN-14 a RN-16; cambian CA-42, CA-48, RN-4, RN-6 y RN-9.
- 2026-11-06 — Preguntas P1 a P11 resueltas por el usuario. Se agregan HU-8 a HU-11, CA-31 a CA-52 y RN-6 a RN-13; CA-30 pasa a ser el botón de "Pedir ayuda". Quedan P12 a P15, surgidas de esas respuestas.
- 2026-11-06 — Creación.
