import { WalletModule } from 'src/wallet/wallet.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { ProposalController } from './proposal.controller';
import { ServiceRequestModule } from 'src/service-request/service-request.module';
import { Proposal } from 'src/entities/proposal.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { MessagingModule } from 'src/messaging/messaging.module';
import { BullModule } from '@nestjs/bull';
import { NOTIFICATION_QUEUE } from 'src/notification/notification.constant';
import { PROPOSAL_QUEUE } from './proposal.constant';
import { ProposalConsumer } from './proposal.consumer';

@Module({
  imports: [
    ServiceRequestModule,
    NotificationModule,
    MessagingModule,
    TypeOrmModule.forFeature([Proposal]),
    WalletModule,
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
    BullModule.registerQueue({ name: PROPOSAL_QUEUE }),
  ],
  controllers: [ProposalController],
  providers: [ProposalService, ProposalConsumer],
  exports: [ProposalService],
})
export class ProposalModule {}
