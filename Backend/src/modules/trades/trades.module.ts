import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';

@Module({
  imports: [PrismaModule],
  controllers: [TradesController],
  providers: [TradesService],
  exports: [TradesService],
})
export class TradesModule {}
