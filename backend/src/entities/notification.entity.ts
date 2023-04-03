import { NotificationType } from 'src/notification/interface/notification.interface';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ServiceRequest } from './service-request.entity';

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

  @Column({ enum: NotificationType })
  type: NotificationType;

  @Column({ nullable: true })
  credit_amount: number;

  @Column({ nullable: true })
  withdrawal_amount: number;

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
