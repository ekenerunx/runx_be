import { IsNumber } from 'class-validator';

export class CreateTransactionPinDto {
  //   @Length(4, 4, { message: 'Pin must be exactly 4 digits long' })
  @IsNumber()
  pin: number;
}
