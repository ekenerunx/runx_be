import { IsArray, IsUUID } from 'class-validator';

export class SendServiceRequestInvitationsDto {
  @IsArray()
  service_providers: string[];

  @IsUUID()
  service_request_id: string;
}
