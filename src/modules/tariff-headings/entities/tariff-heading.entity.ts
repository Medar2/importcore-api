import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';

/** Partida arancelaria DGA (M2). Tasas ad-valorem por codigo HS. */
@Entity({ name: 'tariff_headings', schema: SchemaNames.IMPORTCORE })
export class TariffHeading extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Codigo arancelario HS (ej. '8471.30', '9403.60'). */
  @Index({ unique: true })
  @Column({ name: 'hs_code', type: 'varchar', length: 20 })
  hsCode: string;

  @Column({ type: 'varchar', length: 300 })
  description: string;

  /** Tasa de gravamen ad-valorem (ej. '0.20' = 20%). */
  @Column({ name: 'gravamen_rate', type: 'decimal', precision: 8, scale: 4, default: '0' })
  gravamenRate: string;

  @Column({ name: 'itbis_rate', type: 'decimal', precision: 8, scale: 4, default: '0.18' })
  itbisRate: string;

  @Column({ name: 'selectivo_rate', type: 'decimal', precision: 8, scale: 4, default: '0' })
  selectivoRate: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
