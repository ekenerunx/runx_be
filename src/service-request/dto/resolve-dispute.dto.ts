import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  Disputant,
  DisputeResolver,
  DisputeResolveAction,
} from 'src/dispute/dispute.interface';

export class ResolveDisputeDto {
  @IsEnum(Disputant)
  disputant: Disputant;

  @IsEnum(DisputeResolver)
  @IsOptional()
  resolver: DisputeResolver = DisputeResolver.ADMIN;

  @IsUUID('all')
  service_provider_id: string;

  @IsEnum(DisputeResolveAction)
  dispute_resolve_action: DisputeResolveAction;

  @IsString()
  dispute_resolve_reason: string;
}
