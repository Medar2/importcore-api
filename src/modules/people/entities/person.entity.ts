import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { Gender, IdentityType, PersonType } from './people.enums';
import { Address } from './address.entity';

@Entity({ name: 'person', schema: SchemaNames.PEOPLE })
export class Person extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({
    name: 'last_name',
    type: 'varchar',
    length: 100,
    nullable: true,
    default: '',
  })
  lastName: string;

  @Column({
    name: 'commercial_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  commercialName: string | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date | null;

  @Column({ type: 'enum', enum: Gender, default: Gender.OTHER })
  gender: Gender;

  @Column({
    name: 'identity_type',
    type: 'enum',
    enum: IdentityType,
    default: IdentityType.CEDULA,
  })
  identityType: IdentityType;

  @Column({
    name: 'identity_number',
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: true,
  })
  identityNumber: string;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: true })
  email: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ name: 'mobile_phone', type: 'varchar', length: 20, nullable: true })
  mobilePhone: string | null;

  @Column({
    name: 'profile_image_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  profileImageUrl: string | null;

  @Column({
    name: 'person_type',
    type: 'enum',
    enum: PersonType,
    default: PersonType.INDIVIDUAL,
  })
  personType: PersonType;

  @Column({
    name: 'roles',
    type: 'simple-array',
    default: 'CLIENT',
  })
  roles: string[];

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @OneToMany('Address', (address: Address) => address.person, { cascade: true })
  addresses: Address[];

  @OneToMany('PersonBankAccount', (acc: any) => acc.person, { cascade: true })
  bankAccounts: any[];
}
