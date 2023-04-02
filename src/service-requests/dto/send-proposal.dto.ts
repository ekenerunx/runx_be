import { IsNumber } from 'class-validator';

export class SendProposalDto {
  @IsNumber()
  amount: number;
}
