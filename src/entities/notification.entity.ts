import { NotificationType } from 'src/notification/interface/notification.interface';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ServiceRequest } from './service-request.entity';
import { Disputant } from 'src/dispute/dispute.interface';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ default: false })
  is_read: boolean;

  @Column({ nullable: true })
  message: string;

  @Column()
  subject: string;

  @Column({ type: 'enum', enum: NotificationType, nullable: true })
  type: NotificationType;

  @Column({ type: 'enum', enum: Disputant, nullable: true })
  disputant: Disputant;

  @Column({ nullable: true })
  credit_amount: number;

  @Column({ nullable: true })
  debit_amount: number;

  @Column({ nullable: true })
  proposal_amount: number;

  @Column({ nullable: true })
  invitation_amount: number;

  @ManyToOne(() => ServiceRequest)
  @JoinColumn()
  service_request: ServiceRequest;

  @ManyToOne(() => User)
  @JoinColumn()
  client: User;

  @ManyToOne(() => User)
  @JoinColumn()
  service_provider: User;

  @ManyToOne(() => User)
  @JoinColumn()
  owner: User;
}
