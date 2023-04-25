import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ nullable: true })
  bank_name: string;

  @Column({ nullable: true })
  account_number: string;

  @Column()
  account_name: string;

  @ManyToOne(() => User, (user) => user.bank_accounts)
  user: User;


  @Column({default: false})
  is_default: boolean
}
