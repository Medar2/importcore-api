import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SchemaNames } from '../../../common/constants/schema.constants';

@Entity({ name: 'audit_log', schema: SchemaNames.SECURITY })
@Index(['userId', 'timestamp'])
@Index(['organizationId', 'timestamp'])
@Index(['action', 'timestamp'])
@Index(['result', 'timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  timestamp: Date;

  // Usuario que realizó la acción
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  // La migración inicial creó esta columna como "email" (no "user_email")
  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  userEmail: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  // Acción realizada
  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 200 })
  resource: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string | null;

  // Resultado
  @Column({
    type: 'enum',
    enum: ['success', 'failure', 'denied'],
  })
  result: 'success' | 'failure' | 'denied';

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  // Contexto
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    permissionChecked?: string;
    policyEvaluated?: string;
    delegationUsed?: boolean;
    provisionalPermission?: boolean;
    [key: string]: any;
  } | null;

  // Información de request
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  method: string | null;

  @Column({ type: 'text', nullable: true })
  endpoint: string | null;
}
