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
import { User } from './user.entity';

@Entity({ name: 'permission_delegation', schema: SchemaNames.SECURITY })
@Index(['delegateId', 'isActive'])
@Index(['expiresAt'])
export class PermissionDelegation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delegator_id' })
  delegator: User;

  @Column({ name: 'delegator_id', type: 'uuid' })
  delegatorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delegate_id' })
  delegate: User;

  @Column({ name: 'delegate_id', type: 'uuid' })
  delegateId: string;

  @Column({ name: 'permission_codes', type: 'simple-array' })
  permissionCodes: string[];

  @Column({ name: 'starts_at', type: 'timestamp' })
  startsAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'revoked_by', type: 'uuid', nullable: true })
  revokedBy: string | null;

  @Column({ name: 'revocation_reason', type: 'text', nullable: true })
  revocationReason: string | null;
}
