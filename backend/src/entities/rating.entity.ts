import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ServiceRequestProposal } from './service-request-proposal.entity';
import { Reviewer } from 'src/rating/rating.interface';

@Entity()
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  star: number;

  @Column({ nullable: true })
  review: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.ratings)
  @JoinColumn({ name: 'user_id' })
  created_by: User;

  @Column({ type: 'enum', enum: Reviewer, nullable: true })
  reviewer: Reviewer;

  @ManyToOne(() => ServiceRequestProposal)
  @JoinColumn({ name: 'proposal_id' })
  proposal: ServiceRequestProposal;
}
