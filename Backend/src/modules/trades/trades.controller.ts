import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { TradeHistoryEntry, TradesService } from './trades.service';

@Controller('trades')
@UseGuards(JwtAuthGuard)
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Get('history')
  async getTradeHistory(@User('id') userId: string): Promise<TradeHistoryEntry[]> {
    return this.tradesService.getUserTradeHistory(userId);
  }
}
