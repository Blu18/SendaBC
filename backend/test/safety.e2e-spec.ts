import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SchedulerRegistry } from '@nestjs/schedule';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configurarHttp } from './../src/configurar-http.js';
import { PrismaService } from './../src/prisma.service.js';
import { ReturnTimeJob } from './../src/safety/return-time.job.js';
import { LogTelegramSender } from './../src/telegram/log.sender.js';
import { TELEGRAM_SENDER } from './../src/telegram/telegram.sender.js';
import { ENCABEZADO_SECRETO } from './../src/telegram/webhook-secret.guard.js';

// Spec 008 — T10. Corre contra la base de DATABASE_URL (con la migración safety_module) y con
// TELEGRAM_MODE=log: nada sale a Telegram, el emisor solo registra lo enviado. Crea dos usuarios
// con correo único; las pruebas corren en orden y comparten contactos y sesiones. La tarea de la
// hora de regreso se detiene y se ejecuta a mano. Al final borra a los usuarios, que se llevan
// en cascada sus contactos, sesiones, alertas y mensajes.

process.env.TELEGRAM_MODE = 'log';
process.env.TELEGRAM_WEBHOOK_SECRET = `e2e-${randomUUID()}`;
const SECRETO = process.env.TELEGRAM_WEBHOOK_SECRET;

// Chats de Telegram simulados, únicos por corrida.
const base = 9_000_000_000 + Math.floor(Math.random() * 1_000_000) * 10;
const CHAT_MAMA = base + 1;
const CHAT_BETO = base + 2;

const MIN = 60_000;

describe('Contactos de emergencia, alertas y hora de regreso (e2e, spec 008)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let telegram: LogTelegramSender;
  const emailA = `e2e-seguridad-a-${randomUUID()}@senda.bc`;
  const emailB = `e2e-seguridad-b-${randomUUID()}@senda.bc`;
  const password = 'contrasena-e2e';
  let tokenA: string;
  let tokenB: string;

  // Contactos de A: Mamá y Beto aceptan; Tía se queda pendiente y luego se quita.
  let mama: { id: string; inviteUrl: string };
  let beto: { id: string; inviteUrl: string };
  let tia: { id: string; inviteUrl: string };

  // Sesión con alerta por inactividad (sin hora de regreso).
  const sesion = randomUUID();
  let alerta: string;

  const http = () => request(app.getHttpServer());
  const como = (token: string) => ({
    get: (url: string) =>
      http().get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      http().post(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) =>
      http().patch(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) =>
      http().put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) =>
      http().delete(url).set('Authorization', `Bearer ${token}`),
  });

  async function crearUsuario(email: string, displayName: string) {
    await http()
      .post('/user')
      .send({ email, displayName, password })
      .expect(201);
    const login = await http()
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return login.body.token as string;
  }

  const tokenDe = (inviteUrl: string) =>
    new URL(inviteUrl).searchParams.get('start')!;

  function aceptar(inviteUrl: string, chatId: number, secreto = SECRETO) {
    return http()
      .post('/telegram/webhook')
      .set(ENCABEZADO_SECRETO, secreto)
      .send({
        update_id: Math.floor(Math.random() * 1e9),
        message: {
          chat: { id: chatId, type: 'private' },
          from: { first_name: 'Contacto', last_name: `${chatId}` },
          text: `/start ${tokenDe(inviteUrl)}`,
        },
      });
  }

  // Lo enviado por Telegram desde `desde` (índice de telegram.sent).
  const enviadosDesde = (desde: number) => telegram.sent.slice(desde);
  const textos = (desde: number, chatId?: number) =>
    enviadosDesde(desde)
      .filter(
        (m) =>
          m.method === 'sendMessage' &&
          (chatId === undefined || m.chatId === BigInt(chatId)),
      )
      .map((m) => (m.method === 'sendMessage' ? m.html : ''));
  const pines = (desde: number) =>
    enviadosDesde(desde).filter((m) => m.method === 'sendLocation');

  async function contactoDe(id: string) {
    const res = await como(tokenA).get('/emergency-contacts').expect(200);
    return res.body.find((c: { id: string }) => c.id === id);
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configurarHttp(app);
    await app.init();
    prisma = app.get(PrismaService);
    telegram = app.get(TELEGRAM_SENDER);
    // La tarea de cada minuto no debe crear alertas a la mitad de las pruebas.
    app.get(SchedulerRegistry).getCronJob('hora-de-regreso').stop();

    tokenA = await crearUsuario(emailA, 'Ana Seguridad');
    tokenB = await crearUsuario(emailB, 'Beto Ajeno');
  }, 60_000);

  afterAll(async () => {
    await prisma?.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
    await app?.close();
  });

  it('usa el emisor que solo registra', () => {
    expect(telegram).toBeInstanceOf(LogTelegramSender);
  });

  it('sin token responde 401 en todos los endpoints de la app (CA-28)', async () => {
    const id = randomUUID();
    await http().get('/emergency-contacts').expect(401);
    await http().post('/emergency-contacts').send({}).expect(401);
    await http().patch(`/emergency-contacts/${id}`).send({}).expect(401);
    await http().delete(`/emergency-contacts/${id}`).expect(401);
    await http().post(`/emergency-contacts/${id}/test`).expect(401);
    await http().put(`/safety/sessions/${id}`).send({}).expect(401);
    await http().get(`/safety/sessions/${id}`).expect(401);
    await http().post(`/safety/sessions/${id}/locations`).send({}).expect(401);
    await http().post(`/safety/sessions/${id}/finish`).send({}).expect(401);
    await http().post(`/safety/sessions/${id}/alerts`).send({}).expect(401);
    await http().post(`/safety/alerts/${id}/cancel`).expect(401);
  });

  it('agrega tres contactos pendientes con invitación; el cuarto da 409 y un nombre de 41 da 400 (CA-1, CA-2)', async () => {
    const crear = (name: string) =>
      como(tokenA).post('/emergency-contacts').send({ name });

    const largo = await crear('n'.repeat(41)).expect(400);
    expect(largo.body.errors).toEqual({
      name: ['El nombre debe tener como máximo 40 caracteres'],
    });
    await crear('   ').expect(400);

    const res = await crear('  Mamá  ').expect(201);
    expect(res.body).toMatchObject({
      name: 'Mamá',
      status: 'PENDING',
      telegramName: null,
    });
    expect(res.body.inviteUrl).toMatch(
      /^https:\/\/t\.me\/\w+\?start=[A-Za-z0-9_-]{43}$/,
    );
    mama = res.body;
    beto = (await crear('Beto').expect(201)).body;
    tia = (await crear('Tía').expect(201)).body;

    const cuarto = await crear('Cuarto').expect(409);
    expect(cuarto.body.message).toBe(
      'Puedes tener como máximo 3 contactos de emergencia',
    );

    const lista = await como(tokenA).get('/emergency-contacts').expect(200);
    expect(lista.body.map((c: { name: string }) => c.name)).toEqual([
      'Mamá',
      'Beto',
      'Tía',
    ]);
  });

  it('el webhook sin el secreto da 401 y no vincula (D12)', async () => {
    await aceptar(mama.inviteUrl, CHAT_MAMA, 'otro-secreto').expect(401);
    await http()
      .post('/telegram/webhook')
      .send({ update_id: 1, message: { text: '/start x' } })
      .expect(401);
    expect((await contactoDe(mama.id)).status).toBe('PENDING');
  });

  it('aceptar la invitación deja al contacto activo y le da la bienvenida (CA-5)', async () => {
    const desde = telegram.sent.length;

    await aceptar(mama.inviteUrl, CHAT_MAMA).expect(200);

    expect(await contactoDe(mama.id)).toMatchObject({
      status: 'ACTIVE',
      telegramName: `Contacto ${CHAT_MAMA}`,
      inviteUrl: null,
    });
    const [bienvenida] = textos(desde, CHAT_MAMA);
    expect(bienvenida).toContain(
      '<b>Ana Seguridad</b> te registró como contacto de emergencia',
    );
    expect(
      await prisma.alertMessage.count({
        where: { contactId: mama.id, kind: 'WELCOME', status: 'SENT' },
      }),
    ).toBe(1);

    await aceptar(beto.inviteUrl, CHAT_BETO).expect(200);
    expect((await contactoDe(beto.id)).status).toBe('ACTIVE');
  });

  it('el mismo token otra vez no vincula y responde que la invitación no es válida (CA-5)', async () => {
    const desde = telegram.sent.length;

    await aceptar(mama.inviteUrl, CHAT_BETO).expect(200);

    expect(textos(desde, CHAT_BETO)).toEqual([
      expect.stringContaining('no es válida'),
    ]);
    expect((await contactoDe(mama.id)).telegramName).toBe(
      `Contacto ${CHAT_MAMA}`,
    );
  });

  it('la prueba a un pendiente da 409; a un activo, 200 y queda registrada; dos seguidas dan 429 (CA-6)', async () => {
    await como(tokenA).post(`/emergency-contacts/${tia.id}/test`).expect(409);

    const desde = telegram.sent.length;
    const res = await como(tokenA)
      .post(`/emergency-contacts/${mama.id}/test`)
      .expect(200);
    expect(res.body).toEqual({ status: 'SENT', error: null });
    expect(textos(desde, CHAT_MAMA)).toEqual([
      expect.stringContaining('Mensaje de prueba de SendaBC'),
    ]);
    expect(
      await prisma.alertMessage.count({
        where: { contactId: mama.id, kind: 'TEST' },
      }),
    ).toBe(1);

    await como(tokenA).post(`/emergency-contacts/${mama.id}/test`).expect(429);
  });

  it('el otro usuario no ve ni cambia esos contactos: 404 (CA-4, CA-28)', async () => {
    const lista = await como(tokenB).get('/emergency-contacts').expect(200);
    expect(lista.body).toEqual([]);
    await como(tokenB)
      .patch(`/emergency-contacts/${mama.id}`)
      .send({ name: 'Mía' })
      .expect(404);
    await como(tokenB).delete(`/emergency-contacts/${mama.id}`).expect(404);
    await como(tokenB).post(`/emergency-contacts/${beto.id}/test`).expect(404);
    expect((await contactoDe(mama.id)).name).toBe('Mamá');
  });

  it('edita el nombre y quita un contacto; su invitación deja de servir (CA-3)', async () => {
    const editado = await como(tokenA)
      .patch(`/emergency-contacts/${mama.id}`)
      .send({ name: ' Mamá Rosa ' })
      .expect(200);
    expect(editado.body.name).toBe('Mamá Rosa');

    await como(tokenA).delete(`/emergency-contacts/${tia.id}`).expect(204);
    expect(await contactoDe(tia.id)).toBeUndefined();

    const desde = telegram.sent.length;
    await aceptar(tia.inviteUrl, base + 3).expect(200);
    expect(textos(desde)).toEqual([expect.stringContaining('no es válida')]);
  });

  it('la sesión: PUT dos veces es idempotente y se puede leer (CA-23)', async () => {
    const body = {
      type: 'HIKING',
      startedAt: new Date(Date.now() - 60 * MIN).toISOString(),
      returnBy: null,
    };
    const primera = await como(tokenA)
      .put(`/safety/sessions/${sesion}`)
      .send(body)
      .expect(200);
    const segunda = await como(tokenA)
      .put(`/safety/sessions/${sesion}`)
      .send(body)
      .expect(200);
    expect(segunda.body).toEqual(primera.body);
    expect(primera.body).toMatchObject({
      clientId: sesion,
      type: 'HIKING',
      returnBy: null,
      endedAt: null,
      activeAlert: null,
    });
    expect(
      await prisma.safetySession.count({
        where: { clientGeneratedId: sesion },
      }),
    ).toBe(1);

    await como(tokenB).get(`/safety/sessions/${sesion}`).expect(404);
    await como(tokenB).put(`/safety/sessions/${sesion}`).send(body).expect(404);
  });

  it('guarda la ubicación más reciente (CA-20)', async () => {
    const recordedAt = new Date(Date.now() - 5 * MIN).toISOString();
    await como(tokenA)
      .post(`/safety/sessions/${sesion}/locations`)
      .send({ latitude: 32.0471, longitude: -115.4614, recordedAt })
      .expect(204);
    // Una atrasada no la reemplaza.
    await como(tokenA)
      .post(`/safety/sessions/${sesion}/locations`)
      .send({
        latitude: 31,
        longitude: -116,
        recordedAt: new Date(Date.now() - 30 * MIN).toISOString(),
      })
      .expect(204);

    const res = await como(tokenA)
      .get(`/safety/sessions/${sesion}`)
      .expect(200);
    expect(res.body.lastLocationAt).toBe(recordedAt);
    await como(tokenB)
      .post(`/safety/sessions/${sesion}/locations`)
      .send({ latitude: 32, longitude: -115, recordedAt })
      .expect(404);
  });

  it('una alerta por inactividad avisa a los activos con texto y pin; repetirla no envía otra (CA-14, CA-17, CA-27)', async () => {
    const desde = telegram.sent.length;
    const cuerpo = {
      clientAlertId: randomUUID(),
      reason: 'INACTIVITY',
      triggeredAt: new Date(Date.now() - 2 * MIN).toISOString(),
      latitude: 32.0471,
      longitude: -115.4614,
      locationAt: new Date(Date.now() - 5 * MIN).toISOString(),
    };

    const res = await como(tokenA)
      .post(`/safety/sessions/${sesion}/alerts`)
      .send(cuerpo)
      .expect(201);
    alerta = res.body.id;
    expect(res.body).toMatchObject({ reason: 'INACTIVITY', status: 'ACTIVE' });
    expect(
      res.body.deliveries.map((d: { contactName: string }) => d.contactName),
    ).toEqual(['Mamá Rosa', 'Beto']);

    for (const chat of [CHAT_MAMA, CHAT_BETO]) {
      const [texto] = textos(desde, chat);
      expect(texto).toContain('Alerta de SendaBC');
      expect(texto).toContain('Ana Seguridad dejó de moverse');
      expect(texto).toContain('Actividad: Senderismo');
      expect(texto).toContain('google.com/maps');
      expect(texto).not.toContain(emailA);
    }
    expect(pines(desde)).toHaveLength(2);

    const despues = telegram.sent.length;
    // Reintento de la bandeja con el mismo id: 200, la misma alerta.
    const reintento = await como(tokenA)
      .post(`/safety/sessions/${sesion}/alerts`)
      .send(cuerpo)
      .expect(200);
    expect(reintento.body.id).toBe(alerta);
    // Pedir ayuda con la alerta activa: 200 con la activa, sin otro mensaje.
    const sos = await como(tokenA)
      .post(`/safety/sessions/${sesion}/alerts`)
      .send({ ...cuerpo, clientAlertId: randomUUID(), reason: 'SOS' })
      .expect(200);
    expect(sos.body.id).toBe(alerta);
    expect(enviadosDesde(despues)).toEqual([]);

    const leida = await como(tokenA)
      .get(`/safety/sessions/${sesion}`)
      .expect(200);
    expect(leida.body.activeAlert).toMatchObject({
      id: alerta,
      status: 'ACTIVE',
    });
    expect(leida.body.activeAlert.deliveries).toHaveLength(2);
  });

  it('con la alerta activa, una ubicación a más de 200 m se reenvía; una cerca no (CA-16)', async () => {
    let desde = telegram.sent.length;
    await como(tokenA)
      .post(`/safety/sessions/${sesion}/locations`)
      .send({
        latitude: 32.0471 + 300 / 111_195,
        longitude: -115.4614,
        recordedAt: new Date(Date.now() - 1 * MIN).toISOString(),
      })
      .expect(204);
    expect(textos(desde, CHAT_MAMA)).toEqual([
      expect.stringContaining('Ubicación actualizada de Ana Seguridad'),
    ]);
    expect(pines(desde)).toHaveLength(2);

    desde = telegram.sent.length;
    await como(tokenA)
      .post(`/safety/sessions/${sesion}/locations`)
      .send({
        latitude: 32.0471 + 320 / 111_195,
        longitude: -115.4614,
        recordedAt: new Date().toISOString(),
      })
      .expect(204);
    expect(enviadosDesde(desde)).toEqual([]);
  });

  it('cancelar manda "está bien" y corta las ubicaciones; cancelar otra vez da 409 (CA-25)', async () => {
    await como(tokenB).post(`/safety/alerts/${alerta}/cancel`).expect(404);

    let desde = telegram.sent.length;
    const res = await como(tokenA)
      .post(`/safety/alerts/${alerta}/cancel`)
      .expect(200);
    expect(res.body.status).toBe('CANCELLED');
    expect(textos(desde, CHAT_BETO)).toEqual([
      expect.stringContaining('<b>Ana Seguridad está bien.</b>'),
    ]);

    await como(tokenA).post(`/safety/alerts/${alerta}/cancel`).expect(409);

    desde = telegram.sent.length;
    await como(tokenA)
      .post(`/safety/sessions/${sesion}/locations`)
      .send({
        latitude: 33,
        longitude: -115.4614,
        recordedAt: new Date(Date.now() + 20 * MIN).toISOString(),
      })
      .expect(204);
    expect(enviadosDesde(desde)).toEqual([]);
  });

  it('hora de regreso vencida: la tarea crea la alerta RETURN_TIME; al terminar se resuelve y avisa "terminó" (CA-18, CA-19, CA-22)', async () => {
    const vencida = randomUUID();
    await como(tokenA)
      .put(`/safety/sessions/${vencida}`)
      .send({
        type: 'TRAIL_RUNNING',
        startedAt: new Date(Date.now() - 4 * 60 * MIN).toISOString(),
        returnBy: new Date(Date.now() - 2 * 60 * MIN).toISOString(),
      })
      .expect(200);
    await como(tokenA)
      .post(`/safety/sessions/${vencida}/locations`)
      .send({
        latitude: 32.1,
        longitude: -115.5,
        recordedAt: new Date(Date.now() - 2.5 * 60 * MIN).toISOString(),
      })
      .expect(204);
    // Otra con la hora de regreso cambiada a una que aún no vence: no avisa.
    const cambiada = randomUUID();
    const cambio = {
      type: 'HIKING',
      startedAt: new Date(Date.now() - 4 * 60 * MIN).toISOString(),
      returnBy: new Date(Date.now() - 2 * 60 * MIN).toISOString(),
    };
    await como(tokenA)
      .put(`/safety/sessions/${cambiada}`)
      .send(cambio)
      .expect(200);
    await como(tokenA)
      .put(`/safety/sessions/${cambiada}`)
      .send({
        ...cambio,
        returnBy: new Date(Date.now() + 60 * MIN).toISOString(),
      })
      .expect(200);

    const desde = telegram.sent.length;
    const job = app.get(ReturnTimeJob);
    await job.ejecutar(new Date());

    const res = await como(tokenA)
      .get(`/safety/sessions/${vencida}`)
      .expect(200);
    expect(res.body.activeAlert).toMatchObject({
      reason: 'RETURN_TIME',
      status: 'ACTIVE',
    });
    const [texto] = textos(desde, CHAT_MAMA);
    expect(texto).toContain('no ha confirmado su regreso');
    expect(texto).toContain('falta de señal');
    expect(texto).toContain('Actividad: Trail running');
    expect(pines(desde)).toHaveLength(2);
    expect(
      (await como(tokenA).get(`/safety/sessions/${cambiada}`).expect(200)).body
        .activeAlert,
    ).toBeNull();

    // Una segunda ejecución no la duplica.
    const despues = telegram.sent.length;
    await job.ejecutar(new Date());
    expect(enviadosDesde(despues)).toEqual([]);

    const finDesde = telegram.sent.length;
    const fin = await como(tokenA)
      .post(`/safety/sessions/${vencida}/finish`)
      .send({ endedAt: new Date().toISOString() })
      .expect(200);
    expect(fin.body.activeAlert).toBeNull();
    expect(fin.body.endedAt).not.toBeNull();
    expect(textos(finDesde, CHAT_BETO)).toEqual([
      expect.stringContaining('terminó su actividad y está bien'),
    ]);
    expect(
      await prisma.emergencyAlert.findFirst({
        where: { session: { clientGeneratedId: vencida } },
        select: { status: true },
      }),
    ).toEqual({ status: 'RESOLVED' });

    // Terminada: ya no recibe ubicaciones (RN-9).
    await como(tokenA)
      .post(`/safety/sessions/${vencida}/locations`)
      .send({
        latitude: 32,
        longitude: -115,
        recordedAt: new Date().toISOString(),
      })
      .expect(409);
  });

  it('un envío bloqueado deja al contacto "No recibe mensajes"; aceptar de nuevo lo reactiva (CA-7, RN-13)', async () => {
    telegram.blockedChats.add(BigInt(CHAT_BETO));
    const res = await como(tokenA)
      .post(`/emergency-contacts/${beto.id}/test`)
      .expect(200);
    expect(res.body.status).toBe('FAILED');
    expect(res.body.error).toContain('bloqueó');

    const bloqueado = await contactoDe(beto.id);
    expect(bloqueado.status).toBe('UNREACHABLE');
    expect(bloqueado.inviteUrl).toMatch(/\?start=[A-Za-z0-9_-]{43}$/);

    telegram.blockedChats.delete(BigInt(CHAT_BETO));
    await aceptar(bloqueado.inviteUrl, CHAT_BETO).expect(200);
    expect((await contactoDe(beto.id)).status).toBe('ACTIVE');
  });
});
