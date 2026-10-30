import { CreateEmergencyContactDto } from './create-emergency-contact.dto.js';

// Body de PATCH /emergency-contacts/:id (spec 008, CA-3). Solo se edita el nombre, con las
// mismas reglas que al agregarlo (RN-1).
export class UpdateEmergencyContactDto extends CreateEmergencyContactDto {}
