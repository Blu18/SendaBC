import { registerAs } from '@nestjs/config'
import type { StringValue } from 'ms'

export default registerAs('jwt', () => {
    // RN-2 (spec 002): sin secreto no se arranca; un secreto vacío permitiría firmar tokens válidos con ''.
    const secret = process.env.JWT_SECRET?.trim()
    if (!secret) {
        throw new Error('JWT_SECRET no está definido: configúralo en el .env antes de arrancar el backend')
    }

    return {
        secret,
        signOptions: {
            expiresIn: process.env.JWT_EXPIRE_IN as StringValue
        }
    }
})
