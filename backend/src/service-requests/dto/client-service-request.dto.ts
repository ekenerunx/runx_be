import { ServiceRequestStatus } from 'src/service-requests/interfaces/service-requests.interface';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsEnum } from 'class-validator';
import { toNumber } from 'src/common/utils';

export class ClientServiceRequestQueryDto {
  @Transform(({ value }) => ServiceRequestStatus[value])
  @IsEnum(ServiceRequestStatus)
  @IsOptional()
  status: ServiceRequestStatus;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  page: number = 1;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  limit: number = 10;
}
