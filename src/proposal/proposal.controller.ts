import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guide';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { User } from 'src/entities/user.entity';
import { RoleGuard } from 'src/guards/role.guard';
import { CompleteProposalDto } from 'src/proposal/dto/complete-proposal.dto';
import { UserRoles } from 'src/users/interfaces/user.interface';
import { AcceptProposalDto } from './dto/accept-proposal.dto';
import { SendProposalDto } from './dto/send-proposal.dto';
import { InitProposalDto } from './dto/init-proposal.dto';

@Controller('proposal')
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  @Post('/init')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  @HttpCode(200)
  async initProposal(
    @Body() initProposalDto: InitProposalDto,
    @CurrentUser() currentUser: User,
  ) {
    return await this.proposalService.initProposal(
      currentUser,
      initProposalDto,
    );
  }

  @Post('send')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  async sendProposal(
    @CurrentUser() currentUser: User,
    @Body() sendProposalDto: SendProposalDto,
  ) {
    return await this.proposalService.sendProposal(
      currentUser,

      sendProposalDto,
    );
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT)
  @HttpCode(200)
  async acceptProposal(
    @CurrentUser() currentUser: User,
    @Body() acceptProposalDto: AcceptProposalDto,
  ) {
    return await this.proposalService.acceptProposal(
      currentUser,

      acceptProposalDto,
    );
  }

  @Post('complete')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  @HttpCode(200)
  async completeProposal(
    @CurrentUser() currentUser: User,
    @Body() completeProposalDto: CompleteProposalDto,
  ) {
    return await this.proposalService.completeProposal(
      currentUser,
      completeProposalDto,
    );
  }

  @Post('start')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @HttpCode(200)
  async startProposal(@Param('proposalId') proposalId: string) {
    return await this.proposalService.startProposal(proposalId);
  }
}
