import { Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Request } from 'express'
import { AuthJwtPayload } from './types/auth-jwtPayload.js';
import { LocalAuthGuard } from './guards/local-auth/local-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request & {user: AuthJwtPayload}) {
    const token = this.authService.login(req.user.id)
    return { id: req.user.id, token }
  }
}
