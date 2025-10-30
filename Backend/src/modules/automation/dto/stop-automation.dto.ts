import { IsOptional, IsUUID } from 'class-validator';

export class StopAutomationDto {
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;
}
