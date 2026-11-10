import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

const emptyToUndefined = ({ value }: { value?: string }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class UpsertCompanyDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  stateProvince?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  sector?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(255)
  street?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(20)
  zipCode?: string;
}
