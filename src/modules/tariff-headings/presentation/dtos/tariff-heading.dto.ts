import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTariffHeadingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  hsCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description: string;

  @IsOptional()
  @IsString()
  gravamenRate?: string;

  @IsOptional()
  @IsString()
  itbisRate?: string;

  @IsOptional()
  @IsString()
  selectivoRate?: string;
}

export class UpdateTariffHeadingDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  gravamenRate?: string;

  @IsOptional()
  @IsString()
  itbisRate?: string;

  @IsOptional()
  @IsString()
  selectivoRate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
