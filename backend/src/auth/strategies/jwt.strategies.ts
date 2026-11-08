import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import type { ConfigType } from '@nestjs/config';
import jwtConfig from '../config/jwt.config.js'
import { AuthJwtPayload } from '../types/auth-jwtPayload.js';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../../user/user.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @Inject(jwtConfig.KEY) private jwtConfiguration: ConfigType<typeof jwtConfig>,
        private readonly userService: UserService,
    ){
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: jwtConfiguration.secret,
        })
    }

    // El token de una cuenta borrada sigue siendo válido hasta que caduca: sin esta
    // comprobación respondería 200 o fallaría con 500 (spec 011, CA-49; plan, D6). El 401
    // hace que la app cierre la sesión con el manejador que ya existe.
    async validate(payload: AuthJwtPayload) {
        if (!(await this.userService.exists(payload.id))) {
            throw new UnauthorizedException()
        }
        return { id: payload.id }
    }
}
