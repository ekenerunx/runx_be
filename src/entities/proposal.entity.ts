import {
  Disputant,
  DisputeResolveAction,
  DisputeStatus,
  ServiceRequestStatus,
} from '../service-request/interfaces/service-requests.interface';
import { User } from 'src/entities/user.entity';
import { ServiceRequest } from './service-request.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SharedEntity } from './shared.entity';
import { AppDataSource } from 'src/db/data-source';

@Entity()
export class Proposal extends SharedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ServiceRequest, (sr) => sr.service_request_proposals)
  @JoinColumn()
  service_request: ServiceRequest;

  @ManyToOne(() => User, (user) => user.service_request_proposals)
  @JoinColumn()
  service_provider: User;

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
  dispute_date: Date;

  @Column({ nullable: true })
  dispute_resolve_date: Date;

  @Column({ type: 'enum', enum: DisputeResolveAction, nullable: true })
  dispute_resolve_action: DisputeResolveAction;

  @Column({ nullable: true })
  dispute_resolve_reason: string;

  @Column({ nullable: true })
  dispute_reason: string;

  @Column({ enum: DisputeStatus, nullable: true })
  dispute_status: DisputeStatus;

  @Column({ nullable: true })
  dispute_queue_id: number;

  @Column({ type: 'enum', enum: Disputant, nullable: true })
  disputant: Disputant;

  @Column({ nullable: true })
  job_complete_date: Date;

  @Column({ nullable: true })
  job_complete_note: string;

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
