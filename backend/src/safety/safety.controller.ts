import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { AuthJwtPayload } from '../auth/types/auth-jwtPayload.js';
import { AlertsService, MENSAJES_ALERTA } from './alerts.service.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { FinishSessionDto } from './dto/finish-session.dto.js';
import { SessionLocationDto } from './dto/session-location.dto.js';
import { UpsertSessionDto } from './dto/upsert-session.dto.js';
import { MENSAJES_SESION, SessionsService } from './sessions.service.js';

type RequestConUsuario = Request & { user: AuthJwtPayload };

// El clientGeneratedId de la actividad es un UUID v4 (constitución 2.2). Un id que no lo es no
// puede existir: 404, igual que una sesión de otra cuenta (CA-28).
export const sessionId = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new NotFoundException(MENSAJES_SESION.noExiste),
});

export const alertId = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(MENSAJES_ALERTA.noExiste),
});

// Sesiones de seguridad y alertas (spec 008, plan "Endpoints"). Todo requiere sesión y el
// usuario sale del token: el servidor solo acepta alertas, ubicaciones y horas de regreso de
// actividades del usuario (CA-28, constitución 3.3).
@UseGuards(JwtAuthGuard)
@Controller('safety')
export class SafetyController {
  constructor(
    private readonly sessions: SessionsService,
    private readonly alerts: AlertsService,
  ) {}

  @Put('sessions/:clientId')
  upsert(
    @Req() req: RequestConUsuario,
    @Param('clientId', sessionId) clientId: string,
    @Body() body: UpsertSessionDto,
  ) {
    return this.sessions.upsert(req.user.id, clientId, body);
  }

  @Get('sessions/:clientId')
  get(
    @Req() req: RequestConUsuario,
    @Param('clientId', sessionId) clientId: string,
  ) {
    return this.sessions.get(req.user.id, clientId);
  }

  @Post('sessions/:clientId/locations')
  @HttpCode(HttpStatus.NO_CONTENT)
  recordLocation(
    @Req() req: RequestConUsuario,
    @Param('clientId', sessionId) clientId: string,
    @Body() body: SessionLocationDto,
  ) {
    return this.alerts.recordLocation(req.user.id, clientId, body);
  }

  @Post('sessions/:clientId/finish')
  @HttpCode(HttpStatus.OK)
  finish(
    @Req() req: RequestConUsuario,
    @Param('clientId', sessionId) clientId: string,
    @Body() body: FinishSessionDto,
  ) {
    return this.alerts.finish(req.user.id, clientId, body);
  }

  // 201 con la alerta nueva; 200 con la que ya existía, sin volver a avisar (CA-27).
  @Post('sessions/:clientId/alerts')
  async createAlert(
    @Req() req: RequestConUsuario,
    @Param('clientId', sessionId) clientId: string,
    @Body() body: CreateAlertDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { alerta, creada } = await this.alerts.create(
      req.user.id,
      clientId,
      body,
    );
    res.status(creada ? HttpStatus.CREATED : HttpStatus.OK);
    return alerta;
  }

  @Post('alerts/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Req() req: RequestConUsuario, @Param('id', alertId) id: string) {
    return this.alerts.cancel(req.user.id, id);
  }
}
