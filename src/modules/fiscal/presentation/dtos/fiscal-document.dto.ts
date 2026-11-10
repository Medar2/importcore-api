import {
  IsBoolean,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CANCELLATION_TYPES, INCOME_TYPES } from '../../domain/dgii-catalogs';
import type { CancellationType, ECfType, IncomeType } from '../../domain/dgii-catalogs';

const SALE_ECF_TYPES: ECfType[] = ['31', '32', '44', '45', '46'];

export class EmitOrderInvoiceDto {
  @IsUUID()
  orderId: string;

  /** Si se omite: 31 con RNC, 45 gubernamental, 32 consumo. */
  @IsOptional()
  @IsIn(SALE_ECF_TYPES)
  ecfType?: ECfType;

  /** Default true: el total del pedido es precio final con ITBIS. */
  @IsOptional()
  @IsBoolean()
  pricesIncludeItbis?: boolean;

  @IsOptional()
  @IsNumberString()
  itbisRate?: string;

  /** DOP por USD. Si se omite, se usa la tasa registrada más reciente. */
  @IsOptional()
  @IsNumberString()
  exchangeRate?: string;

  @IsOptional()
  @IsIn(Object.keys(INCOME_TYPES))
  incomeType?: IncomeType;
}

export class CancelFiscalDocumentDto {
  @IsIn(Object.keys(CANCELLATION_TYPES))
  cancellationType: CancellationType;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
