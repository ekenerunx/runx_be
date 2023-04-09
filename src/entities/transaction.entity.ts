import { SharedEntity } from './shared.entity';
import { Column, Entity, JoinTable, OneToOne, ManyToOne } from 'typeorm';
import { TransactionType } from 'src/wallet/interfaces/transaction.interface';
import { User } from './user.entity';

@Entity()
export class Transaction extends SharedEntity {
  @Column()
  description: string;

  @Column()
  amount: number;

  @Column({ default: 'NGN', nullable: true })
  curr_code: string;

  @Column()
  bal_after: number;

  @Column({ enum: TransactionType })
  tnx_type: TransactionType;

  @ManyToOne(() => User, (user) => user.transactions)
  user: User;
}
