import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BlockchainVerificationService } from './blockchain-verification.service';
import { CryptoPaymentsController } from './crypto-payments.controller';
import { CryptoPaymentsService } from './crypto-payments.service';
import { DepositMonitorService } from './deposit-monitor.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [CryptoPaymentsService, BlockchainVerificationService, DepositMonitorService],
  controllers: [CryptoPaymentsController],
  exports: [CryptoPaymentsService],
})
export class PaymentsModule {}