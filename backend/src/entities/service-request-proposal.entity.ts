import { Rating } from './rating.entity';
import { ServiceRequestStatus } from './../service-requests/interfaces/service-requests.interface';
import { User } from 'src/entities/user.entity';
import { ServiceRequest } from './service-request.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SharedEntity } from './shared.entity';

@Entity()
export class ServiceRequestProposal extends SharedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ServiceRequest, (sr) => sr.service_request_proposals)
  @JoinColumn()
  service_request: ServiceRequest;

  @ManyToOne(() => User, (user) => user.service_request_proposals)
  @JoinColumn()
  service_provider: User;

  // @OneToOne(() => Rating)
  // @JoinColumn()
  // client_rating: Rating;

  // @OneToOne(() => Rating)
  // @JoinColumn()
  // service_provider_rating: Rating;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  invite_date: Date;

  @Column({ nullable: true })
  invite_accept_date: Date;

  @Column({ nullable: true })
  invite_decline_date: Date;

  @Column({ nullable: true })
  invite_cancel_date: Date;

  @Column({ nullable: true })
  invite_cancel_reason: string;

  @Column({ nullable: true })
  amount: number;

  @Column({ enum: ServiceRequestStatus, default: ServiceRequestStatus.INVITED })
  status: ServiceRequestStatus;

  @Column({ nullable: true })
  proposal_date: Date;

  @Column({ nullable: true })
  proposal_accept_date: Date;

  @Column({ nullable: true })
  proposal_amount: number;

  @Column({ nullable: true })
  amount_paid: number;

  @Column({ nullable: true })
  amount_paid_date: Date;

  @Column({ nullable: true })
  dispute_date: string;

  @Column({ nullable: true })
  dispute_resolve_date: Date;

  @Column({ nullable: true })
  dispute_reason: string;

  @Column({ nullable: true })
  job_complete_date: Date;

  @Column({ nullable: true })
  job_complete_note: Date;

  @Column({ nullable: true })
  job_complete_file_1: string;

  @Column({ nullable: true })
  job_complete_file_2: string;

  @Column({ nullable: true })
  job_complete_file_3: string;

  @Column({ nullable: true })
  job_complete_file_4: string;

  @Column({ nullable: true })
  job_complete_file_5: string;

  @Column({ nullable: true })
  job_complete_file_6: string;
}
