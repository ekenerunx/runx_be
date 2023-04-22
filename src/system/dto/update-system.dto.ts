import { IsOptional } from 'class-validator';

export class UpdateSystemDto {
  @IsOptional()
  allow_withrawal: boolean;

  @IsOptional()
  service_fee: number;
}
