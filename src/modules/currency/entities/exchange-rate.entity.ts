import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';

export type CurrencyCode = 'USD' | 'CNY' | 'DOP';

/**
 * Tasa de cambio diaria (BR-004). Cada conversión registra
 * source_amount, source_currency, exchange_rate y converted amounts.
 */
@Entity({ name: 'exchange_rates', schema: SchemaNames.IMPORTCORE })
@Index(['baseCurrency', 'quoteCurrency', 'effectiveDate'], { unique: true })
export class ExchangeRate extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'base_currency', type: 'varchar', length: 3 })
  baseCurrency: CurrencyCode;

  @Column({ name: 'quote_currency', type: 'varchar', length: 3 })
  quoteCurrency: CurrencyCode;

  /** DECIMAL(14,6):precision para cruces USD->CNY->DOP. */
  @Column({ type: 'decimal', precision: 14, scale: 6 })
  rate: string;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ type: 'varchar', length: 50, default: 'MANUAL' })
  source: string;
}
