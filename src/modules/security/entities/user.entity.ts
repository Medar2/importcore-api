import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { Person } from '../../people/entities/person.entity';
import { Role } from './role.entity';
import type { PermissionDelegation } from './permission-delegation.entity';
import type { UserPermission } from './user-permission.entity';
import type { Organization } from '../../organization/entities/organization.entity';
import type { Session } from './session.entity';

@Entity({ name: 'user', schema: SchemaNames.SECURITY })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'is_superadmin', default: false })
  isSuperAdmin: boolean;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @OneToOne(() => Person)
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @Column({ name: 'person_id' })
  personId: string;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_role',
    schema: SchemaNames.SECURITY,
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  // MFA fields
  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'mfa_secret', nullable: true, type: 'text' })
  mfaSecret: string | null;

  @Column({ name: 'mfa_recovery_codes', type: 'simple-array', nullable: true })
  mfaRecoveryCodes: string[] | null;

  // Multitenancy field
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  // Relations
  @ManyToOne('Organization', (org: Organization) => org.users, {
    nullable: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany('Session', (session: Session) => session.user)
  sessions: Session[];

  @OneToMany('UserPermission', (up: UserPermission) => up.user)
  directPermissions: UserPermission[];

  @OneToMany('PermissionDelegation', (pd: PermissionDelegation) => pd.delegator)
  delegationsGiven: PermissionDelegation[];

  @OneToMany('PermissionDelegation', (pd: PermissionDelegation) => pd.delegate)
  delegationsReceived: PermissionDelegation[];
}
