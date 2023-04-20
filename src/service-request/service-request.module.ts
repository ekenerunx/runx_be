import { MessagingModule } from '../messaging/messaging.module';
import { ServiceRequestConsumer } from './queue/service-request.consumer';
import { NotificationModule } from '../notification/notification.module';
import { BullModule } from '@nestjs/bull';
import { User } from '../entities/user.entity';
import { UsersModule } from '../users/users.module';
import { ServiceTypesModule } from '../services-types/service-types.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ServiceRequestController } from './service-request.controller';
import { ServiceRequest } from '../entities/service-request.entity';
import { ServiceRequestService } from './service-request.service';
import { Proposal } from 'src/entities/proposal.entity';
import { NOTIFICATION_QUEUE } from 'src/notification/notification.constant';
import { SERVICE_REQUEST_QUEUE } from './service-request.constant';
import { WalletModule } from 'src/wallet/wallet.module';
import { Rating } from 'src/entities/rating.entity';
import { ProposalModule } from 'src/proposal/proposal.module';
@Module({
  imports: [
    BullModule.registerQueue({ name: SERVICE_REQUEST_QUEUE }),
    TypeOrmModule.forFeature([ServiceRequest, User, Proposal, Rating]),
    ServiceTypesModule,
    NotificationModule,
    UsersModule,
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
    MessagingModule,
    WalletModule,
    // ProposalModule,
  ],
  controllers: [ServiceRequestController],
  providers: [ServiceRequestService, ServiceRequestConsumer],
  exports: [ServiceRequestService],
})
export class ServiceRequestModule {}
