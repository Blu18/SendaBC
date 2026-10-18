import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { AuthJwtPayload } from '../auth/types/auth-jwtPayload.js';
import { NearbyQueryDto } from './dto/nearby-query.dto.js';
import { RouteService } from './route.service.js';

type RequestConUsuario = Request & { user: AuthJwtPayload };

// Explorar rutas requiere sesión (spec 006, CA-17). La marca "Tuya" se calcula con el
// usuario del token, no con un parámetro (constitución 3.3).
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get('nearby')
  nearby(@Req() req: RequestConUsuario, @Query() query: NearbyQueryDto) {
    return this.routeService.nearby(req.user.id, query);
  }
}
