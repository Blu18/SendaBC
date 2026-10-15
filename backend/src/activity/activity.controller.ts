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
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { AuthJwtPayload } from '../auth/types/auth-jwtPayload.js';
import { ActivityService, NO_ENCONTRADA } from './activity.service.js';
import { SyncRequestDto } from './dto/sync-request.dto.js';

type RequestConUsuario = Request & { user: AuthJwtPayload };

// Todas las rutas exigen JWT: sin token válido responden 401 y no guardan nada. El usuario
// siempre sale del token (spec 005, CA-18; constitución 3.3).
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // 200 con un resultado por actividad, aunque alguna se rechace (CA-11, D1).
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async sync(@Req() req: RequestConUsuario, @Body() body: SyncRequestDto) {
    return {
      results: await this.activityService.syncBatch(
        req.user.id,
        body.activities,
      ),
    };
  }

  @Get()
  list(@Req() req: RequestConUsuario) {
    return this.activityService.list(req.user.id);
  }

  // Un id que no es UUID no puede existir: 404 igual que una actividad ajena.
  @Get(':id')
  detail(
    @Req() req: RequestConUsuario,
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () => new NotFoundException(NO_ENCONTRADA),
      }),
    )
    id: string,
  ) {
    return this.activityService.getDetail(req.user.id, id);
  }
}
