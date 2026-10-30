import { IsISO8601 } from 'class-validator';

// Body de POST /safety/sessions/:clientId/finish (spec 008, CA-19, CA-22).
export class FinishSessionDto {
  @IsISO8601(
    { strict: true },
    { message: 'El fin debe ser una fecha ISO 8601' },
  )
  endedAt!: string;
}
