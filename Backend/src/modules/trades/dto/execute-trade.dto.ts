import { TradeAction, TradeStrategy } from '@prisma/client';
import {
    IsEnum,
    IsNumber,
    IsObject,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';

export class ExecuteTradeDto {
  @IsString()
  @MaxLength(120)
  coinId!: string;

  @IsString()
  @MaxLength(20)
  symbol!: string;

  @IsEnum(TradeAction)
  action!: TradeAction;

  @IsOptional()
  @IsEnum(TradeStrategy)
  strategy?: TradeStrategy;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  price!: number;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  size!: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  result?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
