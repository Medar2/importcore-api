import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBankDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
