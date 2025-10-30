import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { ExecuteTradeDto } from './dto/execute-trade.dto';
import { TradeHistoryEntry, TradesService } from './trades.service';

@Controller('trades')
@UseGuards(JwtAuthGuard)
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Get('history')
  async getTradeHistory(@User('id') userId: string): Promise<TradeHistoryEntry[]> {
    return this.tradesService.getUserTradeHistory(userId);
  }

  @Post('execute')
  async executeTrade(@User('id') userId: string, @Body() body: ExecuteTradeDto) {
    return this.tradesService.executeTrade(userId, body);
  }
}
