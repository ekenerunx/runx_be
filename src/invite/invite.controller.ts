import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { InviteService } from './invite.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guide';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { User } from 'src/entities/user.entity';
import { RoleGuard } from 'src/guards/role.guard';
import { SendServiceRequestInvitationsDto } from 'src/service-request/dto/send-service-request-invitation.dto';
import { UserRoles } from 'src/users/interfaces/user.interface';

@Controller('invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post('/send-invites')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT)
  async sendServiceRequestInvites(
    @CurrentUser() currentUser: User,
    @Body() sendServiceRequestInvitaionsDto: SendServiceRequestInvitationsDto,
  ) {
    return await this.inviteService.sendInvites(
      currentUser,
      sendServiceRequestInvitaionsDto,
    );
  }
}
