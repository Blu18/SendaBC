import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configurarHttp } from './../src/configurar-http.js';
import { PrismaService } from './../src/prisma.service.js';

// Spec 001 — T6. Corre contra la base de DATABASE_URL (con migraciones aplicadas,
// incluido hash_password_trigger). Crea un usuario con correo único y lo borra al final.
describe('POST /user (e2e, spec 001)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-${randomUUID()}@senda.bc`;
  const password = 'contrasena-e2e';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma?.user.deleteMany({ where: { email } });
    await app?.close();
  });

  it('crea la cuenta y responde 201 sin passwordHash (CA-1, RN-1)', async () => {
    const res = await request(app.getHttpServer())
      .post('/user')
      .send({
        email: `  ${email.toUpperCase()} `,
        displayName: 'Prueba e2e',
        password,
        avatarId: 'x',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      email,
      displayName: 'Prueba e2e',
      avatarId: null,
    });
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('guarda la contraseña solo como hash bcrypt (CA-3)', async () => {
    const user = await prisma.user.findUnique({ where: { email } });

    expect(user?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user?.passwordHash).not.toContain(password);
  });

  it('responde 409 si el correo ya existe (CA-4)', async () => {
    const res = await request(app.getHttpServer())
      .post('/user')
      .send({ email, displayName: 'Otra persona', password })
      .expect(409);

    expect(res.body.message).toBe('Ya existe un usuario con ese email');
  });

  it('responde 400 con mensajes por campo si el body es inválido (CA-6)', async () => {
    const res = await request(app.getHttpServer())
      .post('/user')
      .send({ email: 'abc', displayName: '', password: '1234567' })
      .expect(400);

    expect(res.body.errors).toEqual({
      email: ['El correo no es válido'],
      displayName: ['El nombre visible debe tener al menos 5 caracteres'],
      password: ['La contraseña debe tener al menos 8 caracteres'],
    });
  });

  it('permite iniciar sesión con la cuenta recién creada (CA-2)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body).toEqual({
      id: expect.any(String),
      token: expect.any(String),
    });
  });
});

// Spec 011 — T16. Cuenta: perfil, correo, contraseña y borrado. Corre contra la base de
// DATABASE_URL con la migración cuenta_y_rutas_sin_autor y TELEGRAM_MODE=log. Solo usa cuentas
// creadas por la prueba (plan, R9). Las rutas se insertan con SQL en el océano Pacífico, lejos
// del catálogo; al final se borran por id, junto con las cuentas que queden.
describe('Cuenta: perfil, correo, contraseña y borrado (e2e, spec 011)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const sufijo = randomUUID();
  const emailA = `e2e-cuenta-a-${sufijo}@senda.bc`;
  const emailA2 = `e2e-cuenta-a2-${sufijo}@senda.bc`;
  const emailB = `e2e-cuenta-b-${sufijo}@senda.bc`;
  const emailC = `e2e-cuenta-c-${sufijo}@senda.bc`;
  const password = 'contrasena-e2e';
  const rutas: string[] = [];

  const http = () => request(app.getHttpServer());
  const como = (token: string) => ({
    get: (url: string) => http().get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => http().post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => http().put(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => http().patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => http().delete(url).set('Authorization', `Bearer ${token}`),
  });

  async function login(email: string, pass: string) {
    return http().post('/auth/login').send({ email, password: pass });
  }

  async function crearUsuario(email: string, displayName: string) {
    const creado = await http().post('/user').send({ email, displayName, password }).expect(201);
    const res = await login(email, password);
    expect(res.status).toBe(200);
    return { id: creado.body.id as string, token: res.body.token as string };
  }

  async function insertarRuta(
    owner: string,
    status: 'PUBLISHED' | 'ARCHIVED',
    origen: string | null,
  ) {
    const id = randomUUID();
    rutas.push(id);
    await prisma.$executeRaw`
      INSERT INTO routes (id, name, type, status, "createdByUserId", "sourceActivityId",
                          "distanceMeters", "elevationGainMeters", "updatedAt", path, "startPoint")
      VALUES (${id}::uuid, ${`e2e cuenta ${status}`}, 'HIKING', ${status}::"RouteStatus",
              ${owner}::uuid, ${origen}::uuid, 1234.5, 210, now(),
              ST_SetSRID(ST_MakeLine(ST_MakePoint(-127, 24), ST_MakePoint(-126.999, 24.001)), 4326),
              ST_SetSRID(ST_MakePoint(-127, 24), 4326)::geography)`;
    return id;
  }

  let a: { id: string; token: string };
  let b: { id: string; token: string };
  let c: { id: string; token: string };

  beforeAll(async () => {
    process.env.TELEGRAM_MODE = 'log';
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configurarHttp(app);
    await app.init();
    prisma = app.get(PrismaService);

    a = await crearUsuario(emailA, 'Autora e2e');
    b = await crearUsuario(emailB, 'Vecino e2e');
    c = await crearUsuario(emailC, 'Borrable e2e');
  }, 60_000);

  afterAll(async () => {
    await prisma?.route.deleteMany({ where: { id: { in: rutas } } });
    await prisma?.user.deleteMany({
      where: { email: { in: [emailA, emailA2, emailB, emailC] } },
    });
    await app?.close();
  });

  it('sin token los cuatro endpoints responden 401', async () => {
    await http().patch('/user/me').send({}).expect(401);
    await http().patch('/user/me/email').send({}).expect(401);
    await http().patch('/user/me/password').send({}).expect(401);
    await http().delete('/user/me').send({}).expect(401);
  });

  describe('PATCH /user/me (CA-41, CA-42)', () => {
    it('guarda nombre y avatar, y se leen igual desde el servidor', async () => {
      const res = await como(a.token)
        .patch('/user/me')
        .send({ displayName: '  Ana Luz  ', avatarId: 'cactus' })
        .expect(200);

      expect(res.body).toMatchObject({ displayName: 'Ana Luz', avatarId: 'cactus' });
      expect(res.body).not.toHaveProperty('passwordHash');
      const perfil = await como(a.token).get('/user/profile').expect(200);
      expect(perfil.body).toMatchObject({ displayName: 'Ana Luz', avatarId: 'cactus' });
    });

    it('con un nombre inválido o un avatar fuera de la lista responde 400 y no guarda', async () => {
      const nombre = await como(a.token)
        .patch('/user/me')
        .send({ displayName: ' Ana ' })
        .expect(400);
      expect(nombre.body.errors).toEqual({
        displayName: ['El nombre visible debe tener al menos 5 caracteres'],
      });
      const avatar = await como(a.token)
        .patch('/user/me')
        .send({ avatarId: 'https://x.y/z.png' })
        .expect(400);
      expect(avatar.body.errors).toEqual({ avatarId: ['El avatar no es válido'] });

      const perfil = await como(a.token).get('/user/profile').expect(200);
      expect(perfil.body).toMatchObject({ displayName: 'Ana Luz', avatarId: 'cactus' });
    });

    it('avatarId null quita el avatar (RN-15)', async () => {
      const res = await como(a.token).patch('/user/me').send({ avatarId: null }).expect(200);
      expect(res.body).toMatchObject({ displayName: 'Ana Luz', avatarId: null });
    });
  });

  describe('PATCH /user/me/email (CA-43)', () => {
    it('con la contraseña incorrecta responde 403 y no cambia el correo (D11)', async () => {
      const res = await como(a.token)
        .patch('/user/me/email')
        .send({ email: emailA2, password: 'incorrecta-1' })
        .expect(403);
      expect(res.body.message).toBe('La contraseña no es correcta');
      expect((await login(emailA, password)).status).toBe(200);
    });

    it('con un correo que ya existe responde 409 con el mensaje del registro', async () => {
      const res = await como(a.token)
        .patch('/user/me/email')
        .send({ email: emailB.toUpperCase(), password })
        .expect(409);
      expect(res.body.message).toBe('Ya existe un usuario con ese email');
    });

    it('cambia el correo: entra con el nuevo y ya no con el anterior', async () => {
      const res = await como(a.token)
        .patch('/user/me/email')
        .send({ email: ` ${emailA2.toUpperCase()} `, password })
        .expect(200);
      expect(res.body.email).toBe(emailA2);
      expect(res.body).not.toHaveProperty('passwordHash');

      expect((await login(emailA, password)).status).toBe(401);
      expect((await login(emailA2, password)).status).toBe(200);
    });
  });

  describe('PATCH /user/me/password (CA-44)', () => {
    const nueva = 'contrasena-nueva-e2e';

    it('con la actual incorrecta responde 403 y no cambia nada', async () => {
      await como(a.token)
        .patch('/user/me/password')
        .send({ currentPassword: 'incorrecta-1', newPassword: nueva })
        .expect(403);
      expect((await login(emailA2, password)).status).toBe(200);
    });

    it('con una nueva de menos de 8 caracteres responde 400', async () => {
      const res = await como(a.token)
        .patch('/user/me/password')
        .send({ currentPassword: password, newPassword: '1234567' })
        .expect(400);
      expect(res.body.errors).toEqual({
        newPassword: ['La contraseña debe tener al menos 8 caracteres'],
      });
    });

    it('cambia la contraseña: entra con la nueva, no con la anterior, y se guarda como hash', async () => {
      await como(a.token)
        .patch('/user/me/password')
        .send({ currentPassword: password, newPassword: nueva })
        .expect(204);

      expect((await login(emailA2, password)).status).toBe(401);
      expect((await login(emailA2, nueva)).status).toBe(200);
      const user = await prisma.user.findUnique({ where: { id: a.id } });
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(user?.passwordHash).not.toContain(nueva);
    });
  });

  describe('DELETE /user/me (CA-46 a CA-49)', () => {
    let actividad: string;
    let publicada: string;
    let archivada: string;
    let sesion: string;
    let alerta: string;

    beforeAll(async () => {
      actividad = (
        await prisma.activity.create({
          data: { userId: c.id, type: 'HIKING', startedAt: new Date(), status: 'SYNCED' },
          select: { id: true },
        })
      ).id;
      publicada = await insertarRuta(c.id, 'PUBLISHED', actividad);
      archivada = await insertarRuta(c.id, 'ARCHIVED', null);
      await como(b.token).put(`/routes/${publicada}/favorite`).expect(204);
      await como(c.token).post('/emergency-contacts').send({ name: 'Contacto e2e' }).expect(201);
      sesion = (
        await prisma.safetySession.create({
          data: {
            clientGeneratedId: randomUUID(),
            userId: c.id,
            type: 'HIKING',
            startedAt: new Date(),
          },
          select: { id: true },
        })
      ).id;
      alerta = (
        await prisma.emergencyAlert.create({
          data: { sessionId: sesion, reason: 'MANUAL_SOS', triggeredAt: new Date() },
          select: { id: true },
        })
      ).id;
    }, 30_000);

    it('sin contraseña responde 400 y con la incorrecta 403, sin borrar nada (CA-46; D11)', async () => {
      await como(c.token).delete('/user/me').send({}).expect(400);
      await como(c.token).delete('/user/me').send({ password: 'incorrecta-1' }).expect(403);
      expect(await prisma.user.count({ where: { id: c.id } })).toBe(1);
    });

    it('con una alerta activa responde 409 y no borra nada (CA-47)', async () => {
      const res = await como(c.token).delete('/user/me').send({ password }).expect(409);

      expect(res.body.message).toBe(
        'No puedes borrar tu cuenta mientras tienes una alerta activa. Cancélala primero.',
      );
      expect(await prisma.user.count({ where: { id: c.id } })).toBe(1);
      const ruta = await prisma.route.findUnique({ where: { id: archivada } });
      expect(ruta?.status).toBe('ARCHIVED');
    });

    it('sin alerta activa borra la cuenta y sus datos; las publicadas siguen sin autor (CA-46, CA-48)', async () => {
      await prisma.emergencyAlert.update({
        where: { id: alerta },
        data: { status: 'CANCELLED' },
      });

      await como(c.token).delete('/user/me').send({ password }).expect(204);

      expect(await prisma.user.count({ where: { id: c.id } })).toBe(0);
      expect(await prisma.activity.count({ where: { userId: c.id } })).toBe(0);
      expect(await prisma.emergencyContact.count({ where: { userId: c.id } })).toBe(0);
      expect(await prisma.safetySession.count({ where: { id: sesion } })).toBe(0);
      expect(await prisma.emergencyAlert.count({ where: { id: alerta } })).toBe(0);
      expect(await prisma.route.findUnique({ where: { id: archivada } })).toMatchObject({
        status: 'DELETED',
        createdByUserId: null,
      });
      expect(await prisma.route.findUnique({ where: { id: publicada } })).toMatchObject({
        status: 'PUBLISHED',
        createdByUserId: null,
        sourceActivityId: null,
      });
      expect((await login(emailC, password)).status).toBe(401);
    });

    it('otro usuario sigue viendo la ruta como "Cuenta eliminada" y en sus favoritas (CA-48, RN-16)', async () => {
      const detalle = await como(b.token).get(`/routes/${publicada}`).expect(200);
      expect(detalle.body).toMatchObject({
        author: 'Cuenta eliminada',
        isMine: false,
        sourceActivityId: null,
      });

      const cercanas = await como(b.token)
        .get('/routes/nearby')
        .query({ lat: 24, lng: -127, radiusKm: 5 })
        .expect(200);
      expect(cercanas.body.find((r: { id: string }) => r.id === publicada)).toMatchObject({
        author: 'Cuenta eliminada',
        isMine: false,
      });

      const favoritas = await como(b.token).get('/routes/favorites').expect(200);
      expect(favoritas.body.map((f: { id: string }) => f.id)).toContain(publicada);
      await como(b.token)
        .patch(`/routes/${publicada}`)
        .send({ status: 'ARCHIVED' })
        .expect(403);
      await como(b.token).delete(`/routes/${publicada}`).expect(403);
    });

    it('el token de la cuenta borrada responde 401 (CA-49; D6)', async () => {
      await como(c.token).get('/user/profile').expect(401);
      await como(c.token).post('/activities/sync').send({ activities: [] }).expect(401);
      await como(c.token).get('/routes/nearby').query({ lat: 24, lng: -127 }).expect(401);
    });
  });
});
