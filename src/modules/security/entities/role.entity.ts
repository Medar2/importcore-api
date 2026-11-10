import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { Permission } from './permission.entity';
import type { User } from './user.entity';
import type { Organization } from '../../organization/entities/organization.entity';
import type { RolePermission } from './role-permission.entity';

@Entity({ name: 'role', schema: SchemaNames.SECURITY })
@Index(['organizationId', 'name'], { unique: true })
export class Role extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_system_role', default: false })
  isSystemRole: boolean;

  @Column({ length: 7, default: '#64748b' })
  color: string;

  // Multitenancy fields
  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ name: 'is_global', default: false })
  isGlobal: boolean;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @ManyToOne('Organization', (org: Organization) => org.roles, {
    nullable: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permission',
    schema: SchemaNames.SECURITY,
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @OneToMany('RolePermission', (rp: RolePermission) => rp.role)
  rolePermissions: RolePermission[];

  @ManyToMany('User', (user: User) => user.roles)
  users: User[];
}
