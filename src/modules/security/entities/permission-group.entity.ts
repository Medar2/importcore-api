import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { Permission } from './permission.entity';

@Entity({ name: 'permission_group', schema: SchemaNames.SECURITY })
export class PermissionGroup extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50 })
  module: string;

  @OneToMany(() => Permission, (permission) => permission.group)
  permissions: Permission[];
}
