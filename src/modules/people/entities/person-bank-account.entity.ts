import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { BankAccountType } from './people.enums';
import { Person } from './person.entity';
import { Bank } from './bank.entity';

@Entity({ name: 'person_bank_account', schema: SchemaNames.PEOPLE })
export class PersonBankAccount extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'person_id', type: 'uuid' })
  personId: string;

  @ManyToOne(() => Person, (person) => person.bankAccounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @Column({ name: 'bank_id', type: 'uuid' })
  bankId: string;

  @ManyToOne(() => Bank, (bank) => bank.bankAccounts, {
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'bank_id' })
  bank: Bank;

  @Column({ name: 'account_number', type: 'varchar', length: 50 })
  accountNumber: string;

  @Column({
    name: 'account_type',
    type: 'enum',
    enum: BankAccountType,
    default: BankAccountType.SAVINGS,
  })
  accountType: BankAccountType;

  @Column({
    name: 'account_holder',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  accountHolder: string | null;

  @Column({
    name: 'identity_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  identityNumber: string | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;
}
