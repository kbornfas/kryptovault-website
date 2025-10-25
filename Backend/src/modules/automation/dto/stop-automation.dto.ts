import { IsOptional, IsString } from 'class-validator';

export class StopAutomationDto {
  @IsOptional()
  @IsString()
  sessionId?: string;
}
