import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [PrismaModule],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
