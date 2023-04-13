import { User } from 'src/entities/user.entity';
import { TransactionType } from './transaction.interface';
import { ServiceRequest } from 'src/entities/service-request.entity';
import { NotificationType } from 'src/notification/interface/notification.interface';

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
  is_client: boolean;
  is_sp: boolean;
}

export interface UpdateWalletBalance {
  user: User;
  amount: number;
  walletToUpdate: 'client' | 'sp';
  escrow: number;
  transactionType: TransactionType;
  description: string;
  sendNotification?: boolean;
  sendEmail?: boolean;
  notificationType?: NotificationType;
  client: User;
  serviceProvider: User;
  serviceRequest: ServiceRequest;
}
