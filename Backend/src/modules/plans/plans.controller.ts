import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Plan } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlansService } from './plans.service';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Get()
  @ApiResponse({ status: 200, description: 'List all investment plans' })
  async getAllPlans(): Promise<Plan[]> {
    return this.plansService.getAllPlans();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Get plan details' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlanById(@Param('id') id: string): Promise<Plan> {
    const plan = await this.plansService.getPlanById(id);
    if (!plan) throw new Error('Plan not found');
    return plan;
  }

  @Get(':id/calculate/:amount')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Calculate investment returns' })
  async calculateReturns(
    @Param('id') id: string,
    @Param('amount') amount: string,
  ) {
    return this.plansService.calculateReturns(id, parseFloat(amount));
  }
}