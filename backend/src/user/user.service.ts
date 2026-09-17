import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../prisma.service.js';
import type { Models } from '../prisma/schema.d.ts';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  create(createUserDto: CreateUserDto): Promise<Models.public_User> {
    const { passwordHash, ...rest } = createUserDto;
    return this.prisma.db.orm.public.User.create({ ...rest, passwordHash: passwordHash });
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: string) {
    return `This action returns a #${id} user`;
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: string) {
    return `This action removes a #${id} user`;
  }
}
