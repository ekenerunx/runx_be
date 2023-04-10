import { IsEnum, IsString, IsUUID } from 'class-validator';
import { Disputant } from '../interfaces/service-requests.interface';

export class RaiseDisputeDto {
  @IsEnum(Disputant)
  disputant: Disputant;

  @IsUUID('all')
  service_provider_id: string;

  @IsString()
  dispute_reason: string;
}
