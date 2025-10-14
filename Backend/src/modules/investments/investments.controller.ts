import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Investment } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { InvestmentsService } from './investments.service';

@ApiTags('investments')
@Controller('investments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvestmentsController {
  constructor(private investmentsService: InvestmentsService) {}

  @Post('create')
  @ApiResponse({ status: 201, description: 'Investment created successfully' })
  async createInvestment(
    @User('id') userId: string,
    @Body() data: { planId: string; amount: number },
  ): Promise<Investment> {
    return this.investmentsService.createInvestment(
      userId,
      data.planId,
      data.amount,
    );
  }

  @Get('my-investments')
  @ApiResponse({ status: 200, description: 'Get user investments with statistics' })
  async getUserInvestments(@User('id') userId: string) {
    return this.investmentsService.getUserInvestments(userId);
  }

  @Get(':id/earnings')
  @ApiResponse({ status: 200, description: 'Calculate investment earnings and statistics' })
  async calculateEarnings(@Param('id') investmentId: string) {
    return this.investmentsService.calculateEarnings(investmentId);
  }

  @Get(':id/metrics')
  @ApiResponse({ status: 200, description: 'Get detailed investment metrics and history' })
  async getInvestmentMetrics(@Param('id') investmentId: string) {
    return this.investmentsService.getInvestmentMetrics(investmentId);
  }

  @Get('portfolio/summary')
  @ApiResponse({ status: 200, description: 'Get investment portfolio summary' })
  async getPortfolioSummary(@User('id') userId: string) {
    const { stats } = await this.investmentsService.getUserInvestments(userId);
    return stats;
  }
}