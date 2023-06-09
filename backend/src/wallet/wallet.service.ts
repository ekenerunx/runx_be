import { PartialType } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { Transaction } from './../entities/transaction.entity';
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BankAccount } from 'src/entities/bank-account.entity';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { User } from 'src/entities/user.entity';
import { CatchErrorException } from 'src/exceptions';
import { PaymentProcessorService } from 'src/payment-processor/payment-processor.service';
import { verifyNamesInString } from 'src/common/utils';
import {
  AcceptServiceRequestTransaction,
  WalletBalance,
} from './interfaces/wallet.interface';
import { PaginationResponse } from 'src/common/interface';
import { paginate } from 'nestjs-typeorm-paginate';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly paymentProcessorService: PaymentProcessorService,
  ) {}

  async getWalletBalance(currentUser): Promise<WalletBalance> {
    try {
      const user = await this.userRepo
        .createQueryBuilder('user')
        .where('user.id = :id', { id: currentUser.id })
        .getOne();
      return {
        escrow: user.is_client
          ? user.client_wallet_escrow
          : user.sp_wallet_escrow,
        funding_pending: 0,
        withdrawable: 0,
        available_balance: user.is_client
          ? user.client_wallet_balance
          : user.sp_wallet_balance,
      };
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async transaction(
    currentUser,
    paginationQueryDto: PaginationQueryDto,
  ): PaginationResponse<Transaction> {
    try {
      const { limit, page } = paginationQueryDto;
      const queryBuilder = await this.transactionRepo
        .createQueryBuilder('trx')
        .leftJoinAndSelect('trx.user', 'owner')
        .where('owner.id = :id', { id: currentUser.id });
      return await paginate<Transaction>(queryBuilder, { limit, page });
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async addBankAccount(
    currentUser: User,
    addBankAccountDto: AddBankAccountDto,
  ): Promise<Partial<BankAccount>> {
    try {
      const { account_number, bank_code } = addBankAccountDto;

      const serverBankAccount =
        await this.paymentProcessorService.verifyBankAccountNumber(
          account_number,
          bank_code,
        );
      const isMatchedNames = verifyNamesInString(
        serverBankAccount.data.account_name,
        currentUser.first_name,
        currentUser.last_name,
      );
      if (!isMatchedNames) {
        throw new HttpException(
          'Bank account name does not match your profile account',
          HttpStatus.BAD_REQUEST,
        );
      }
      const existingBankAccount = await this.bankAccountRepo
        .createQueryBuilder('bk')
        .where('bk.user.id = :id', { id: currentUser.id })
        .where('bk.account_number = :id', {
          id: account_number,
        })
        .getOne();
      if (existingBankAccount) {
        throw new HttpException(
          'Bank account already exist for your account',
          HttpStatus.BAD_REQUEST,
        );
      }
      const newBankAccount = await this.bankAccountRepo.create({
        ...addBankAccountDto,
        account_name: serverBankAccount.data.account_name,
        user: currentUser,
      });
      const { user, ...rest } = await this.bankAccountRepo.save(newBankAccount);
      return rest;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async deleteBankAccount(bankAccountId: string) {
    try {
      const bankAccount = await this.bankAccountRepo
        .createQueryBuilder()
        .where('id = :id', { id: bankAccountId })
        .getOne();
      if (!bankAccount) {
        throw new NotFoundException('Bank account not found');
      }
      await this.bankAccountRepo
        .createQueryBuilder()
        .delete()
        .where('id = :id', { id: bankAccountId })
        .execute();
      return { message: 'bank account successfully removed' };
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async listBankAccount(currentUser: User) {
    try {
      const bankAccounts = await this.bankAccountRepo
        .createQueryBuilder('bk')
        .where('bk.user.id = :id', { id: currentUser.id })
        .getMany();
      return bankAccounts;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async acceptServiceRequestTransaction(trx: AcceptServiceRequestTransaction) {
    try {
      const transaction = await this.transactionRepo.create(trx);
      await this.transactionRepo.save(transaction);
      return;
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async updateWalletBalance(user: User, balance: number, escrow?: number) {
    const { is_client } = user;
    const balanceFields = is_client
      ? { client_wallet_balance: balance, client_wallet_escrow: escrow }
      : { sp_wallet_balance: balance, sp_wallet_escrow: escrow };
    const updatedRecord = await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set(balanceFields)
      .where('id = :id', { id: user.id })
      .returning('*')
      .execute();
    return updatedRecord.raw[0];
  }
}
