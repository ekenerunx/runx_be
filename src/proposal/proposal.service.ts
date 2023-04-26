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
import {
  generateAlphaNumeric,
  normalizeEnum,
  paginateArray,
} from 'src/common/utils';
import { Proposal } from 'src/entities/proposal.entity';
import { User } from 'src/entities/user.entity';
import { CatchErrorException } from 'src/exceptions';
import { MessagingService } from 'src/messaging/messaging.service';
import { NotificationType } from 'src/notification/interface/notification.interface';
import { NotificationService } from 'src/notification/notification.service';
import { CompleteProposalDto } from 'src/proposal/dto/complete-proposal.dto';
import { ServiceRequestStatus } from 'src/service-request/interfaces/service-requests.interface';
import { getMillisecondsDifference } from 'src/service-request/service-request.util';
import { WalletService } from 'src/wallet/wallet.service';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { PROPOSAL_QUEUE, START_PROPOSAL_PROCESS } from './proposal.constant';
import { Queue } from 'bull';
import {
  ClientInvoice,
  InvoiceStatus,
  StartProposalJob,
} from './proposal.interface';
import { AcceptProposalDto } from './dto/accept-proposal.dto';
import { SendProposalDto } from './dto/send-proposal.dto';
import { SystemService } from 'src/system/system.service';
import { ServiceRequestService } from 'src/service-request/service-request.service';
import { PayServiceProviderDto } from './dto/pay-sp.dto';
import { UsersService } from 'src/users/users.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PaginationResponse } from 'src/common/interface';

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
    private readonly systemService: SystemService,
    private readonly serviceRequestService: ServiceRequestService,
    private readonly userService: UsersService,
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
    const systemData = await this.systemService.getSystem();
    const proposal = await this.getProposalBySRSP(
      service_request_id,
      currentUser.id,
    );
    if (proposal.invoice_id) {
      return {
        invoice_number: proposal.invoice_id,
        service_fee: systemData.service_fee,
      };
    } else {
      const invoice_number = await this.generateInvoiceNumber();
      proposal.invoice_id = invoice_number;
      const updatedProposal = await this.proposalRepo.save(proposal);
      return {
        invoice_number: updatedProposal.invoice_id,
        service_fee: systemData.service_fee,
      };
    }
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
  async sendProposal(currentUser: User, sendProposalDto: SendProposalDto) {
    try {
      const { amount, service_request_id, service_fee } = sendProposalDto;
      const proposal = await this.getProposalBySRSP(
        service_request_id,
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
      if (!proposal.invoice_id) {
        throw new HttpException(
          'Initialise invoice before sending proposal',
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
      proposal.proposal_amount = amount;
      proposal.proposal_service_fee = service_fee;
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
    acceptProposalDto: AcceptProposalDto,
  ) {
    try {
      const { service_provider_id, service_request_id } = acceptProposalDto;
      const proposal = await this.getProposalBySRSP(
        service_request_id,
        service_provider_id,
      );
      const serviceRequest = proposal.service_request;
      const serviceProvider = proposal.service_provider;
      const client = proposal.service_request.created_by;

      if (client.id !== currentUser.id) {
        return new HttpException(
          'You are not the owner of the service request',
          HttpStatus.BAD_REQUEST,
        );
      }
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

      if (!proposal.proposal_date) {
        return new HttpException(
          'Service provider have not sent proposal yet',
          HttpStatus.BAD_REQUEST,
        );
      }

      // accept proposal wallet action
      await this.walletService.acceptProposal(
        client,
        serviceProvider,
        proposal,
      );
      proposal.proposal_accept_date = new Date();
      proposal.status = ServiceRequestStatus.PENDING;
      proposal.service_request = serviceRequest;
      await this.serviceRequestService.updateServiceRequest({
        ...serviceRequest,
        status: ServiceRequestStatus.PENDING,
      });
      await this.proposalRepo.save(proposal);

      //send sample email to service provider
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
      service_request_id,
    } = completeProposalDto;

    const proposal = await this.getProposalBySRSP(
      service_request_id,
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
    await this.walletService.completeProposal(
      client,
      serviceProvider,
      proposal,
    );
    proposal.service_request = serviceRequest;
    proposal.job_complete_note = job_complete_note;
    proposal.job_complete_file_1 = job_complete_file_1;
    proposal.job_complete_file_2 = job_complete_file_2;
    proposal.job_complete_file_3 = job_complete_file_3;
    proposal.job_complete_file_4 = job_complete_file_4;
    proposal.job_complete_file_5 = job_complete_file_5;
    proposal.job_complete_file_6 = job_complete_file_6;
    proposal.job_complete_date = new Date();
    proposal.status = ServiceRequestStatus.COMPLETED;
    serviceRequest.status = ServiceRequestStatus.COMPLETED;
    await this.serviceRequestService.updateServiceRequest({
      ...serviceRequest,
      status: ServiceRequestStatus.COMPLETED,
    });
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
    return new ResponseMessage(
      'Service request have been marked as completed await client to release payment',
    );
  }

  async payServiceProvider(
    currentUser: User,
    payServiceProviderDto: PayServiceProviderDto,
  ) {
    const { service_provider_id, service_request_id, pin } =
      payServiceProviderDto;
    const proposal = await this.getProposalBySRSP(
      service_request_id,
      service_provider_id,
    );

    const serviceProvider = proposal.service_provider;
    const serviceRequest = proposal.service_request;
    const client = proposal.service_request.created_by;

    if (client.id !== currentUser.id) {
      return new HttpException(
        'You are not the owner of the service request',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!proposal.job_complete_date) {
      return new HttpException(
        'You can only make payment when service provider mark job as completed',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!proposal.job_complete_date) {
      return new HttpException(
        'You can only make payment when service provider mark job as completed',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (proposal.amount_paid_date) {
      return new HttpException(
        'Service provider already paid',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.userService.validateTransactionPin(currentUser, pin);
    await this.walletService.payServiceProvider(
      client,
      serviceProvider,
      proposal,
    );

    proposal.amount_paid_date = new Date();
    proposal.status = ServiceRequestStatus.COMPLETED;
    await this.proposalRepo.save(proposal);
    // send Notification
    await this.notificationService.sendNotification({
      type: NotificationType.CLIENT_RELEASED_FUND,
      service_provider: serviceProvider,
      service_request: serviceRequest,
      subject:
        'Service Request has been started aceeptte as completed and your fund has been paid',
      owner: serviceProvider,
    });

    //send email to service provider
    await this.messagingService.sendEmail(
      EmailTemplate.fundReleasedByClient({
        email: serviceProvider.email,
        serviceRequest,
        sp: serviceProvider,
        firstName: serviceProvider.first_name,
      }),
    );
    return new ResponseMessage('Service provider successfully paid');
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
      await this.serviceRequestService.updateServiceRequest(serviceRequest);
      await this.proposalRepo.save(proposal);

      // send Notification
      await this.notificationService.sendNotification({
        type: NotificationType.PROPOSAL_COMPLETE,
        service_provider: serviceProvider,
        service_request: serviceRequest,
        subject: 'Service Request has been started',
        owner: serviceProvider,
      });

      //send email to service provider
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

  async clientProposalInvoices(
    currentUser: User,
    paginationQueryDto: PaginationQueryDto,
  ): Promise<PaginationResponse<ClientInvoice>> {
    try {
      const { limit, page } = paginationQueryDto;
      const proposals = await this.proposalRepo
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.service_request', 'sr')
        .leftJoinAndSelect('sr.created_by', 'client')
        .leftJoinAndSelect('p.service_provider', 'sp')
        .where('client.id = :id', { id: currentUser.id })
        .getMany();
      let invoices: ClientInvoice[] = [];
      for (let i = 0; i < proposals.length; i++) {
        const p = proposals[i];
        if (p.invoice_id) {
          invoices.push({
            invoice_id: p.invoice_id,
            amount: p.proposal_amount,
            service_provider: {
              first_name: p.service_provider.first_name,
              last_name: p.service_provider.last_name,
              id: p.service_provider.id,
            },
            status: p.amount_paid_date
              ? InvoiceStatus.PAID
              : InvoiceStatus.UNPAID,
            date_paid: p.amount_paid_date,
            created_at: p.created_at,
            service_address: p.service_request.start_add,
          });
        }
      }
      return await paginateArray<ClientInvoice>(invoices, limit, page);
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }
}
