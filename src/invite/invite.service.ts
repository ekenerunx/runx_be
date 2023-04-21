import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { serviceRequestInvitationEmailTemplate } from 'src/common/email-template/sr-invitation-email';
import { Proposal } from 'src/entities/proposal.entity';
import { ServiceRequest } from 'src/entities/service-request.entity';
import { User } from 'src/entities/user.entity';
import { CatchErrorException } from 'src/exceptions';
import { MessagingService } from 'src/messaging/messaging.service';
import { NotificationService } from 'src/notification/notification.service';
import { ProposalService } from 'src/proposal/proposal.service';
import { SendInvitesDto } from 'src/service-request/dto/send-invites.dto';
import { ServiceRequestStatus } from 'src/service-request/interfaces/service-requests.interface';
import { ServiceRequestService } from 'src/service-request/service-request.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class InviteService {
  constructor(
    private readonly userService: UsersService,
    private readonly proposalService: ProposalService,
    private readonly messagingService: MessagingService,
    private readonly serviceRequestService: ServiceRequestService,
    private readonly notificationService: NotificationService,
  ) {}

  async sendInvites(
    currentUser: User,
    sendServiceRequestInvitaionsDto: SendInvitesDto,
  ) {
    try {
      const {
        service_providers,
        service_request_id,
        description,
        service_types,
        start_add,
        start_state,
        start_city,
        end_add,
        end_state,
        end_city,
        start_date,
        end_date,
      } = sendServiceRequestInvitaionsDto;
      const serviceProviders = await this.userService.getUsersById(
        service_providers,
      );

      let serviceRequest: ServiceRequest | null = null;

      if (service_request_id) {
        serviceRequest = await this.serviceRequestService.getServiceRequestById(
          service_request_id,
        );
      } else {
        const newRequest = await this.serviceRequestService.create(
          {
            description,
            service_types,
            start_add,
            start_state,
            start_city,
            end_add,
            end_state,
            end_city,
            start_date,
            end_date,
          },
          currentUser,
        );
        serviceRequest = newRequest;
      }
      if (serviceProviders.length !== service_providers.length) {
        throw new HttpException(
          'service provider contains incorrect user id',
          HttpStatus.BAD_REQUEST,
        );
      }

      const existingProposals =
        await this.proposalService.getProposalsByRequestId(service_request_id);

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
      await this.proposalService.updateProposals(proposals);
      // send invitation email

      await this.notificationService.sendNotifications(
        newUsers.map((u) => ({
          message: `${serviceRequest.service_types.join(', ')} / ${
            serviceRequest.created_by.first_name
          }`,
          subject: 'You have a new job invite from a Client',
          owner: u,
          client: serviceRequest.created_by,
          service_request: serviceRequest,
        })),
      );

      for (const user of newUsers) {
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
}
