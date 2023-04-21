import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guide';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { User } from 'src/entities/user.entity';
import { RoleGuard } from 'src/guards/role.guard';
import { RaiseDisputeDto } from 'src/dispute/dto/raise-dispute.dto';
import { UserRoles } from 'src/users/interfaces/user.interface';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Controller('dispute')
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}
  @Post('/id/:serviceRequestId/raise-dispute')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  @HttpCode(200)
  async raiseDispute(
    @CurrentUser() currentUser: User,
    @Param('serviceRequestId') serviceRequestId: string,
    @Body() raiseDisputeDto: RaiseDisputeDto,
  ) {
    return await this.disputeService.raiseDispute(
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
    return await this.disputeService.resolveDispute(
      serviceRequestId,
      resolveDisputeDto,
    );
  }
}
