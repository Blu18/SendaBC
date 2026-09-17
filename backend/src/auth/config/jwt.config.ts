import { registerAs } from '@nestjs/config'
import type { StringValue } from 'ms'

export default registerAs('jwt',  () => ({
    secret: process.env.JWT_SECRET ?? '',
    signOptions: {
        expiresIn: process.env.JWT_EXPIRE_IN as StringValue
    }
}))