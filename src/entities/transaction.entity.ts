import { SharedEntity } from './shared.entity';
import { Column, Entity, Index } from 'typeorm';
import {
  TransactionStatus,
  TransactionType,
} from 'src/wallet/interfaces/transaction.interface';

@Entity()
export class Transaction extends SharedEntity {
  @Column({ nullable: true })
  description: string;

  @Column()
  amount: number;

  @Column({ default: 'NGN', nullable: true })
  curr_code: string;

  @Column({ type: 'enum', enum: TransactionType, nullable: true })
  tnx_type: TransactionType;

  @Column({ nullable: true })
  @Index()
  client_id: string;

  @Index()
  @Column({ nullable: true })
  sp_id: string;

  @Column({ nullable: true })
  proposal_id: string;

  @Column({ nullable: true })
  @Index()
  reference: string;

  @Column({ type: 'enum', enum: TransactionStatus, nullable: true })
  status: TransactionStatus;
}
