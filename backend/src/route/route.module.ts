import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../prisma.service.js';
import { RouteController } from './route.controller.js';
import { RouteService } from './route.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [RouteController],
  providers: [RouteService, PrismaService],
})
export class RouteModule {}
