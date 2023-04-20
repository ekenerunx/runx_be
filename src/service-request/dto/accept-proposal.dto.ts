import { IsNumber, IsUUID } from 'class-validator';

export class AcceptProposalDto {
  @IsUUID()
  service_provider_id: string;
}
