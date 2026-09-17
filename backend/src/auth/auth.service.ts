import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service.js';
import { AuthJwtPayload } from './types/auth-jwtPayload.js';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private userService: UserService, private jwtService: JwtService) {}

    login(userId: string) {
        const payload: AuthJwtPayload = { sub: userId }
        return this.jwtService.sign(payload)
    }
}
