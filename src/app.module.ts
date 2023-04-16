import { DatabaseExceptionFilter } from './filters/database.filter';
import { SystemModule } from './system/system.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { MessagingModule } from './messaging/messaging.module';
import { FileStorageModule } from './file-storage/file-storage.module';
import configuration from './config/configuration';
import { ServiceTypesModule } from './services-types/service-types.module';
import { APP_FILTER } from '@nestjs/core';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { WalletModule } from './wallet/wallet.module';
import { BullModule } from '@nestjs/bull';
import { NotificationModule } from './notification/notification.module';
import { BankAccount } from './entities/bank-account.entity';
import { Transaction } from './entities/transaction.entity';
import { PaymentProcessorModule } from './payment-processor/payment-processor.module';
import { FileModule } from './file/file.module';
import { Rating } from './entities/rating.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { RatingModule } from './rating/rating.module';
import { ServiceProviderModule } from './service-provider/service-provider.module';
import { InviteModule } from './invite/invite.module';
import { ClientModule } from './client/client.module';
import { AdminModule } from './admin/admin.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const creds: TypeOrmModuleOptions = {
          type: 'postgres',
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.name'),
          entities: [
            __dirname + '/entities/**/*.entity{.ts,.js}',
            BankAccount,
            Transaction,
            Rating,
          ],
          synchronize: true,
          autoLoadEntities: true,
        };
        return creds;
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          username: configService.get<string>('redis.username'),
        },
      }),
      inject: [ConfigService],
    }),
    // MulterModule.register({
    //   storage: diskStorage({
    //     destination: (req, file, cb) => {
    //       cb(null, ''); // Set your desired destination folder here
    //     },
    //     filename: (req, file, cb) => {
    //       cb(
    //         null,
    //         `${file.fieldname}-${Date.now()}${extname(file.originalname)}`,
    //       );
    //     },
    //   }),
    // }),
    AuthModule,
    MessagingModule,
    FileStorageModule,
    SystemModule,
    ServiceTypesModule,
    ServiceRequestsModule,
    WalletModule,
    NotificationModule,
    PaymentProcessorModule,
    FileModule,
    RatingModule,
    ServiceProviderModule,
    InviteModule,
    ClientModule,
    AdminModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: DatabaseExceptionFilter }],
})
export class AppModule {}
