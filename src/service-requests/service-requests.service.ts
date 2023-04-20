import { CompleteProposalDto } from './dto/complete-proposal.dto';
import { SendProposalDto } from './dto/send-proposal.dto';
import { MessagingService } from './../messaging/messaging.service';
import { NotificationService } from './../notification/notification.service';
import { Proposal } from '../entities/proposal.entity';
import { ServiceRequest } from './../entities/service-request.entity';
import { SendServiceRequestInvitationsDto } from './dto/send-service-request-invitation.dto';
import {
  Disputant,
  DisputeResolveAction,
  DisputeResolver,
  DisputeStatus,
  ResolveDisputeQueueProcess,
  ServiceRequestStatus,
  StartServiceRequestJob,
} from 'src/service-requests/interfaces/service-requests.interface';
import { SRSPQueryDto } from './dto/sr-sp.dto';
import { ServiceTypesService } from 'src/services-types/service-types.service';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { User } from 'src/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { CatchErrorException } from 'src/exceptions';
import { ClientServiceRequestQueryDto } from './dto/client-service-request.dto';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';
import { InjectQueue } from '@nestjs/bull';
import {
  GET_SERVICE_REQUEST_BY_ID_FIELDS,
  RESOLVE_DISPUTE_PROCESS,
  SERVICE_REQUEST_QUEUE,
  START_SERVICE_REQUEST_PROCESS,
} from './service-request.constant';
import { Queue, Job } from 'bull';
import { PatchServiceRequestDto } from './dto/patch-service-request.dto';
import { serviceRequestInvitationEmailTemplate } from 'src/common/email-template/sr-invitation-email';
import { EmailTemplate } from 'src/common/email-template';
import { NotificationType } from 'src/notification/interface/notification.interface';
import { AcceptProposalDto } from './dto/accept-proposal.dto';
import { ResponseMessage } from 'src/common/interface/success-message.interface';
import { WalletService } from 'src/wallet/wallet.service';
import { TransactionType } from 'src/wallet/interfaces/transaction.interface';
import { getMillisecondsDifference } from './service-request.util';
import { normalizeEnum } from 'src/common/utils';
import { RaiseDisputeDto } from './dto/raise-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { SPJobQueryDto } from './dto/sp-job.query.dto';
import { Rating } from 'src/entities/rating.entity';

@Injectable()
export class ServiceRequestsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private serviceRequestRepository: Repository<ServiceRequest>,

    @InjectRepository(Proposal)
    private serviceRequestProposalRepository: Repository<Proposal>,
    @InjectRepository(Rating) private readonly ratingRepo: Repository<Rating>,

    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private serviceTypesService: ServiceTypesService,

    private readonly userService: UsersService,
    private readonly notificationService: NotificationService,

    @InjectQueue(SERVICE_REQUEST_QUEUE)
    private readonly serviceRequestQueue: Queue<
      StartServiceRequestJob | ResolveDisputeQueueProcess
    >,

    private readonly messagingService: MessagingService,
    private readonly walletService: WalletService,
  ) {}

  async create(createServiceRequestDto: CreateServiceRequestDto, user: User) {
    try {
      const { service_types } = createServiceRequestDto;
      const serviceTypes = await this.serviceTypesService.getServiceTypesByIds(
        service_types,
      );
      if (!serviceTypes.length) {
        throw new HttpException('Invalid service type', HttpStatus.BAD_REQUEST);
      }
      const request = await this.serviceRequestRepository.save({
        status: ServiceRequestStatus.NEW,
        ...createServiceRequestDto,
        service_types: serviceTypes,
        created_by: user,
      });
      return await this.getServiceRequestById(request.id);
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async patchServiceRequest(
    id: string,
    patchServiceRequestDto: PatchServiceRequestDto,
  ) {
    try {
      const request = await this.getServiceRequestById(id);
      const { service_types, ...__patchServiceRequestDto } =
        patchServiceRequestDto;
      if (service_types.length) {
        const serviceTypes =
          await this.serviceTypesService.getServiceTypesByIds(service_types);
        request.service_types = serviceTypes;
      }
      await this.serviceRequestRepository.save({
        ...request,
        ...__patchServiceRequestDto,
      });
      return await this.getServiceRequestById(request.id);
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async getServiceRequestById(id: string, isThrowError = true) {
    try {
      const serviceRequest = await this.serviceRequestRepository
        .createQueryBuilder('r')
        .leftJoinAndSelect('r.created_by', 'user')
        .leftJoinAndSelect('r.service_types', 'st')
        .where('r.id = :id', { id })
        .select(GET_SERVICE_REQUEST_BY_ID_FIELDS)
        .getOne();
      if (!serviceRequest && isThrowError) {
        throw new NotFoundException('Service Request not found');
      }
      return serviceRequest;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async getSRServiceProviders(
    serviceRequestId: string,
    query: SRSPQueryDto,
  ): Promise<Pagination<Partial<User>>> {
    const {
      state,
      city,
      price_from,
      price_to,
      rating,
      gender,
      profile_pic,
      page,
      limit,
    } = query;
    const request = await this.getServiceRequestById(serviceRequestId);
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.service_types', 'st')
      .where('user.is_sp = true')
      .andWhere('user.is_verified = true')
      // .andWhere('user.loc_state = :state', { state: request.start_state })
      // .andWhere('user.loc_city = :city', { city: request.start_city })
      .andWhere('st.id IN (:...serviceTypeIds)', {
        serviceTypeIds: request.service_types.map((st) => st.id),
      })
      .select([
        'user.id',
        'user.last_name',
        'user.first_name',
        'st.name',
        'user.email',
        'user.loc_state',
        'user.loc_city',
        'user.gender',
        'user.amount_per_hour',
        'st.id',
      ]);

    if (state) {
      queryBuilder.andWhere('user.loc_state = :state', { state: state });
    }

    if (city) {
      queryBuilder.andWhere('user.loc_city = :city', { city: city });
    }

    if (price_from) {
      queryBuilder.andWhere('user.amount_per_hour >= :price_from', {
        price_from: price_from,
      });
    }

    if (price_to) {
      queryBuilder.andWhere('user.amount_per_hour <= :price_to', {
        price_to: price_to,
      });
    }
    if (gender) {
      queryBuilder.andWhere('user.gender = :gender', { gender: gender });
    }

    // if (rating {
    //   queryBuilder.andWhere('sp.average_rating = :rating', { rating: rating });
    // }

    if (profile_pic) {
      queryBuilder.andWhere('user.photo_uri');
    }

    return await paginate<Partial<User>>(queryBuilder, { page, limit });
  }

  async getClientStats(user: User) {
    const validStatuses = Object.values(ServiceRequestStatus);
    const queryBuilder = this.serviceRequestRepository.createQueryBuilder('sr');
    const result = await queryBuilder
      .where('sr.created_by.id = :id', { id: user.id })
      .andWhere(`sr.status IN (:...statuses)`, { statuses: validStatuses })
      .groupBy('sr.status')
      .select('sr.status as status')
      .addSelect('COUNT(sr.id) as count')
      .getRawMany();
    // return validStatuses;
    const groupedRequests = {
      ...validStatuses.reduce((prev, item) => {
        return { ...prev, [item.toLowerCase()]: 0 };
      }, {}),
    };

    for (const item of result) {
      const status = item.status ? item.status.toLowerCase() : 'unknown';
      groupedRequests[status] = item.count || 10;
    }

    return groupedRequests;
  }

  async findServiceRequestsByUserAndStatus(
    user: User,
    query: ClientServiceRequestQueryDto,
  ): Promise<Pagination<ServiceRequest>> {
    const { status, page, limit } = query;
    const queryBuilder = this.serviceRequestRepository
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.service_types', 'st')
      .leftJoin('sr.created_by', 'created_by')
      .where('created_by.id = :id', { id: user.id });
    if (status) {
      queryBuilder.andWhere('sr.status = :status', { status });
    }
    return await paginate<ServiceRequest>(queryBuilder, { page, limit });
  }

  async sendServiceRequestInvites(
    currentUser: User,
    serviceRequestId: string,
    sendServiceRequestInvitaionsDto: SendServiceRequestInvitationsDto,
  ) {
    try {
      const { service_providers } = sendServiceRequestInvitaionsDto;
      const serviceRequest = await this.getServiceRequestById(serviceRequestId);
      const serviceProviders = await this.userService.getUsersById(
        service_providers,
      );

      if (serviceProviders.length !== service_providers.length) {
        throw new HttpException(
          'service provider contains incorrect user id',
          HttpStatus.BAD_REQUEST,
        );
      }

      const existingProposals = await this.serviceRequestProposalRepository
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

      const existingUsers = existingProposals.map(
        (proposal) => proposal.service_provider.id,
      );
      const newUsers = serviceProviders.filter(
        (sp) => !existingUsers.includes(sp.id),
      );

      if (!newUsers.length) {
        throw new HttpException(
          'Service providers have already been invited',
          HttpStatus.CONFLICT,
        );
      }
      const proposals = newUsers.map((user) => {
        const proposal = new Proposal();
        proposal.service_provider = user;
        proposal.service_request = serviceRequest;
        proposal.status = ServiceRequestStatus.INVITED;
        return proposal;
      });
      await this.serviceRequestProposalRepository.save(proposals);
      // send invitation email

      for (const user of newUsers) {
        // await this.notificationService.sendNotification({
        //   message: `${serviceRequest.service_types.join(', ')} / ${
        //     serviceRequest.created_by.first_name
        //   }`,
        //   subject: 'You have a new job invite from a Client',
        // });
        await this.messagingService.sendEmail(
          await serviceRequestInvitationEmailTemplate({
            serviceRequest,
            email: user.email,
            firstName: user.first_name,
            client: currentUser,
          }),
        );
      }

      return { message: 'Invitation successfully sent' };
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async getProposalBySRSP(serviceRequestId: string, serviceProviderId: string) {
    try {
      const proposal = await this.serviceRequestProposalRepository
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
  async getProposalById(proposalId: string) {
    try {
      const proposal = await this.serviceRequestProposalRepository
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
      await this.serviceRequestProposalRepository.save(proposal);

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
      const serviceRequest = await this.getServiceRequestById(serviceRequestId);

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

      const proposal = await this.getProposalBySRSP(
        serviceRequestId,
        service_provider_id,
      );
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
      await this.serviceRequestRepository.save({
        ...serviceRequest,
        status: ServiceRequestStatus.PENDING,
      });
      await this.serviceRequestProposalRepository.save(proposal);

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
      await this.serviceRequestQueue.add(
        START_SERVICE_REQUEST_PROCESS,
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
    const serviceRequest = await this.getServiceRequestById(serviceRequestId);
    const proposal = await this.getProposalBySRSP(
      serviceRequestId,
      currentUser.id,
    );

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

    await this.serviceRequestRepository.save({
      ...serviceRequest,
      status: ServiceRequestStatus.COMPLETED,
    });
    await this.serviceRequestProposalRepository.save(proposal);

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
      await this.serviceRequestRepository.save(serviceRequest);
      await this.serviceRequestProposalRepository.save(proposal);

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

  async raiseDispute(
    serviceRequestId: string,
    raiseDisputeDto: RaiseDisputeDto,
  ) {
    try {
      const { service_provider_id, disputant, dispute_reason } =
        raiseDisputeDto;
      const proposal = await this.getProposalBySRSP(
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

      const disputeQueue = await this.serviceRequestQueue.add(
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
      await this.serviceRequestProposalRepository.save(proposal);

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
    const proposal = await this.getProposalBySRSP(
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
    await this.serviceRequestProposalRepository.save(proposal);
    if (resolver === DisputeResolver.ADMIN) {
      const queueJob = await this.serviceRequestQueue.getJob(
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
