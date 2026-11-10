import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { Person } from './person.entity';

@Entity({ name: 'address', schema: SchemaNames.PEOPLE })
export class Address extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, default: 'República Dominicana' })
  country: string;

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

  @Column({ name: 'house_number', type: 'varchar', length: 50, nullable: true })
  houseNumber: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @Column({ name: 'zip_code', type: 'varchar', length: 20, nullable: true })
  zipCode: string | null;

  @Column({ name: 'is_primary', type: 'boolean', default: true })
  isPrimary: boolean;

  @ManyToOne(() => Person, (person) => person.addresses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @Column({ name: 'person_id', type: 'uuid' })
  personId: string;
}
