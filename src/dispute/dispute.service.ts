import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EmailTemplate } from 'src/common/email-template';
import { ResponseMessage } from 'src/common/interface/success-message.interface';
import { normalizeEnum } from 'src/common/utils';
import { CatchErrorException } from 'src/exceptions';
import { NotificationType } from 'src/notification/interface/notification.interface';
import { ProposalService } from 'src/proposal/proposal.service';
import { RaiseDisputeDto } from 'src/service-request/dto/raise-dispute.dto';
import { ResolveDisputeDto } from 'src/service-request/dto/resolve-dispute.dto';
import { ServiceRequestStatus } from 'src/service-request/interfaces/service-requests.interface';
import { RESOLVE_DISPUTE_PROCESS } from 'src/service-request/service-request.constant';
import { TransactionType } from 'src/wallet/interfaces/transaction.interface';
import {
  Disputant,
  DisputeResolveAction,
  DisputeResolver,
  DisputeStatus,
  ResolveDisputeQueueProcess,
} from './dispute.interface';
import { InjectQueue } from '@nestjs/bull';
import { DISPUTE_QUEUE } from './dispute.constatnt';
import { Queue } from 'bull';
import { MessagingService } from 'src/messaging/messaging.service';
import { WalletService } from 'src/wallet/wallet.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class DisputeService {
  constructor(
    private readonly proposalService: ProposalService,
    @InjectQueue(DISPUTE_QUEUE)
    private readonly disputeQueue: Queue<ResolveDisputeQueueProcess>,
    private readonly messagingService: MessagingService,
    private readonly notificationService: NotificationService,
    private readonly walletService: WalletService,
  ) {}
  async raiseDispute(
    serviceRequestId: string,
    raiseDisputeDto: RaiseDisputeDto,
  ) {
    try {
      const { service_provider_id, disputant, dispute_reason } =
        raiseDisputeDto;
      const proposal = await this.proposalService.getProposalBySRSP(
        serviceRequestId,
        service_provider_id,
      );
      const serviceProvider = proposal.service_provider;
      const serviceRequest = proposal.service_request;
      const client = proposal.service_request.created_by;

      const canDisputeStatuses = [
        ServiceRequestStatus.IN_PROGRESS,
        ServiceRequestStatus.COMPLETED,
      ];
      if (!canDisputeStatuses.includes(proposal.status)) {
        throw new HttpException(
          `You can only raise dispute on a service request in ${canDisputeStatuses
            .map((i) => normalizeEnum(i))
            .join(',')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const disputeQueue = await this.disputeQueue.add(
        RESOLVE_DISPUTE_PROCESS,
        {
          serviceRequestId,
          resolveDisputeDto: {
            disputant,
            service_provider_id,
            dispute_resolve_action:
              disputant === Disputant.CLIENT
                ? DisputeResolveAction.REFUND_CLIENT
                : DisputeResolveAction.PAY_SERVICE_PROVIDER,
            dispute_resolve_reason:
              disputant === Disputant.CLIENT
                ? 'System refunded client after no query'
                : 'System paid service provider after no query',
            resolver: DisputeResolver.SYSTEM_QUEUE,
          },
        },
        { delay: 40000 },
      );
      proposal.dispute_status = DisputeStatus.IN_PROGRESS;
      proposal.disputant = disputant;
      proposal.dispute_queue_id = disputeQueue.id as any;
      proposal.dispute_date = new Date();
      proposal.dispute_reason = dispute_reason;
      //   await this.proposalRepo.save(proposal);

      // send Notification
      await this.notificationService.sendNotification({
        type: NotificationType.JOB_DISPUTE_RAISED,
        service_provider: serviceProvider,
        service_request: serviceRequest,
        subject:
          disputant === Disputant.SERVICE_PROVIDER
            ? 'Service proposal has rasied a dispute about your completed service request'
            : '',
        owner:
          disputant === Disputant.SERVICE_PROVIDER ? client : serviceProvider,
      });

      //send sample email to client
      await this.messagingService.sendEmail(
        EmailTemplate.raiseDispute({
          serviceProvider: serviceProvider,
          serviceRequest,
          client,
          disputant,
          disputeReason: dispute_reason,
        }),
      );
      return new ResponseMessage('Dispute successfully raised');
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async resolveDispute(
    serviceRequestId: string,
    resolveDisputeDto: ResolveDisputeDto,
  ) {
    const {
      disputant,
      service_provider_id,
      dispute_resolve_action,
      dispute_resolve_reason,
      resolver,
    } = resolveDisputeDto;
    const proposal = await this.proposalService.getProposalBySRSP(
      serviceRequestId,
      service_provider_id,
    );

    if (proposal.dispute_status !== DisputeStatus.IN_PROGRESS) {
      throw new HttpException(
        'You cannot resolve settled dispute',
        HttpStatus.BAD_REQUEST,
      );
    }
    proposal.dispute_resolve_date = new Date();
    proposal.dispute_resolve_reason = dispute_resolve_reason;
    proposal.dispute_resolve_action = dispute_resolve_action;
    // await this.proposalRepo.save(proposal);
    if (resolver === DisputeResolver.ADMIN) {
      const queueJob = await this.disputeQueue.getJob(
        proposal.dispute_queue_id,
      );
      if (queueJob) {
        await queueJob.remove();
      }
    }

    const serviceProvider = proposal.service_provider;
    const serviceRequest = proposal.service_request;
    const client = proposal.service_request.created_by;

    // send notification
    await this.notificationService.sendNotification({
      type: NotificationType.JOB_DISPUTE_RESOLVED,
      service_provider: serviceProvider,
      service_request: serviceRequest,
      subject: 'Dispute has been resolved',
      disputant,
      owner:
        disputant === Disputant.SERVICE_PROVIDER ? client : serviceProvider,
    });

    //send sample email to client
    await this.messagingService.sendEmail(
      EmailTemplate.resolveDispute({
        user: client,
        serviceRequest,
      }),
    );

    //send sample email to service provider
    await this.messagingService.sendEmail(
      EmailTemplate.resolveDispute({
        user: serviceProvider,
        serviceRequest,
      }),
    );

    if (dispute_resolve_action === DisputeResolveAction.PAY_SERVICE_PROVIDER) {
      await this.walletService.updateWalletBalance({
        user: serviceProvider,
        transactionType: TransactionType.CREDIT,
        amount: proposal.proposal_amount,
        description: 'Dispute has been resolved and amount has been credited',
        walletToUpdate: 'sp',
        escrow: 0,
        sendNotification: true,
        sendEmail: true,
        client,
        serviceProvider,
        serviceRequest,
        notificationType: NotificationType.ACCOUNT_CREDIT,
      });
      await this.walletService.updateWalletBalance({
        user: client,
        transactionType: TransactionType.DEBIT,
        amount: 0,
        description: 'Dispute resolved and service provider has been credited',
        walletToUpdate: 'client',
        escrow: -proposal.amount,
        sendNotification: false,
        sendEmail: false,
        client,
        serviceProvider,
        serviceRequest,
        notificationType: NotificationType.ACCOUNT_DEBIT,
      });
    }
    if (dispute_resolve_action === DisputeResolveAction.REFUND_CLIENT) {
      await this.walletService.updateWalletBalance({
        user: client,
        transactionType: TransactionType.CREDIT,
        amount: proposal.amount,
        description: 'Dispute resolved and your money has been refunded',
        walletToUpdate: 'client',
        escrow: -proposal.amount,
        sendNotification: true,
        sendEmail: true,
        client,
        serviceProvider,
        serviceRequest,
        notificationType: NotificationType.ACCOUNT_CREDIT,
      });
    }

    return new ResponseMessage(
      `Dispute successfully resolved in favor of ${normalizeEnum(disputant)}`,
    );
  }
}
