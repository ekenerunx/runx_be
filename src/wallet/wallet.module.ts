import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from 'src/entities/transaction.entity';
import { BankAccount } from 'src/entities/bank-account.entity';
import { User } from 'src/entities/user.entity';
import { PaymentProcessorModule } from 'src/payment-processor/payment-processor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, BankAccount, User]),
    PaymentProcessorModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
