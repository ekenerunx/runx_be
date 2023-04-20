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
  UseGuards,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ServiceRequestService } from './service-request.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { Roles } from 'src/decorators/roles.decorator';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { SRSPQueryDto } from './dto/sr-sp.dto';
import { ClientServiceRequestQueryDto } from './dto/client-service-request.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { ServiceRequest } from 'src/entities/service-request.entity';
import { PatchServiceRequestDto } from './dto/patch-service-request.dto';
import { RaiseDisputeDto } from './dto/raise-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Controller('service-requests')
export class ServiceRequestController {
  constructor(private readonly serviceRequestsService: ServiceRequestService) {}

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
}
