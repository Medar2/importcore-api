import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity({ name: 'role_permission', schema: SchemaNames.SECURITY })
@Index(['roleId', 'permissionId'], { unique: true })
export class RolePermission extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  @Column({ name: 'permission_id', type: 'uuid' })
  permissionId: string;

  // Contexto del permiso
  @Column({ type: 'jsonb', nullable: true })
  context: {
    organizationId?: string;
    projectId?: string;
    resourceId?: string;
    [key: string]: any;
  } | null;
}
