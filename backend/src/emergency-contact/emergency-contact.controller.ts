import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { AuthJwtPayload } from '../auth/types/auth-jwtPayload.js';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto.js';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto.js';
import {
  EmergencyContactService,
  MENSAJES_CONTACTO,
} from './emergency-contact.service.js';

type RequestConUsuario = Request & { user: AuthJwtPayload };

// Un id que no es UUID no puede existir: 404 como un contacto de otra cuenta.
export const contactId = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException(MENSAJES_CONTACTO.noExiste),
});

// Configurar contactos y enviar la prueba requieren sesión (spec 008, CA-28). El dueño sale
// siempre del token (constitución 3.3).
@UseGuards(JwtAuthGuard)
@Controller('emergency-contacts')
export class EmergencyContactController {
  constructor(private readonly contacts: EmergencyContactService) {}

  @Get()
  list(@Req() req: RequestConUsuario) {
    return this.contacts.list(req.user.id);
  }

  @Post()
  create(
    @Req() req: RequestConUsuario,
    @Body() body: CreateEmergencyContactDto,
  ) {
    return this.contacts.create(req.user.id, body);
  }

  @Patch(':id')
  update(
    @Req() req: RequestConUsuario,
    @Param('id', contactId) id: string,
    @Body() body: UpdateEmergencyContactDto,
  ) {
    return this.contacts.update(req.user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: RequestConUsuario, @Param('id', contactId) id: string) {
    return this.contacts.remove(req.user.id, id);
  }

  // 200 con el resultado aunque Telegram falle: el usuario ve por qué no se envió (CA-6).
  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  sendTest(@Req() req: RequestConUsuario, @Param('id', contactId) id: string) {
    return this.contacts.sendTest(req.user.id, id);
  }
}
