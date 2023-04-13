import { SendProposalDto } from './dto/send-proposal.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guide';
import { User } from 'src/entities/user.entity';
import { UserRoles } from '../users/interfaces/user.interface';
import { RoleGuard } from '../guards/role.guard';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { Roles } from 'src/decorators/roles.decorator';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { SRSPQueryDto } from './dto/sr-sp.dto';
import { ClientServiceRequestQueryDto } from './dto/client-service-request.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { ServiceRequest } from 'src/entities/service-request.entity';
import { SendServiceRequestInvitationsDto } from './dto/send-service-request-invitation.dto';
import { PatchServiceRequestDto } from './dto/patch-service-request.dto';
import { AcceptProposalDto } from './dto/accept-proposal.dto';
import { CompleteProposalDto } from './dto/complete-proposal.dto';
import { startProposal } from 'src/common/email-template/start-proposal';
import { RaiseDisputeDto } from './dto/raise-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { SPJobQueryDto } from './dto/sp-job.query.dto';
import { GiveReviewDto } from './dto/give-review.dto';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT)
  async create(
    @CurrentUser() user: User,
    @Body() createServiceRequestDto: CreateServiceRequestDto,
  ) {
    const res = await this.serviceRequestsService.create(
      createServiceRequestDto,
      user,
    );
    return res;
  }

  @Get('id/:serviceRequestId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT, UserRoles.ADMIN, UserRoles.SERVICE_PROVIDER)
  async getServiceRequestById(
    @Param('serviceRequestId') serviceRequestId: string,
  ) {
    return await this.serviceRequestsService.getServiceRequestById(
      serviceRequestId,
    );
  }

  @Patch('id/:serviceRequestId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT, UserRoles.ADMIN, UserRoles.SERVICE_PROVIDER)
  async patchServiceRequest(
    @Param('serviceRequestId') serviceRequestId: string,
    @Body() patchServiceRequestDto: PatchServiceRequestDto,
  ) {
    return await this.serviceRequestsService.patchServiceRequest(
      serviceRequestId,
      patchServiceRequestDto,
    );
  }

  @Get('client/stats')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT)
  async getServiceRequestStats(@CurrentUser() user: User) {
    return await this.serviceRequestsService.getClientStats(user);
  }

  @Get('sp/stats')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  async getSPStat(@CurrentUser() user: User) {
    return await this.serviceRequestsService.getSPStats(user);
  }

  @Get('/id/:serviceRequestId/service-providers')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT)
  async getServiceRequestServiceProviders(
    @CurrentUser() user: User,
    @Param('serviceRequestId') serviceRequestId: string,
    @Query() query: SRSPQueryDto,
  ) {
    return await this.serviceRequestsService.getSRServiceProviders(
      serviceRequestId,
      query,
    );
  }

  @Get('/client')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT)
  async getClientServiceRequests(
    @CurrentUser() user: User,
    @Query() query: ClientServiceRequestQueryDto,
  ): Promise<Pagination<ServiceRequest>> {
    return await this.serviceRequestsService.findServiceRequestsByUserAndStatus(
      user,
      query,
    );
  }
  @Get('/sp/jobs')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  async getSPJobs(
    @CurrentUser() user: User,
    @Query() query: SPJobQueryDto,
  ): Promise<Pagination<ServiceRequest>> {
    return await this.serviceRequestsService.findSPJobs(user, query);
  }

  @Post('/id/:serviceRequestId/send-invites')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT)
  async sendServiceRequestInvites(
    @CurrentUser() currentUser: User,
    @Param('serviceRequestId') serviceRequestId: string,
    @Body() sendServiceRequestInvitaionsDto: SendServiceRequestInvitationsDto,
  ) {
    return await this.serviceRequestsService.sendServiceRequestInvites(
      currentUser,
      serviceRequestId,
      sendServiceRequestInvitaionsDto,
    );
  }

  @Post('/id/:serviceRequestId/send-proposal')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  async sendProposal(
    @CurrentUser() currentUser: User,
    @Body() sendProposalDto: SendProposalDto,
    @Param('serviceRequestId') serviceRequestId: string,
  ) {
    return await this.serviceRequestsService.sendProposal(
      currentUser,
      serviceRequestId,
      sendProposalDto,
    );
  }

  @Post('/id/:serviceRequestId/accept-proposal')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT)
  @HttpCode(200)
  async acceptProposal(
    @CurrentUser() currentUser: User,
    @Body() acceptProposalDto: AcceptProposalDto,
    @Param('serviceRequestId') serviceRequestId: string,
  ) {
    return await this.serviceRequestsService.acceptProposal(
      currentUser,
      serviceRequestId,
      acceptProposalDto,
    );
  }

  @Post('/id/:serviceRequestId/complete-proposal')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  @HttpCode(200)
  async completeProposal(
    @CurrentUser() currentUser: User,
    @Body() completeProposalDto: CompleteProposalDto,
    @Param('serviceRequestId') serviceRequestId: string,
  ) {
    return await this.serviceRequestsService.completeProposal(
      currentUser,
      serviceRequestId,
      completeProposalDto,
    );
  }

  @Post('/proposal/:proposalId/start-proposal')
  @UseGuards(JwtAuthGuard, RoleGuard)
  // @Roles(UserRoles.CLIENT)
  @HttpCode(200)
  async startProposal(@Param('proposalId') proposalId: string) {
    return await this.serviceRequestsService.startProposal(proposalId);
  }

  @Post('/id/:serviceRequestId/raise-dispute')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  @HttpCode(200)
  async raiseDispute(
    @CurrentUser() currentUser: User,
    @Param('serviceRequestId') serviceRequestId: string,
    @Body() raiseDisputeDto: RaiseDisputeDto,
  ) {
    return await this.serviceRequestsService.raiseDispute(
      serviceRequestId,
      raiseDisputeDto,
    );
  }

  @Post('/id/:serviceRequestId/resolve-dispute')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.ADMIN)
  @HttpCode(200)
  async resolveDispute(
    @CurrentUser() currentUser: User,
    @Param('serviceRequestId') serviceRequestId: string,
    @Body() resolveDisputeDto: ResolveDisputeDto,
  ) {
    return await this.serviceRequestsService.resolveDispute(
      serviceRequestId,
      resolveDisputeDto,
    );
  }

  @Post('/give-review')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  @HttpCode(200)
  async giveReview(@Body() giveReviewDto: GiveReviewDto) {
    return await this.serviceRequestsService.giveReview(giveReviewDto);
  }
}
