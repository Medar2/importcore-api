import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Decimal } from 'decimal.js';
import type { ContainerType } from '../../domain/calculators/container-capacity';
import type { ProrationBasis } from '../../domain/calculators/landed-cost-prorater';

/** Acepta string o numero; Decimal.Value preserva precision en runtime. */
export type DecimalInput = Decimal.Value;

export class QuoteItemRatesDto {
  /** Tasa de gravamen ad-valorem (ej. '0.20'). Requerida por partida. */
  @IsNotEmpty()
  gravamenRate: DecimalInput;

  @IsOptional()
  @IsNotEmpty()
  itbisRate?: DecimalInput;

  @IsOptional()
  @IsNotEmpty()
  selectivoRate?: DecimalInput;
}

export class QuoteItemDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  unitsPerBox: number;

  @IsInt()
  @Min(0)
  boxesCount: number;

  @IsNotEmpty()
  lengthM: DecimalInput;

  @IsNotEmpty()
  widthM: DecimalInput;

  @IsNotEmpty()
  heightM: DecimalInput;

  @IsNotEmpty()
  unitFobPriceUsd: DecimalInput;

  /** Peso bruto por caja (kg). Requerido solo si prorationBasis = WEIGHT. */
  @IsOptional()
  @IsNotEmpty()
  boxGrossWeightKg?: DecimalInput;

  @ValidateNested()
  @Type(() => QuoteItemRatesDto)
  rates: QuoteItemRatesDto;
}

export class CalculateQuoteRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  /** Flete maritimo total del contenedor (USD). */
  @IsNotEmpty()
  containerFreightUsd: DecimalInput;

  @IsOptional()
  @IsNotEmpty()
  containerInsuranceUsd?: DecimalInput;

  /** Gastos locales y comisiones bancarias del contenedor (USD). */
  @IsOptional()
  @IsNotEmpty()
  localExpensesUsd?: DecimalInput;

  @IsOptional()
  @IsNotEmpty()
  bankFeesUsd?: DecimalInput;

  /** Tipo de contenedor para derivar capacidad util. Alternativa: containerUsableCbm. */
  @IsOptional()
  @IsIn(['20_ST', '40_ST', '40_HC', 'LCL'])
  containerType?: ContainerType;

  /** Capacidad CBM util explicita (tiene prioridad sobre containerType). */
  @IsOptional()
  @IsNotEmpty()
  containerUsableCbm?: DecimalInput;

  /** Payload del contenedor para prorrateo por peso (default segun tipo). */
  @IsOptional()
  @IsNotEmpty()
  containerPayloadKg?: DecimalInput;

  @IsOptional()
  @IsIn(['WEIGHT', 'CBM', 'VALUE'])
  prorationBasis?: ProrationBasis;

  /** Markup % sobre costo landed para precio al cliente. */
  @IsOptional()
  @IsNotEmpty()
  markupPercent?: DecimalInput;
}
