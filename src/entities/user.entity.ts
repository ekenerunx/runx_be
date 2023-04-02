import { ServiceRequestProposal } from 'src/entities/service-request-proposal.entity';
import { ServiceRequest } from 'src/entities/service-request.entity';
import { ServiceType } from 'src/entities/service-type.entity';
import { Gender } from './../users/interfaces/user.interface';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Rating } from './rating.entity';
import { BankAccount } from './bank-account.entity';
import { Transaction } from './transaction.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ nullable: true, type: 'timestamp' })
  deleted_at?: Date;

  @Column({ nullable: true })
  is_deleted: boolean;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  is_admin: boolean;

  @Column({ nullable: true })
  is_client: boolean;

  @Column({ nullable: true })
  is_sp: boolean;

  @Column({ enum: Gender, nullable: true })
  gender: Gender;

  @Column({ type: 'bigint', unique: true, nullable: true })
  phone_number: string;

  @Column({ nullable: true })
  is_phone_verified: boolean;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  avai_status: string;

  @Column({ nullable: true, default: false })
  is_verified: boolean;

  @Column({ nullable: true })
  verified_at: Date;

  @Column({ nullable: true })
  loc_state: string;

  @Column({ nullable: true })
  loc_country: string;

  @Column({ nullable: true })
  loc_geo: string;

  @Column({ nullable: true })
  loc_add: string;

  @Column({ nullable: true })
  loc_postcode: string;

  @Column({ nullable: true })
  loc_land_mark: string;

  @Column({ nullable: true })
  loc_street: string;

  @Column({ nullable: true })
  loc_city: string;

  @Column({ nullable: true })
  loc_lga: string;

  @Column({ nullable: true })
  loc_town: string;

  @Column({ nullable: true })
  loc_region: string;

  @Column({ nullable: true })
  photo_uri: string;

  @Column({ nullable: true })
  ver_doc: string;

  @Column({ nullable: true })
  amount_per_hour: number;

  @Column({ nullable: true })
  trnx_pin: string;

  // relations
  @ManyToMany(() => ServiceType)
  @JoinTable()
  service_types: ServiceType[];

  @OneToMany(
    () => ServiceRequest,
    (serviceRequest) => serviceRequest.created_by,
  )
  service_requests: ServiceRequest[];

  @OneToMany(() => ServiceRequestProposal, (srp) => srp.service_provider)
  service_request_proposals: ServiceRequestProposal[];

  @Column({ default: 0 })
  sp_wallet_balance: number;

  @Column({ default: 0 })
  sp_wallet_escrow: number;

  @Column({ default: 0 })
  client_wallet_balance: number;

  @Column({ default: 0 })
  client_wallet_escrow: number;

  @OneToMany(() => BankAccount, (bankAccount) => bankAccount.user)
  bank_accounts: BankAccount[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];
}
