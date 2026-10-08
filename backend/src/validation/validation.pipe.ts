import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    const object = plainToInstance(metatype, value ?? {});
    // whitelist: descarta los campos que el DTO no declara.
    const errors = await validate(object, { whitelist: true });
    if (errors.length > 0) {
      const porCampo: Record<string, string[]> = {};
      for (const error of errors) {
        porCampo[error.property] = Object.values(error.constraints ?? {});
      }
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Datos inválidos',
        errors: porCampo,
      });
    }
    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
