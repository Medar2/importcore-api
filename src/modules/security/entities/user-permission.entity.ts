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
import { Permission } from './permission.entity';

@Entity({ name: 'user_permission', schema: SchemaNames.SECURITY })
@Index(['userId', 'permissionId'])
@Index(['expiresAt'])
@Index(['nextReviewAt'])
export class UserPermission extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  @Column({ name: 'permission_id', type: 'uuid' })
  permissionId: string;

  // Tipo de permiso
  @Column({
    type: 'enum',
    enum: ['direct', 'provisional', 'temporary'],
    default: 'direct',
  })
  type: 'direct' | 'provisional' | 'temporary';

  // Contexto del permiso
  @Column({ type: 'jsonb', nullable: true })
  context: {
    organizationId?: string;
    projectId?: string;
    resourceId?: string;
    [key: string]: any;
  } | null;

  // Campos temporales
  @Column({ name: 'starts_at', type: 'timestamp', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  // Campos provisionales
  @Column({ type: 'text', nullable: true })
  justification: string | null;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    nullable: true,
  })
  approvalStatus: 'pending' | 'approved' | 'rejected' | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  conditions: {
    resourceIds?: string[];
    timeRestriction?: {
      startHour: number;
      endHour: number;
      daysOfWeek: number[];
    };
    ipWhitelist?: string[];
    [key: string]: any;
  } | null;

  // Campos de revisión periódica
  @Column({ name: 'review_period_days', type: 'int', nullable: true })
  reviewPeriodDays: number | null;

  @Column({ name: 'last_reviewed_at', type: 'timestamp', nullable: true })
  lastReviewedAt: Date | null;

  @Column({ name: 'next_review_at', type: 'timestamp', nullable: true })
  nextReviewAt: Date | null;
}
