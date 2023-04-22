import { IsString, IsUUID } from 'class-validator';

export class CancelProposalDto {
  @IsUUID()
  service_provider_id: string;

  @IsUUID()
  service_request_id: string;

  @IsString()
  proposal_cancel_reason: string;
}
