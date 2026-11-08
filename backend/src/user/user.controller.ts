import { Controller, Get, Post, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { AuthJwtPayload } from '../auth/types/auth-jwtPayload.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  getProfile(@Req() req: Request & {user: AuthJwtPayload}) {
    return this.userService.findOne(req.user.id)
  }

  // CA-8 (spec 002): no hay rutas /user/:id. "Mi usuario" se edita en /user/me con el id
  // del token (spec 011).
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(
    @Req() req: Request & { user: AuthJwtPayload },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(req.user.id, dto);
  }
}
