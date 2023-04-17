import { PaginationQueryDto } from './../common/dto/pagination-query.dto';
import { WalletBalance } from './interfaces/wallet.interface';
import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Param,
  Delete,
  HttpCode,
  Query,
} from '@nestjs/common';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guide';
import { RoleGuard } from 'src/guards/role.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserRoles } from 'src/users/interfaces/user.interface';
import { WalletService } from './wallet.service';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from 'src/entities/user.entity';
import { PaginationResponse } from 'src/common/interface';
import { Transaction } from 'src/entities/transaction.entity';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT, UserRoles.SERVICE_PROVIDER)
  @HttpCode(200)
  async walletBalance(
    @CurrentUser() currentUser: User,
  ): Promise<WalletBalance> {
    return await this.walletService.getWalletBalance(currentUser);
  }

  @Get('transaction')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.CLIENT, UserRoles.SERVICE_PROVIDER)
  @HttpCode(200)
  async transaction(
    @CurrentUser() currentUser: User,
    @Query() paginationQueryDto: PaginationQueryDto,
  ): PaginationResponse<Transaction> {
    return await this.walletService.transaction(
      currentUser,
      paginationQueryDto,
    );
  }

  @Post('bank-account/add')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  async addBankAccount(
    @Body() addBankAccountDto: AddBankAccountDto,
    @CurrentUser() currentUser: User,
  ) {
    return await this.walletService.addBankAccount(
      currentUser,
      addBankAccountDto,
    );
  }

  @Get('bank-account/list')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  async listBankAccount(@CurrentUser() currentUser: User) {
    return await this.walletService.listBankAccount(currentUser);
  }

  @Delete('bank-account/id/:bankAccountId')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRoles.SERVICE_PROVIDER)
  async deleteBankAccount(@Param('bankAccountId') bankAccountId: string) {
    return await this.walletService.deleteBankAccount(bankAccountId);
  }
}
