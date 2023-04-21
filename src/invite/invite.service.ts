import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { serviceRequestInvitationEmailTemplate } from 'src/common/email-template/sr-invitation-email';
import { Proposal } from 'src/entities/proposal.entity';
import { User } from 'src/entities/user.entity';
import { CatchErrorException } from 'src/exceptions';
import { MessagingService } from 'src/messaging/messaging.service';
import { NotificationService } from 'src/notification/notification.service';
import { ProposalService } from 'src/proposal/proposal.service';
import { SendServiceRequestInvitationsDto } from 'src/service-request/dto/send-service-request-invitation.dto';
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
    sendServiceRequestInvitaionsDto: SendServiceRequestInvitationsDto,
  ) {
    try {
      const { service_providers, service_request_id } =
        sendServiceRequestInvitaionsDto;
      const serviceProviders = await this.userService.getUsersById(
        service_providers,
      );

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
      const serviceRequest =
        await this.serviceRequestService.getServiceRequestById(
          service_request_id,
        );
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
