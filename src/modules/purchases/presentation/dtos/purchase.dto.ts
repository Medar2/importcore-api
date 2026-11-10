import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { PurchasePaymentMethod } from '../../entities/purchase-payment.entity';

const METHODS: PurchasePaymentMethod[] = ['TRANSFER', 'CASH', 'CHECK', 'CARD', 'OTHER'];
const STATUSES = ['DRAFT', 'CONFIRMED', 'SENT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'] as const;

export class CreatePurchaseOrderDto {
  @IsUUID()
  vendorId: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsNumberString()
  totalUsd?: string;

  @IsOptional()
  items?: unknown;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsNumberString()
  totalUsd?: string;

  @IsOptional()
  items?: unknown;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RegisterPurchasePaymentDto {
  @IsNotEmpty()
  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsIn(['USD', 'DOP', 'CNY'])
  currency?: string;

  @IsOptional()
  @IsNotEmpty()
  exchangeRateToUsd?: string;

  @IsOptional()
  @IsIn(METHODS)
  method?: PurchasePaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
