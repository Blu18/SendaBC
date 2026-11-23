import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma.service.js';

describe('Rutas de usuario (e2e, spec 002)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    // Token válido de un usuario cualquiera: basta para pasar JwtAuthGuard.
    token = app.get(JwtService).sign({ id: randomUUID() });
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each(['get', 'patch', 'put', 'delete'] as const)(
    '%s /user/:id no existe, ni con token válido (CA-8)',
    async (metodo) => {
      await request(app.getHttpServer())
        [metodo](`/user/${randomUUID()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ displayName: 'Otra persona' })
        .expect(404);
    },
  );
});

// T4. Corre contra la base de DATABASE_URL: crea un usuario con correo único y lo borra al final.
describe('Login y perfil (e2e, spec 002)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-login-${randomUUID()}@senda.bc`;
  const password = 'contrasena-e2e';
  let userId: string;
  let token: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const res = await request(app.getHttpServer())
      .post('/user')
      .send({ email, displayName: 'Prueba login', password })
      .expect(201);
    userId = res.body.id;
  });

  afterAll(async () => {
    await prisma?.user.deleteMany({ where: { email } });
    await app?.close();
  });

  it('login correcto responde 200 con { id, token } (CA-1)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body).toEqual({ id: userId, token: expect.any(String) });
    token = res.body.token;
  });

  it.each([
    ['contraseña incorrecta', () => ({ email, password: 'otra-contrasena' })],
    [
      'correo inexistente',
      () => ({ email: `nadie-${randomUUID()}@senda.bc`, password }),
    ],
  ])('%s responde 401 con el mismo mensaje (CA-2)', async (_caso, body) => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(body())
      .expect(401);

    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('GET /user/profile con el token devuelve mis datos sin passwordHash (CA-7)', async () => {
    const res = await request(app.getHttpServer())
      .get('/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      id: userId,
      email,
      displayName: 'Prueba login',
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('GET /user/profile sin token responde 401 (CA-7)', async () => {
    await request(app.getHttpServer()).get('/user/profile').expect(401);
  });

  it('GET /user/profile con un token inválido responde 401 (CA-5)', async () => {
    await request(app.getHttpServer())
      .get('/user/profile')
      .set('Authorization', 'Bearer token-que-no-es-jwt')
      .expect(401);
  });
});
