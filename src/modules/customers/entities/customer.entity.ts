import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';

export type CustomerType = 'NACIONAL' | 'EXTRANJERO' | 'GUBERNAMENTAL';

/** Cliente importador (M2). RNC/cédula validado por modulo 11 DGII. */
@Entity({ name: 'customers', schema: SchemaNames.IMPORTCORE })
export class Customer extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Index({ unique: true })
  @Column({ name: 'tax_id', type: 'varchar', length: 20 })
  taxId: string;

  @Column({ name: 'customer_type', type: 'varchar', length: 20, default: 'NACIONAL' })
  customerType: CustomerType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
