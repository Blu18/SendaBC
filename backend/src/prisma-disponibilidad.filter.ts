import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

export const MENSAJE_NO_DISPONIBLE =
  'El servicio no está disponible. Inténtalo de nuevo en unos minutos.';

// Códigos de Prisma de conexión: no alcanza el servidor (P1001), se agotó el tiempo (P1002), el
// servidor cerró la conexión (P1017) y no hubo conexión libre en el pool (P2024).
const CODIGOS_DE_CONEXION = new Set(['P1001', 'P1002', 'P1017', 'P2024']);

// Los mismos casos, como los nombra el adaptador pg (@prisma/adapter-pg).
const TIPOS_DE_CONEXION = new Set([
  'DatabaseNotReachable',
  'ConnectionClosed',
  'SocketTimeout',
  'TooManyConnections',
]);

type ErrorDePrisma = {
  code?: unknown; // PrismaClientKnownRequestError
  errorCode?: unknown; // PrismaClientInitializationError
  cause?: { kind?: unknown }; // DriverAdapterError suelto
  meta?: { driverAdapterError?: { cause?: { kind?: unknown } } };
};

// Si el error es que el servidor no alcanza su base de datos (spec 011, CA-14; plan, R3). Se
// revisa por forma y no por clase: Prisma 7 lo envuelve en PrismaClientKnownRequestError con
// code 'P1001' y meta.driverAdapterError.cause.kind 'DatabaseNotReachable' (visto en T40).
export function esBaseNoDisponible(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as ErrorDePrisma;
  const codigo = e.code ?? e.errorCode;
  if (typeof codigo === 'string' && CODIGOS_DE_CONEXION.has(codigo))
    return true;
  const tipo = e.meta?.driverAdapterError?.cause?.kind ?? e.cause?.kind;
  return typeof tipo === 'string' && TIPOS_DE_CONEXION.has(tipo);
}

// Filtro global: la base no disponible responde 503 con un mensaje en español, en lugar del
// 500 genérico (constitución 4.2; plan, D9). Todo lo demás sigue como lo responde Nest.
@Catch()
export class PrismaDisponibilidadFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('BaseDeDatos');

  catch(exception: unknown, host: ArgumentsHost) {
    if (!esBaseNoDisponible(exception) || host.getType() !== 'http') {
      return super.catch(exception, host);
    }
    this.logger.error('Base de datos no disponible', exception as Error);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.SERVICE_UNAVAILABLE)
      .json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: MENSAJE_NO_DISPONIBLE,
      });
  }
}
