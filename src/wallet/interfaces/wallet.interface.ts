import { User } from 'src/entities/user.entity';
import { TransactionType } from './transaction.interface';

export interface WalletBalance {
  escrow: number;
  funding_pending: number;
  withdrawable: number;
  available_balance: number;
}

export interface AcceptServiceRequestTransaction {
  description: string;
  amount: number;
  bal_after: number;
  tnx_type: TransactionType;
  user: User;
  is_cleint: boolean;
  is_sp: boolean;
}
