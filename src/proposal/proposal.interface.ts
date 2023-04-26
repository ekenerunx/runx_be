import { User } from 'src/entities/user.entity';

export interface StartProposalJob {
  serviceRequestId: string;
  proposalId: string;
}

export interface ClientInvoice {
  invoice_id: string;
  amount: number;
  service_provider: Pick<User, 'first_name' | 'last_name' | 'id'>;
  status: InvoiceStatus;
  date_paid: Date;
  created_at: Date;
  service_address: string;
}

export enum InvoiceStatus {
  'UNPAID' = 'UNPAID',
  'PAID' = 'PAID',
  'ESCROW' = 'ESCROW',
}
