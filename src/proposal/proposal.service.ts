import { InitProposalDto } from './dto/init-proposal.dto';
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailTemplate } from 'src/common/email-template';
import { ResponseMessage } from 'src/common/interface/success-message.interface';
import { generateAlphaNumeric, normalizeEnum } from 'src/common/utils';
import { Proposal } from 'src/entities/proposal.entity';
import { User } from 'src/entities/user.entity';
import { CatchErrorException } from 'src/exceptions';
import { MessagingService } from 'src/messaging/messaging.service';
import { NotificationType } from 'src/notification/interface/notification.interface';
import { NotificationService } from 'src/notification/notification.service';
import { CompleteProposalDto } from 'src/proposal/dto/complete-proposal.dto';
import { ServiceRequestStatus } from 'src/service-request/interfaces/service-requests.interface';
import { getMillisecondsDifference } from 'src/service-request/service-request.util';
import { TransactionType } from 'src/wallet/interfaces/transaction.interface';
import { WalletService } from 'src/wallet/wallet.service';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { PROPOSAL_QUEUE, START_PROPOSAL_PROCESS } from './proposal.constant';
import { Queue } from 'bull';
import { StartProposalJob } from './proposal.interface';
import { AcceptProposalDto } from './dto/accept-proposal.dto';
import { SendProposalDto } from './dto/send-proposal.dto';

@Injectable()
export class ProposalService {
  constructor(
    @InjectRepository(Proposal)
    private proposalRepo: Repository<Proposal>,
    private readonly messagingService: MessagingService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
    @InjectQueue(PROPOSAL_QUEUE)
    private proposalQueue: Queue<StartProposalJob>,
  ) {}

  async getProposalBySRSP(serviceRequestId: string, serviceProviderId: string) {
    try {
      const proposal = await this.proposalRepo
        .createQueryBuilder('proposal')
        .leftJoinAndSelect('proposal.service_provider', 'sp')
        .leftJoinAndSelect('proposal.service_request', 'sr')
        .leftJoinAndSelect('sr.service_types', 'st')
        .leftJoinAndSelect('sr.created_by', 'created_by')
        .where('sr.id = :serviceRequestId AND sp.id = :serviceProviderId', {
          serviceRequestId,
          serviceProviderId,
        })
        .getOne();
      if (!proposal) {
        throw new NotFoundException(
          'Request not found for this service provider',
        );
      }
      return proposal;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }
  async getProposalsByRequestId(serviceRequestId: string) {
    try {
      return this.proposalRepo
        .createQueryBuilder('proposal')
        .leftJoinAndSelect('proposal.service_request', 'sr')
        .leftJoinAndSelect('proposal.service_provider', 'sp')
        .where('sr.id = :id', { id: serviceRequestId })
        .select([
          'proposal.id',
          'sr.id',
          'sp.last_name',
          'sp.first_name',
          'sp.id',
        ])
        .getMany();
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async updateProposals(proposals: Proposal[]) {
    this.proposalRepo.save(proposals);
  }

  async initProposal(currentUser: User, initProposalDto: InitProposalDto) {
    const { service_request_id } = initProposalDto;
    const proposal = await this.getProposalBySRSP(
      service_request_id,
      currentUser.id,
    );
    const invoice_number = await this.generateInvoiceNumber();
    return { invoice_number };
  }

  async generateInvoiceNumber() {
    try {
      let invoiceNumber = null;
      do {
        const invoiceId = generateAlphaNumeric(8);
        const existing = await this.proposalRepo.findOne({
          where: { invoice_id: invoiceId },
        });
        if (existing) {
          return;
        }
        invoiceNumber = invoiceId;
      } while (invoiceNumber == null);
      return invoiceNumber;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async getProposalById(proposalId: string) {
    try {
      const proposal = await this.proposalRepo
        .createQueryBuilder('proposal')
        .leftJoinAndSelect('proposal.service_provider', 'sp')
        .leftJoinAndSelect('proposal.service_request', 'sr')
        .leftJoinAndSelect('sr.service_types', 'st')
        .leftJoinAndSelect('sr.created_by', 'created_by')
        .where('proposal.id = :id', { id: proposalId })
        .getOne();
      return proposal;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }
  async sendProposal(
    currentUser: User,
    serviceRequestId: string,
    sendProposalDto: SendProposalDto,
  ) {
    try {
      const { amount } = sendProposalDto;
      const proposal = await this.getProposalBySRSP(
        serviceRequestId,
        currentUser.id,
      );
      const serviceRequest = proposal.service_request;
      const serviceProvider = proposal.service_provider;
      const serviceTypes = serviceRequest.service_types;
      const client = serviceRequest.created_by;
      const minServiceFee = serviceTypes.reduce(
        (prev, current) =>
          prev < current.min_service_fee ? prev : current.min_service_fee,
        serviceTypes[0].min_service_fee,
      );
      if (amount < minServiceFee) {
        throw new HttpException(
          `The minimum service fee for ${
            serviceTypes.length > 1 ? 'these' : 'this'
          } service ${
            serviceTypes.length > 1 ? 'types' : 'type'
          } is ${minServiceFee}NGN`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (proposal.proposal_date) {
        throw new HttpException(
          'Proposal already sent to client',
          HttpStatus.BAD_REQUEST,
        );
      }
      proposal.proposal_date = new Date();
      proposal.amount = amount;
      proposal.proposal_amount = amount;
      proposal.service_request = serviceRequest;
      await this.proposalRepo.save(proposal);
      //send sample email to client
      await this.messagingService.sendEmail(
        EmailTemplate.sendProposal({
          email: client.email,
          firstName: client.first_name,
          serviceRequest,
          sp: serviceProvider,
        }),
      );
      //send Notification
      await this.notificationService.sendNotification({
        type: NotificationType.SERVICE_REQUEST_PROPOSAL,
        service_provider: serviceProvider,
        service_request: serviceRequest,
        subject: 'You have a new service request from a Client',
        owner: client,
      });
      //send to chat
      return new ResponseMessage('Proposal successfully sent');
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }
  async acceptProposal(
    currentUser: User,
    serviceRequestId: string,
    acceptProposalDto: AcceptProposalDto,
  ) {
    try {
      const { service_provider_id } = acceptProposalDto;
      const proposal = await this.getProposalBySRSP(
        serviceRequestId,
        service_provider_id,
      );
      const serviceRequest = proposal.service_request;
      // check service request in progress
      if (
        ['COMPLETED', 'PENDING', 'AWAITING_PAYMENT', 'IN_PROGRESS'].includes(
          serviceRequest.status,
        )
      ) {
        throw new HttpException(
          `Service request already ${normalizeEnum(serviceRequest.status)}`,
          HttpStatus.CONFLICT,
        );
      }
      const wallet = await this.walletService.getWalletBalance(currentUser);
      if (!proposal.proposal_date) {
        return new HttpException(
          'Service provider have not sent proposal yet',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        wallet.available_balance < proposal.proposal_amount
        // wallet.available_balance < proposal.proposal_amount
      ) {
        throw new HttpException(
          'You do not have sufficient balance to accept this proposal',
          HttpStatus.BAD_REQUEST,
        );
      }
      const balAfter = wallet.available_balance - proposal.proposal_amount;
      await this.walletService.acceptServiceRequestTransaction({
        description: serviceRequest.description,
        amount: proposal.proposal_amount,
        bal_after: balAfter,
        tnx_type: TransactionType.DEBIT,
        user: currentUser,
        is_client: true,
        is_sp: true,
      });
      const serviceProvider = proposal.service_provider;
      const client = proposal.service_request.created_by;
      await this.walletService.updateWalletBalance({
        user: currentUser,
        transactionType: TransactionType.DEBIT,
        amount: proposal.proposal_amount,
        description: 'Account is debited with and placed in escrow',
        walletToUpdate: 'client',
        escrow: proposal.amount,
        sendNotification: true,
        sendEmail: true,
        client,
        serviceProvider,
        serviceRequest,
        notificationType: NotificationType.ACCOUNT_DEBIT,
      });
      proposal.proposal_accept_date = new Date();
      proposal.status = ServiceRequestStatus.PENDING;
      proposal.service_request = serviceRequest;
      // await this.serviceRequestRepository.save({
      //   ...serviceRequest,
      //   status: ServiceRequestStatus.PENDING,
      // });
      await this.proposalRepo.save(proposal);
      //send sample email to client
      await this.messagingService.sendEmail(
        EmailTemplate.acceptProposal({
          email: serviceProvider.email,
          firstName: serviceProvider.first_name,
          serviceRequest,
          client,
        }),
      );
      //send Notification
      await this.notificationService.sendNotification({
        type: NotificationType.SERVICE_REQUEST_PROPOSAL,
        service_provider: serviceProvider,
        service_request: serviceRequest,
        subject: 'Your Service Request Proposal has been accepted by Client',
        owner: serviceProvider,
      });
      const delay = getMillisecondsDifference(serviceRequest.start_date);
      // send start proposal to queue
      await this.proposalQueue.add(
        START_PROPOSAL_PROCESS,
        {
          proposalId: proposal.id,
          serviceRequestId: serviceRequest.id,
        },
        { delay: delay },
      );
      return new ResponseMessage(
        'Service request proposal accepted successfully',
      );
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }
  async completeProposal(
    currentUser: User,
    serviceRequestId: string,
    completeProposalDto: CompleteProposalDto,
  ) {
    const {
      job_complete_note,
      job_complete_file_1,
      job_complete_file_2,
      job_complete_file_3,
      job_complete_file_4,
      job_complete_file_5,
      job_complete_file_6,
    } = completeProposalDto;

    const proposal = await this.getProposalBySRSP(
      serviceRequestId,
      currentUser.id,
    );
    const serviceRequest = proposal.service_request;
    // check if proposal have been accepted by service provider
    if (!proposal.proposal_accept_date) {
      return new HttpException(
        'You can only complete a service request that a client have accepted',
        HttpStatus.CONFLICT,
      );
    }
    // check if proposal has started
    if (proposal.status !== ServiceRequestStatus.IN_PROGRESS) {
      return new HttpException(
        'You can only complete a service request in progress',
        HttpStatus.CONFLICT,
      );
    }
    const serviceProvider = proposal.service_provider;
    const client = proposal.service_request.created_by;
    proposal.proposal_accept_date = new Date();
    proposal.status = ServiceRequestStatus.PENDING;
    proposal.service_request = serviceRequest;
    proposal.job_complete_note = job_complete_note;
    proposal.job_complete_file_1 = job_complete_file_1;
    proposal.job_complete_file_2 = job_complete_file_2;
    proposal.job_complete_file_3 = job_complete_file_3;
    proposal.job_complete_file_4 = job_complete_file_4;
    proposal.job_complete_file_5 = job_complete_file_5;
    proposal.job_complete_file_6 = job_complete_file_6;
    serviceRequest.status = ServiceRequestStatus.COMPLETED;
    // await this.serviceRequestRepository.save({
    //   ...serviceRequest,
    //   status: ServiceRequestStatus.COMPLETED,
    // });
    await this.proposalRepo.save(proposal);
    //send Notification
    await this.notificationService.sendNotification({
      type: NotificationType.PROPOSAL_COMPLETE,
      service_provider: serviceProvider,
      service_request: serviceRequest,
      subject: 'Service Request has been completed by Service provider',
      owner: client,
    });
    //send sample email to client
    await this.messagingService.sendEmail(
      EmailTemplate.completeProposal({
        serviceProvider: serviceProvider,
        serviceRequest,
        client,
      }),
    );
    return new ResponseMessage('Service request have been marked as completed');
  }
  async startProposal(proposalId: string) {
    try {
      const proposal = await this.getProposalById(proposalId);
      const serviceProvider = proposal.service_provider;
      const serviceRequest = proposal.service_request;
      const client = proposal.service_request.created_by;
      // update status
      proposal.status = ServiceRequestStatus.IN_PROGRESS;
      serviceRequest.status = ServiceRequestStatus.IN_PROGRESS;
      // await this.serviceRequestRepository.save(serviceRequest);
      await this.proposalRepo.save(proposal);
      // send Notification
      await this.notificationService.sendNotification({
        type: NotificationType.PROPOSAL_COMPLETE,
        service_provider: serviceProvider,
        service_request: serviceRequest,
        subject: 'Service Request has been started',
        owner: serviceProvider,
      });
      //send sample email to client
      await this.messagingService.sendEmail(
        EmailTemplate.startProposal({
          serviceProvider: serviceProvider,
          serviceRequest,
          client,
        }),
      );
      return;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }
}
