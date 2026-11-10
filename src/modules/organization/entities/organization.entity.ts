import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import type { User } from '../../security/entities/user.entity';
import type { Role } from '../../security/entities/role.entity';

@Entity({ name: 'organization', schema: SchemaNames.PEOPLE })
export class Organization extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 200 })
  name: string;

  @Column({ unique: true, length: 100 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Jerarquía organizacional
  @ManyToOne('Organization', (org: Organization) => org.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Organization;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @OneToMany('Organization', (org: Organization) => org.parent)
  children: Organization[];

  // Configuración
  @Column({ type: 'jsonb', default: {} })
  settings: {
    mfaRequired?: boolean;
    sessionTimeout?: number;
    passwordPolicy?: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    [key: string]: any;
  };

  // Relaciones
  @OneToMany('User', (user: User) => user.organization)
  users: User[];

  @OneToMany('Role', (role: Role) => role.organization)
  roles: Role[];
}
