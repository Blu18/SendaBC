import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtModule } from '@nestjs/jwt'
import jwtConfig from './config/jwt.config.js';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [JwtModule.registerAsync(jwtConfig.asProvider()), UserModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
