import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import type { DecimalInput } from '../../../landed-cost/presentation/dtos/calculate-landed-cost-request.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  sku: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description: string;

  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsUUID()
  tariffHeadingId?: string;

  @IsInt()
  @Min(1)
  unitsPerBox: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  boxesPerPallet?: number;

  @IsNotEmpty()
  boxLengthM: DecimalInput;

  @IsNotEmpty()
  boxWidthM: DecimalInput;

  @IsNotEmpty()
  boxHeightM: DecimalInput;

  @IsOptional()
  @IsNotEmpty()
  boxGrossWeightKg?: DecimalInput;

  @IsOptional()
  @IsNotEmpty()
  unitFobPriceUsd?: DecimalInput;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsUUID()
  vendorId?: string | null;

  @IsOptional()
  @IsUUID()
  tariffHeadingId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerBox?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  boxesPerPallet?: number;

  @IsOptional()
  @IsNotEmpty()
  boxLengthM?: DecimalInput;

  @IsOptional()
  @IsNotEmpty()
  boxWidthM?: DecimalInput;

  @IsOptional()
  @IsNotEmpty()
  boxHeightM?: DecimalInput;

  @IsOptional()
  @IsNotEmpty()
  boxGrossWeightKg?: DecimalInput;

  @IsOptional()
  @IsNotEmpty()
  unitFobPriceUsd?: DecimalInput;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
