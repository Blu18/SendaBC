import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { PrismaService } from '../prisma.service.js';
import { normalizarEmail } from './normalizar-email.js';

type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create({ email, displayName, password }: CreateUserDto): Promise<SafeUser> {
    try {
      // El trigger hash_password_trigger reemplaza la contraseña por su hash bcrypt al insertar.
      const { passwordHash, ...safeUser } = await this.prisma.user.create({
        data: { email: normalizarEmail(email), displayName, passwordHash: password },
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
      where: { email: normalizarEmail(email) },
    });
  }

  async findOne(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findFirst({
      where: { id: id },
      omit: { passwordHash: true },
    });
  }

  // PATCH /user/me (spec 011, CA-41, CA-42). Solo cambia los campos que vienen;
  // avatarId null quita el avatar (RN-15).
  async updateProfile(id: string, { displayName, avatarId }: UpdateProfileDto): Promise<SafeUser> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(avatarId !== undefined && { avatarId }),
      },
      omit: { passwordHash: true },
    });
  }
}
