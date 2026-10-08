import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
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
        avatarUrl: 'x',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      email,
      displayName: 'Prueba e2e',
      avatarUrl: null,
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
      .send({ email, displayName: 'Otra', password })
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
      displayName: ['El nombre visible es obligatorio'],
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
