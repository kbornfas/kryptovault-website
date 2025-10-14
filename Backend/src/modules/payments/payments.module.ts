import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CryptoPaymentsController } from './crypto-payments.controller';
import { CryptoPaymentsService } from './crypto-payments.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [CryptoPaymentsService],
  controllers: [CryptoPaymentsController],
  exports: [CryptoPaymentsService],
})
export class PaymentsModule {}