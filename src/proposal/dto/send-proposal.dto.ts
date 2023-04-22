import { IsNumber, IsUUID } from 'class-validator';

export class SendProposalDto {
  @IsNumber()
  amount: number;

  @IsUUID()
  service_request_id: string;
}
