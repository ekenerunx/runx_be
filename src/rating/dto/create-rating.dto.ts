import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  Max,
  Min,
} from 'class-validator';
import { Reviewer } from '../rating.interface';

export class CreateRatingDto {
  @IsUUID()
  service_provider_id: string;

  @IsUUID()
  service_request_id: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  star: number;

  @IsOptional()
  @IsString()
  review: string;

  @IsEnum(Reviewer)
  reviewer: Reviewer;
}
