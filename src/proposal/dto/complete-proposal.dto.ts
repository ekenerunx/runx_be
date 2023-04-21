import { IsOptional, IsString } from 'class-validator';

export class CompleteProposalDto {
  @IsString()
  @IsOptional()
  job_complete_note: string;
  @IsString()
  @IsOptional()
  job_complete_file_1: string;
  @IsString()
  @IsOptional()
  job_complete_file_2: string;
  @IsString()
  @IsOptional()
  job_complete_file_3: string;
  @IsString()
  @IsOptional()
  job_complete_file_4: string;
  @IsString()
  @IsOptional()
  job_complete_file_5: string;
  @IsString()
  @IsOptional()
  job_complete_file_6: string;
}
