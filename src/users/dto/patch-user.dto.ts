import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Gender } from '../interfaces/user.interface';

export class PatchUserDto {
  @IsString()
  @IsOptional()
  first_name: string;

  @IsString()
  @IsOptional()
  last_name: string;

  @IsArray()
  @IsOptional()
  service_types?: string[];

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avai_status?: string;

  @IsString()
  @IsOptional()
  loc_state?: string;

  @IsString()
  @IsOptional()
  loc_country?: string;

  @IsString()
  @IsOptional()
  loc_geo?: string;

  @IsString()
  @IsOptional()
  loc_add?: string;

  @IsString()
  @IsOptional()
  loc_postcode?: string;

  @IsString()
  @IsOptional()
  loc_land_mark?: string;

  @IsString()
  @IsOptional()
  loc_street?: string;

  @IsString()
  @IsOptional()
  loc_city?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  loc_lga?: string;

  @IsString()
  @IsOptional()
  loc_town?: string;

  @IsString()
  @IsOptional()
  loc_region?: string;

  @IsString()
  @IsOptional()
  profession?: string;

  @IsString()
  @IsOptional()
  photo_uri?: string;
}
