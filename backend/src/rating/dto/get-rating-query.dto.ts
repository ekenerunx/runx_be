import { IsEnum, IsOptional } from 'class-validator';
import { Reviewer } from '../rating.interface';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class GetRatingQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Reviewer)
  reviewer: Reviewer = Reviewer.SERVICE_PROVIDER;
}
