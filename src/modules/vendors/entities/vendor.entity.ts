import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';

/** Proveedor / fabricante en origen (M2). Generalmente China. */
@Entity({ name: 'vendors', schema: SchemaNames.IMPORTCORE })
export class Vendor extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'trade_name', type: 'varchar', length: 200, nullable: true })
  tradeName: string | null;

  @Column({ name: 'country_code', type: 'varchar', length: 2, default: 'CN' })
  countryCode: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contact: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'payment_terms', type: 'varchar', length: 100, nullable: true })
  paymentTerms: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Index()
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
