import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { CurrencyCode } from '../../entities/exchange-rate.entity';

const CURRENCIES: CurrencyCode[] = ['USD', 'CNY', 'DOP'];

export class UpsertExchangeRateDto {
  @IsIn(CURRENCIES)
  baseCurrency: CurrencyCode;

  @IsIn(CURRENCIES)
  quoteCurrency: CurrencyCode;

  /** Tasa: unidades de quoteCurrency por 1 unidad de baseCurrency. */
  @IsNotEmpty()
  rate: string;

  @IsDateString()
  effectiveDate: string;

  @IsOptional()
  @IsString()
  source?: string;
}
