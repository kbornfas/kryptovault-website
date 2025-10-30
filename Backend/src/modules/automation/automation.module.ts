import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AutomationSessionOwnerGuard } from './automation-session.guard';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';

@Module({
  imports: [PrismaModule],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationSessionOwnerGuard],
  exports: [AutomationService],
})
export class AutomationModule {}
