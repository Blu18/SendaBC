import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject } from 'class-validator';

export const MAX_ACTIVITIES_PER_BATCH = 5;

// Body de POST /activities/sync (spec 005, D1). Solo valida la forma del lote: cada actividad
// se valida por separado con validarActividad() para que una inválida no rechace a las
// demás (CA-11). Por eso aquí no hay @ValidateNested.
export class SyncRequestDto {
  @IsArray({ message: 'activities debe ser una lista' })
  @ArrayMinSize(1, { message: 'Envía al menos una actividad' })
  @ArrayMaxSize(MAX_ACTIVITIES_PER_BATCH, {
    message: `Envía como máximo ${MAX_ACTIVITIES_PER_BATCH} actividades por lote`,
  })
  @IsObject({ each: true, message: 'Cada actividad debe ser un objeto' })
  activities!: Record<string, unknown>[];
}
