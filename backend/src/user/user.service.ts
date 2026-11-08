import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare } from 'bcrypt';
import { AlertStatus, Prisma, RouteStatus } from '@prisma/client';
import type { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdateEmailDto } from './dto/update-email.dto.js';
import { UpdatePasswordDto } from './dto/update-password.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { PrismaService } from '../prisma.service.js';
import { normalizarEmail } from './normalizar-email.js';

type SafeUser = Omit<User, 'passwordHash'>;

export const MENSAJE_ALERTA_ACTIVA =
  'No puedes borrar tu cuenta mientras tienes una alerta activa. Cancélala primero.';

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

  // Para JwtStrategy (spec 011, CA-49; plan, D6): una consulta por clave primaria.
  async exists(id: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    return user !== null;
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

  // PATCH /user/me/email (spec 011, CA-43). Pide la contraseña actual.
  async updateEmail(id: string, { email, password }: UpdateEmailDto): Promise<SafeUser> {
    await this.verificarContrasena(id, password);
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { email: normalizarEmail(email) },
        omit: { passwordHash: true },
      });
    } catch (error) {
      // Mismo mensaje que el registro (spec 001, CA-4).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      throw error;
    }
  }

  // PATCH /user/me/password (spec 011, CA-44). El trigger hash_password_trigger también
  // cubre UPDATE y reemplaza la contraseña por su hash bcrypt (constitución 3.1; plan, D5).
  async updatePassword(
    id: string,
    { currentPassword, newPassword }: UpdatePasswordDto,
  ): Promise<void> {
    await this.verificarContrasena(id, currentPassword);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: newPassword },
      select: { id: true },
    });
  }

  // DELETE /user/me (spec 011, CA-46 a CA-48). Todo en una transacción:
  // 1. Con una alerta ACTIVE no se borra (CA-47): 409.
  // 2. Las rutas archivadas y en borrador pasan a DELETED; las publicadas se quedan (CA-48).
  // 3. Se borra el usuario. Actividades, puntos, favoritas, contactos, sesiones, alertas,
  //    mensajes y dispositivos se van en cascada; las rutas conservadas quedan sin autor y sin
  //    sourceActivityId por el SET NULL de la migración (RN-16).
  async deleteAccount(id: string, { password }: DeleteAccountDto): Promise<void> {
    await this.verificarContrasena(id, password);
    await this.prisma.$transaction(async (tx) => {
      const alertas = await tx.emergencyAlert.count({
        where: { status: AlertStatus.ACTIVE, session: { userId: id } },
      });
      if (alertas > 0) throw new ConflictException(MENSAJE_ALERTA_ACTIVA);

      await tx.route.updateMany({
        where: {
          createdByUserId: id,
          status: { in: [RouteStatus.ARCHIVED, RouteStatus.DRAFT] },
        },
        data: { status: RouteStatus.DELETED },
      });
      await tx.user.delete({ where: { id }, select: { id: true } });
    });
  }

  // Contraseña incorrecta: 403, no 401, para que la app no cierre la sesión (plan, D11).
  private async verificarContrasena(id: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { passwordHash: true },
    });
    if (!user) throw new UnauthorizedException();
    if (!(await compare(password, user.passwordHash))) {
      throw new ForbiddenException('La contraseña no es correcta');
    }
  }
}
