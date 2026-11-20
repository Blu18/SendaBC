import {
  Controller,
  Get,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { configurarHttp } from './configurar-http.js';
import {
  esBaseNoDisponible,
  MENSAJE_NO_DISPONIBLE,
} from './prisma-disponibilidad.filter.js';

// Spec 011, CA-14: si el servidor no alcanza su base, responde 503 y no 500.

// Como lo lanzó Prisma 7 con el adaptador pg y la base en un puerto cerrado (T40).
function baseInalcanzable() {
  return new Prisma.PrismaClientKnownRequestError(
    "Can't reach database server at 127.0.0.1:59999",
    {
      code: 'P1001',
      clientVersion: Prisma.prismaVersion.client,
      meta: {
        modelName: 'User',
        driverAdapterError: {
          cause: {
            kind: 'DatabaseNotReachable',
            host: '127.0.0.1',
            port: 59999,
          },
        },
      },
    },
  );
}

describe('esBaseNoDisponible', () => {
  it('reconoce el error de Prisma 7 cuando no alcanza la base', () => {
    expect(esBaseNoDisponible(baseInalcanzable())).toBe(true);
  });

  it('reconoce los otros códigos de conexión de Prisma', () => {
    for (const code of ['P1002', 'P1017', 'P2024']) {
      expect(esBaseNoDisponible({ code })).toBe(true);
    }
    // PrismaClientInitializationError trae errorCode en lugar de code.
    expect(esBaseNoDisponible({ errorCode: 'P1001' })).toBe(true);
  });

  it('reconoce el error del adaptador solo por su tipo', () => {
    expect(
      esBaseNoDisponible({
        meta: { driverAdapterError: { cause: { kind: 'ConnectionClosed' } } },
      }),
    ).toBe(true);
    expect(
      esBaseNoDisponible({
        name: 'DriverAdapterError',
        cause: { kind: 'SocketTimeout' },
      }),
    ).toBe(true);
  });

  it('no confunde otros errores de Prisma ni errores comunes', () => {
    // Columna inexistente (P2022) y registro único repetido (P2002): son fallos del servidor.
    expect(
      esBaseNoDisponible({
        code: 'P2022',
        meta: { driverAdapterError: { cause: { kind: 'ColumnNotFound' } } },
      }),
    ).toBe(false);
    expect(esBaseNoDisponible({ code: 'P2002' })).toBe(false);
    expect(esBaseNoDisponible(new Error('fallo'))).toBe(false);
    expect(esBaseNoDisponible(null)).toBe(false);
    expect(esBaseNoDisponible('P1001')).toBe(false);
  });
});

@Controller('prueba')
class PruebaController {
  @Get('sin-base')
  sinBase() {
    throw baseInalcanzable();
  }

  @Get('otro-error')
  otroError() {
    throw new Error('fallo');
  }

  @Get('no-existe')
  noExiste() {
    throw new NotFoundException('Esta ruta ya no está disponible');
  }
}

describe('PrismaDisponibilidadFilter registrado por configurarHttp', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [PruebaController],
    }).compile();
    app = modulo.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    configurarHttp(app as NestExpressApplication);
    await app.init();
  });

  afterAll(() => app.close());

  it('responde 503 con el mensaje en español si la base no está disponible', async () => {
    const res = await request(app.getHttpServer()).get('/prueba/sin-base');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      statusCode: 503,
      message: MENSAJE_NO_DISPONIBLE,
    });
  });

  it('deja los demás errores como los responde Nest', async () => {
    const otro = await request(app.getHttpServer()).get('/prueba/otro-error');
    expect(otro.status).toBe(500);
    expect(otro.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });

    const noExiste = await request(app.getHttpServer()).get(
      '/prueba/no-existe',
    );
    expect(noExiste.status).toBe(404);
    expect(noExiste.body.message).toBe('Esta ruta ya no está disponible');
  });
});
