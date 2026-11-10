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
import { User } from '../../security/entities/user.entity';

@Entity({ name: 'security_notification', schema: SchemaNames.SECURITY })
@Index(['userId', 'isRead'])
export class SecurityNotification extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: [
      'new_device',
      'failed_login',
      'permission_change',
      'delegation_created',
      'mfa_disabled',
    ],
  })
  type:
    | 'new_device'
    | 'failed_login'
    | 'permission_change'
    | 'delegation_created'
    | 'mfa_disabled';

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Column({ name: 'email_sent', default: false })
  emailSent: boolean;

  @Column({ name: 'email_sent_at', type: 'timestamp', nullable: true })
  emailSentAt: Date | null;
}
