import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

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
