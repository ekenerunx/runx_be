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
import { VerifyBankAccountDto } from './dto/verify-bank-account.dto';
import { VerifyBankAccount } from 'src/payment-processor/interface/paystack.interface';
import { MakeDefaultBankAccountDto } from './dto/make-default-bank-account.dto';

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
    try {
      const transaction = await this.transactionRepo.create(__transaction);
      return await this.transactionRepo.save(transaction);
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
      const existingBankAccount = await this.bankAccountRepo
        .createQueryBuilder('bk')
        .leftJoinAndSelect('bk.user', 'user')
        .where('bk.user.id = :id', { id: currentUser.id })
        .where('bk.account_number = :id', {
          id: account_number,
        })
        .getOne();
      if (existingBankAccount) {
        if (existingBankAccount.user.id === currentUser.id) {
          throw new HttpException(
            'Bank account already exist for your account',
            HttpStatus.BAD_REQUEST,
          );
        }
        throw new HttpException(
          'Bank account already exists in our system. Please choose a different account or contact support for assistance',
          HttpStatus.CONFLICT,
        );
      }
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

  async verifyBankAccount(
    verifyBankAccountDto: VerifyBankAccountDto,
  ): Promise<Partial<VerifyBankAccount['data']>> {
    try {
      const { account_number, bank_code } = verifyBankAccountDto;
      return await this.paymentProcessorService
        .verifyBankAccountNumber(account_number, bank_code)
        .then((res) => res.data);
    } catch (error) {
      throw new CatchErrorException(error);
    }
  }

  async makeDefaultBankAccount(
    currentUser: User,
    makeDefaultBankAccountDto: MakeDefaultBankAccountDto,
  ): Promise<BankAccount[]> {
    try {
      const { id, is_default } = makeDefaultBankAccountDto;
      const bankAccounts = await this.bankAccountRepo.find({
        where: { user: { id: currentUser.id } },
      });
      const updatedBankAccounts = bankAccounts.map((b) =>
        b.id == id ? { ...b, is_default } : { ...b, is_default: false },
      );
      return this.bankAccountRepo.save(updatedBankAccounts);
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
    // const walletKey = `wallet:client:${clientId}`;
    // const cachedWallet = await this.redis.get(walletKey);
    // if (cachedWallet) {
    //   return JSON.parse(cachedWallet);
    // }
    const transactions = await this.transactionRepo.find({
      where: { client_id: clientId },
    });
    const {
      totalEscrow,
      totalFunding,
      totalWithdrawn,
      totalPendingFunding,
      totalPendingWithdrawal,
      totalServiceProviderPaid,
    } = transactions.reduce(
      (totals, trnx) => {
        if (
          trnx.tnx_type === TransactionType.ESCROW &&
          [TransactionStatus.NOT_SETTLED, TransactionStatus.HOLD].includes(
            trnx.status,
          )
        ) {
          totals.totalEscrow += trnx.total_amount;
        }
        if (
          trnx.tnx_type === TransactionType.ESCROW &&
          trnx.status === TransactionStatus.PAID_SERVICE_PROVIDER
        ) {
          totals.totalServiceProviderPaid += trnx.total_amount;
        }
        if (
          trnx.tnx_type === TransactionType.WITHDRAWAL &&
          trnx.status === TransactionStatus.SETTLED
        ) {
          totals.totalWithdrawn += trnx.amount;
        }
        if (
          trnx.tnx_type === TransactionType.WITHDRAWAL &&
          trnx.status === TransactionStatus.SETTLED
        ) {
          totals.totalWithdrawn += trnx.amount;
        }
        if (
          trnx.tnx_type === TransactionType.WITHDRAWAL &&
          trnx.status === TransactionStatus.NOT_SETTLED
        ) {
          totals.totalPendingWithdrawal += trnx.amount;
        }
        if (
          trnx.tnx_type === TransactionType.FUNDING &&
          trnx.status === TransactionStatus.SETTLED
        ) {
          totals.totalFunding += trnx.amount;
        }
        if (
          trnx.tnx_type === TransactionType.FUNDING &&
          trnx.status === TransactionStatus.NOT_SETTLED
        ) {
          totals.totalPendingFunding += trnx.amount;
        }
        return totals;
      },
      {
        totalEscrow: 0,
        totalFunding: 0,
        totalWithdrawn: 0,
        totalReversed: 0,
        totalPendingFunding: 0,
        totalPendingWithdrawal: 0,
        totalServiceProviderPaid: 0,
      },
    );
    const wallet = {
      available_balance:
        totalFunding -
        (totalEscrow +
          totalWithdrawn +
          totalPendingWithdrawal +
          totalServiceProviderPaid),
      escrow: totalEscrow,
      totalPendingFunding,
    };
    // await this.redis.set(walletKey, JSON.stringify(wallet), 'EX', 30);
    return wallet;
  }

  async computeServiceProviderWallet(spId: string): Promise<SpWallet> {
    // const walletKey = `wallet:sp:${spId}`;
    // const cachedWallet = await this.redis.get(walletKey);
    // if (cachedWallet) {
    //   return JSON.parse(cachedWallet);
    // }
    const transactions = await this.transactionRepo.find({
      where: { sp_id: spId },
    });
    let totalEscrow = 0;
    let totalFunding = 0;
    let totalPendingFunding = 0;
    let totalWithdrawn = 0;
    let totalHold = 0;
    let totalCompleted = 0;
    let totalPendingWithdrawal = 0;

    for (let i = 0; i < transactions.length; i++) {
      const trnx = transactions[i];
      if (
        trnx.tnx_type === TransactionType.ESCROW &&
        trnx.status === TransactionStatus.NOT_SETTLED
      ) {
        totalEscrow += trnx.amount;
      }
      if (
        trnx.tnx_type === TransactionType.ESCROW &&
        trnx.status === TransactionStatus.HOLD
      ) {
        totalHold += trnx.amount;
      }
      if (
        trnx.tnx_type === TransactionType.ESCROW &&
        trnx.status === TransactionStatus.PAID_SERVICE_PROVIDER
      ) {
        totalCompleted += trnx.amount;
      }
      if (
        trnx.tnx_type === TransactionType.FUNDING &&
        trnx.status === TransactionStatus.SETTLED
      ) {
        totalFunding += trnx.amount;
      }
      if (
        trnx.tnx_type === TransactionType.FUNDING &&
        trnx.status === TransactionStatus.NOT_SETTLED
      ) {
        totalPendingFunding += trnx.amount;
      }
      if (
        trnx.tnx_type === TransactionType.WITHDRAWAL &&
        trnx.status === TransactionStatus.SETTLED
      ) {
        totalWithdrawn += trnx.amount;
      }
      if (
        trnx.tnx_type === TransactionType.WITHDRAWAL &&
        trnx.status === TransactionStatus.SETTLED
      ) {
        totalPendingWithdrawal += trnx.amount;
      }
    }
    const availableBalance =
      totalCompleted + totalFunding - (totalWithdrawn + totalPendingWithdrawal);
    const wallet = {
      available_balance: availableBalance,
      escrow: totalEscrow,
      hold: totalHold,
    };
    // await this.redis.set(walletKey, JSON.stringify(wallet), 'EX', 30);
    return wallet;
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
      total_amount: proposal.proposal_amount + proposal.proposal_service_fee,
      service_fee: proposal.proposal_service_fee,
      tnx_type: TransactionType.ESCROW,
      status: TransactionStatus.NOT_SETTLED,
    });
  }

  async completeProposal(client: User, sp: User, proposal: Proposal) {
    const trnx = await this.transactionRepo.findOne({
      where: { client_id: client.id, sp_id: sp.id, proposal_id: proposal.id },
    });
    return await this.transactionRepo.save({
      ...trnx,
      status: TransactionStatus.HOLD,
      hold_date: new Date(),
    });
  }

  async reverseEscrowToClient(client: User, sp: User, proposal: Proposal) {
    const trnx = await this.transactionRepo.findOne({
      where: { client_id: client.id, sp_id: sp.id, proposal_id: proposal.id },
    });
    return await this.transactionRepo.save({
      ...trnx,
      status: TransactionStatus.REVERSED_TO_CLIENT,
      client_reversed_date: new Date(),
    });
  }

  async payServiceProvider(client: User, sp: User, proposal: Proposal) {
    const trnx = await this.transactionRepo.findOne({
      where: { client_id: client.id, sp_id: sp.id, proposal_id: proposal.id },
    });
    return await this.transactionRepo.save({
      ...trnx,
      status: TransactionStatus.PAID_SERVICE_PROVIDER,
      paid_sp_date: new Date(),
    });
  }

  async fundWallet(
    currentUser: User,
    fundWalletDto: FundWalletDto,
  ): Promise<Transaction> {
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
        client_id: currentUser.id,
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
