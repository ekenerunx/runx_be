import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from 'src/entities/transaction.entity';
import { BankAccount } from 'src/entities/bank-account.entity';
import { User } from 'src/entities/user.entity';
import { PaymentProcessorModule } from 'src/payment-processor/payment-processor.module';
import { NotificationModule } from 'src/notification/notification.module';
import { MessagingModule } from 'src/messaging/messaging.module';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, BankAccount, User]),
    PaymentProcessorModule,
    NotificationModule,
    MessagingModule,
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          username: configService.get<string>('redis.username'),
        };
        return new Redis(redisConfig);
      },
      inject: [ConfigService],
    },
  ],
  exports: [WalletService],
})
export class WalletModule {}
