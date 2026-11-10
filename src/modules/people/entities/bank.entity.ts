import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import type { PersonBankAccount } from './person-bank-account.entity';

@Entity({ name: 'bank', schema: SchemaNames.PEOPLE })
export class Bank extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'code', type: 'varchar', length: 50, nullable: true })
  code: string | null;

  @Column({
    name: 'country',
    type: 'varchar',
    length: 100,
    default: 'República Dominicana',
  })
  country: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status: string;

  @OneToMany('PersonBankAccount', (acc: PersonBankAccount) => acc.bank)
  bankAccounts: PersonBankAccount[];
}
