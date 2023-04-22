import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class System {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 1 })
  system_id: number;

  @Column({ type: 'boolean', nullable: true })
  allow_withrawal: boolean;

  @Column({ type: 'json', nullable: true })
  supported_banks: object;

  @Column({ type: 'float', nullable: true })
  service_fee: number;
}
