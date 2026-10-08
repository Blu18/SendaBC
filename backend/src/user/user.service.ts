import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../prisma.service.js';

type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create({ email, displayName, password }: CreateUserDto): Promise<SafeUser> {
    try {
      // El trigger hash_password_trigger reemplaza la contraseña por su hash bcrypt al insertar.
      const { passwordHash, ...safeUser } = await this.prisma.user.create({
        data: { email, displayName, passwordHash: password },
      });
      return safeUser;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      throw error;
    }
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: email
      }
    })
  }

  findAll() {
    return `This action returns all user`;
  }

  async findOne(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findFirst({
      where: { id: id },
      omit: { passwordHash: true },
    });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: string) {
    return `This action removes a #${id} user`;
  }
}
