import { toNumber } from 'src/common/utils';
import { Transform } from 'class-transformer';
import { IsNumber, MaxLength } from 'class-validator';

export class ResetTransactionPinDto {
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  // @MaxLength(4, { message: 'Pin must be exactly 4 digits' })
  pin: number;

  // @MaxLength(4, { message: 'Code must be exactly 4 digits' })
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  code: number;
}
