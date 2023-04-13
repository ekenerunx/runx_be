import { MessagingModule } from '../messaging/messaging.module';
import { ServiceRequestConsumer } from './queue/service-request.consumer';
import { NotificationModule } from '../notification/notification.module';
import { BullModule } from '@nestjs/bull';
import { User } from '../entities/user.entity';
import { UsersModule } from '../users/users.module';
import { ServiceTypesModule } from '../services-types/service-types.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ServiceRequestsController } from './service-requests.controller';
import { ServiceRequest } from '../entities/service-request.entity';
import { ServiceRequestsService } from './service-requests.service';
import { ServiceRequestProposal } from 'src/entities/service-request-proposal.entity';
import { NOTIFICATION_QUEUE } from 'src/notification/notification.constant';
import { SERVICE_REQUEST_QUEUE } from './service-request.constant';
import { WalletModule } from 'src/wallet/wallet.module';
import { Rating } from 'src/entities/rating.entity';
@Module({
  imports: [
    BullModule.registerQueue({ name: SERVICE_REQUEST_QUEUE }),
    TypeOrmModule.forFeature([
      ServiceRequest,
      User,
      ServiceRequestProposal,
      Rating,
    ]),
    ServiceTypesModule,
    NotificationModule,
    UsersModule,
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
    MessagingModule,
    WalletModule,
  ],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService, ServiceRequestConsumer],
  exports: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
