import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  stateProvince?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  houseNumber?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdateAddressDto extends CreateAddressDto {}
