import { IsString } from 'class-validator';

export class RequestPhoneVerificationDto {
  @IsString()
  phone_number: string;
}
