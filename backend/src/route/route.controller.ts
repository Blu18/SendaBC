import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { AuthJwtPayload } from '../auth/types/auth-jwtPayload.js';
import { CreateRouteDto } from './dto/create-route.dto.js';
import { NearbyQueryDto } from './dto/nearby-query.dto.js';
import { UpdateRouteDto } from './dto/update-route.dto.js';
import { MENSAJES_RUTA, RouteService } from './route.service.js';

type RequestConUsuario = Request & { user: AuthJwtPayload };

// Un id que no es UUID no puede existir: 404 igual que una ruta no disponible (spec 007, CA-14).
export const routeId = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(MENSAJES_RUTA.noDisponible),
});

// Explorar, publicar, ver el detalle, favoritas y "Mis rutas" requieren sesión (spec 006,
// CA-17; spec 007, CA-27). El dueño sale siempre del token, no de un parámetro (constitución 3.3).
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get('nearby')
  nearby(@Req() req: RequestConUsuario, @Query() query: NearbyQueryDto) {
    return this.routeService.nearby(req.user.id, query);
  }

  // 201 con el detalle de la ruta nueva (CA-6).
  @Post()
  async publish(@Req() req: RequestConUsuario, @Body() body: CreateRouteDto) {
    const id = await this.routeService.publish(req.user.id, body);
    return this.routeService.detail(req.user.id, id);
  }

  // 'mine' y 'favorites' van antes de ':id' para que no se lean como un id.
  @Get('mine')
  mine(@Req() req: RequestConUsuario) {
    return this.routeService.listMine(req.user.id);
  }

  @Get('favorites')
  favorites(@Req() req: RequestConUsuario) {
    return this.routeService.listFavorites(req.user.id);
  }

  @Get(':id')
  detail(@Req() req: RequestConUsuario, @Param('id', routeId) id: string) {
    return this.routeService.detail(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: RequestConUsuario,
    @Param('id', routeId) id: string,
    @Body() body: UpdateRouteDto,
  ) {
    return this.routeService.update(req.user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: RequestConUsuario, @Param('id', routeId) id: string) {
    return this.routeService.remove(req.user.id, id);
  }

  // Guardar y quitar son idempotentes (CA-16).
  @Put(':id/favorite')
  @HttpCode(HttpStatus.NO_CONTENT)
  addFavorite(@Req() req: RequestConUsuario, @Param('id', routeId) id: string) {
    return this.routeService.addFavorite(req.user.id, id);
  }

  @Delete(':id/favorite')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFavorite(
    @Req() req: RequestConUsuario,
    @Param('id', routeId) id: string,
  ) {
    return this.routeService.removeFavorite(req.user.id, id);
  }
}
