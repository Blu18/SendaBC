import { Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Request } from 'express'
import { AuthJwtPayload } from './types/auth-jwtPayload.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Req() req: Request & {user: AuthJwtPayload}) {
    const token = this.authService.login(req.user.sub)
    return { id: req.user.sub, token }
  }
}
