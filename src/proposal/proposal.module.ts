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

@Module({
  imports: [
    // ServiceRequestModule,
    // NotificationModule,
    MessagingModule,
    TypeOrmModule.forFeature([Proposal]),
    WalletModule,
    // BullModule.registerQueue({
    //   name: NOTIFICATION_QUEUE,
    // }),
  ],
  controllers: [ProposalController],
  providers: [ProposalService],
  exports: [ProposalService],
})
export class ProposalModule {}
