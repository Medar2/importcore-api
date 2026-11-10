import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  GOODS_SERVICES_TYPES,
  ISR_WITHHOLDING_TYPES,
  PURCHASE_PAYMENT_METHODS,
} from '../../domain/dgii-catalogs';
import type {
  GoodsServicesType,
  IsrWithholdingType,
  PurchasePaymentMethodCode,
} from '../../domain/dgii-catalogs';

/** Comprobante de compra local recibido (fuente del 606). Montos en DOP. */
export class CreateFiscalPurchaseDto {
  @Matches(/^[\d-]{9,13}$/, { message: 'RNC/cedula del proveedor invalido' })
  supplierTaxId: string;

  @IsString()
  @MaxLength(200)
  supplierName: string;

  @IsIn(Object.keys(GOODS_SERVICES_TYPES))
  goodsServicesType: GoodsServicesType;

  @IsString()
  ncf: string;

  @IsOptional()
  @IsString()
  modifiedNcf?: string;

  @IsDateString()
  invoiceDate: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional() @IsNumberString() servicesAmount?: string;
  @IsOptional() @IsNumberString() goodsAmount?: string;
  @IsOptional() @IsNumberString() itbisBilled?: string;
  @IsOptional() @IsNumberString() itbisWithheld?: string;
  @IsOptional() @IsNumberString() itbisToCost?: string;
  @IsOptional() @IsNumberString() isrWithheld?: string;
  @IsOptional() @IsNumberString() selectiveTax?: string;
  @IsOptional() @IsNumberString() otherTaxes?: string;
  @IsOptional() @IsNumberString() legalTip?: string;

  @IsOptional()
  @IsIn(Object.keys(ISR_WITHHOLDING_TYPES))
  isrWithholdingType?: IsrWithholdingType;

  @IsIn(Object.keys(PURCHASE_PAYMENT_METHODS))
  paymentMethod: PurchasePaymentMethodCode;

  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
