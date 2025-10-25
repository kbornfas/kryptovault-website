import { ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class StartAutomationDto {
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(10_000)
  runs!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  currencies!: string[];

  @IsOptional()
  @IsString()
  strategyPreset?: string;
}
