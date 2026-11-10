import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import type { Role } from './role.entity';
import type { PermissionGroup } from './permission-group.entity';

@Entity({ name: 'permission', schema: SchemaNames.SECURITY })
export class Permission extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50 })
  module: string;

  @Column({ length: 50 })
  resource: string;

  @Column({ length: 50 })
  action: string;

  // Jerarquía de permisos (self-reference)
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne('Permission', (permission: Permission) => permission.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Permission;

  @OneToMany('Permission', (permission: Permission) => permission.parent)
  children: Permission[];

  // Grupo de permisos
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null;

  @ManyToOne('PermissionGroup', (group: PermissionGroup) => group.permissions, {
    nullable: true,
  })
  @JoinColumn({ name: 'group_id' })
  group: PermissionGroup;

  @ManyToMany('Role', (role: Role) => role.permissions)
  roles: Role[];
}
