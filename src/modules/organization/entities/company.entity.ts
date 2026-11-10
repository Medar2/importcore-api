import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { Address } from '../../people/entities/address.entity';
import type { Organization } from './organization.entity';

@Entity({ name: 'company', schema: SchemaNames.ORGANIZATION })
export class Company extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', length: 150 })
  name: string;

  @Column({
    name: 'tax_id',
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: true,
  })
  taxId: string | null;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'website', type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ name: 'status', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({
    name: 'state_province',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  stateProvince: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sector: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  street: string | null;

  @Column({ name: 'zip_code', type: 'varchar', length: 20, nullable: true })
  zipCode: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @ManyToOne('Organization', { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'address_id', type: 'uuid', nullable: true })
  addressId: string | null;

  @ManyToOne('Address')
  @JoinColumn({ name: 'address_id' })
  address: Address;
}
