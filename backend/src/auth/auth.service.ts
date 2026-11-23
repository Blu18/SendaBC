import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service.js';
import { AuthJwtPayload } from './types/auth-jwtPayload.js';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';


@Injectable()
export class AuthService {
    constructor(private userService: UserService, private jwtService: JwtService) {}

    async validateUser(email: string, password: string) {
        const user = await this.userService.findByEmail(email)
        if(!user) throw new UnauthorizedException("Credenciales inválidas")

        const passwordMatch: boolean = await compare(password, user.passwordHash)

        if(!passwordMatch) throw new UnauthorizedException("Credenciales inválidas")

        return { id: user.id }
    }

    login(userId: string) {
        const payload: AuthJwtPayload = { id: userId }
        return this.jwtService.sign(payload)
    }
}
