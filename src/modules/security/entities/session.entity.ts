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

@Entity({ name: 'session', schema: SchemaNames.SECURITY })
@Index(['userId', 'isActive'])
@Index(['expiresAt'])
export class Session extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'refresh_token', type: 'varchar', length: 500, unique: true })
  refreshToken: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Información del dispositivo
  @Column({ name: 'device_name', type: 'varchar', length: 200, nullable: true })
  deviceName: string | null;

  @Column({ name: 'device_type', type: 'varchar', length: 50, nullable: true })
  deviceType: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  os: string | null;

  // Información de ubicación
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  // Última actividad
  @Column({ name: 'last_activity_at', type: 'timestamp' })
  lastActivityAt: Date;
}
