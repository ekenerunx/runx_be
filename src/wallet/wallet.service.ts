import {
  TransactionStatus,
  TransactionType,
} from 'src/wallet/interfaces/transaction.interface';
import { Repository } from 'typeorm';
import { Transaction } from './../entities/transaction.entity';
import {
  HttpException,
  HttpStatus,
  Inject,
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
  ClientWallet,
  SettleFundWalletTransaction,
  SpWallet,
} from './interfaces/wallet.interface';
import { PaginationResponse } from 'src/common/interface';
import { paginate } from 'nestjs-typeorm-paginate';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Proposal } from 'src/entities/proposal.entity';
import { FundWalletDto } from './dto/fund-wallet.dto';
import * as Redis from 'ioredis';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    private readonly paymentProcessorService: PaymentProcessorService,
    @Inject('REDIS_CLIENT')
    private redis: Redis.Redis,
  ) {}

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

  async createTransaction(__transaction: Partial<Transaction>) {
    const transaction = await this.transactionRepo.create(__transaction);
    return await this.transactionRepo.save(transaction);
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

  async computeClientWallet(clientId: string): Promise<ClientWallet> {
    const walletKey = `wallet:${clientId}`;
    const cachedWallet = await this.redis.get(walletKey);
    if (cachedWallet) {
      return JSON.parse(cachedWallet);
    }
    const transactions = await this.transactionRepo.find({
      where: { client_id: clientId },
    });
    const { totalEscrow, totalFunding, totalWithdrawal } = transactions.reduce(
      (totals, trnx) => {
        if (trnx.tnx_type === TransactionType.ESCROW) {
          totals.totalEscrow += trnx.amount;
        }
        if (trnx.tnx_type === TransactionType.WITHDRAWAL) {
          totals.totalWithdrawal += trnx.amount;
        }
        if (trnx.tnx_type === TransactionType.FUNDING) {
          totals.totalFunding += trnx.amount;
        }
        return totals;
      },
      { totalEscrow: 0, totalFunding: 0, totalWithdrawal: 0 },
    );
    const wallet = {
      available_balance: totalFunding - (totalEscrow + totalWithdrawal),
      escrow: totalEscrow,
    };
    await this.redis.set(walletKey, JSON.stringify(wallet), 'EX', 30);
    return wallet;
  }

  async computeServiceProviderWallet(spId: string): Promise<SpWallet> {
    const transactions = await this.transactionRepo.find({
      where: { sp_id: spId },
    });
    let totalEscrow,
      totalFunding,
      totalWithdrawal,
      totalHold = 0;
    for (let i; i < transactions.length; i++) {
      const trnx = transactions[i];
      if (trnx.tnx_type === TransactionType.ESCROW) {
        totalEscrow += trnx.amount;
      }
      if (trnx.tnx_type === TransactionType.HOLD) {
        totalHold += trnx.amount;
      }
      if (trnx.tnx_type === TransactionType.FUNDING) {
        totalFunding += trnx.amount;
      }
    }
    const availableBalance = totalFunding + (totalWithdrawal - totalEscrow);
    return {
      available_balance: availableBalance,
      escrow: totalEscrow,
      hold: totalHold,
    };
  }

  async acceptProposal(client: User, sp: User, proposal: Proposal) {
    const clientWallet = await this.computeClientWallet(client.id);
    if (proposal.proposal_amount > clientWallet.available_balance) {
      throw new HttpException(
        'Insufficient available wallet balance to accept proposal',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.createTransaction({
      client_id: client.id,
      sp_id: sp.id,
      proposal_id: proposal.id,
      amount: proposal.proposal_amount,
      tnx_type: TransactionType.ESCROW,
    });
  }

  async fundWallet(fundWalletDto: FundWalletDto): Promise<Transaction> {
    try {
      const trnx = await this.transactionRepo.findOne({
        where: { reference: fundWalletDto.reference },
      });
      if (trnx) {
        throw new HttpException(
          'Transaction with reference exist',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.createTransaction({
        ...fundWalletDto,
        tnx_type: TransactionType.FUNDING,
        status: TransactionStatus.NOT_SETTLED,
      });
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async settleFundWalletTransaction(
    payload: SettleFundWalletTransaction,
  ): Promise<Transaction> {
    const trnx = await this.transactionRepo.findOne({
      where: { reference: payload.reference },
    });
    if (trnx) {
      return await this.transactionRepo.save({
        ...trnx,
        status: TransactionStatus.SETTLED,
      });
    } else {
      throw new HttpException(
        'Transaction reference not found',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
