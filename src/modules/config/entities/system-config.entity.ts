import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';

@Entity({ name: 'system_config', schema: SchemaNames.CONFIG })
export class SystemConfig extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ length: 100, nullable: true })
  description: string;

  @Column({ length: 50, default: 'general' })
  group: string;
}
