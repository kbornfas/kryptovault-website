import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Max,
    Min,
} from 'class-validator';

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

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  @Max(100_000_000)
  stakePerRun!: number;
}
