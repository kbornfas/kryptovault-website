import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { AutomationService } from './automation.service';
import { StartAutomationDto } from './dto/start-automation.dto';
import { StopAutomationDto } from './dto/stop-automation.dto';

@Controller('automation')
@UseGuards(JwtAuthGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get('currencies')
  getCurrencies() {
    return this.automationService.getAvailableCurrencies();
  }

  @Post('start')
  startAutomation(@User('id') userId: string, @Body() body: StartAutomationDto) {
    return this.automationService.startAutomation(userId, body);
  }

  @Post('stop')
  stopAutomation(@User('id') userId: string, @Body() body: StopAutomationDto) {
    return this.automationService.stopAutomation(userId, body);
  }
}
