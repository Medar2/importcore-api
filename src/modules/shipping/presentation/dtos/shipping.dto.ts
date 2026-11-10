import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { ContainerType } from '../../../landed-cost/domain/calculators/container-capacity';

const TYPES = ['20_ST', '40_ST', '40_HC', 'LCL'] as const;
const STATUSES = [
  'PLANNED',
  'LOADED',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
  'RETURNED',
] as const;

export class CreateContainerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  containerNumber: string;

  @IsIn(TYPES)
  containerType: ContainerType;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  sealNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  blNumber?: string;

  @IsOptional()
  @IsDateString()
  etd?: string;

  @IsOptional()
  @IsDateString()
  eta?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  demurrageFreeDays?: number;

  @IsOptional()
  @IsString()
  demurrageDailyRateUsd?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateContainerDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(30)
  sealNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  blNumber?: string;

  @IsOptional()
  @IsDateString()
  etd?: string;

  @IsOptional()
  @IsDateString()
  eta?: string;

  @IsOptional()
  @IsDateString()
  ata?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  demurrageFreeDays?: number;

  @IsOptional()
  @IsString()
  demurrageDailyRateUsd?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/** Payload del optimizador CBM (M4). */
export class OptimizeLoadDto {
  @IsNotEmpty()
  totalCbm: string;

  @IsNotEmpty()
  totalWeightKg: string;
}
