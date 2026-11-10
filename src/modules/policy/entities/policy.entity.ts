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
import type { Organization } from '../../organization/entities/organization.entity';

@Entity({ name: 'policy', schema: SchemaNames.SECURITY })
@Index(['isActive', 'priority'])
export class Policy extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ default: 0 })
  priority: number;

  // Aplicabilidad
  @Column({ type: 'simple-array', nullable: true })
  modules: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  resources: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  actions: string[] | null;

  // Condiciones (expresadas en formato evaluable)
  @Column({ type: 'jsonb' })
  conditions: {
    type: 'allow' | 'deny';
    rules: Array<{
      field: string;
      operator:
        'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
      value: any;
    }>;
    logic: 'AND' | 'OR';
  };

  // Multitenancy
  @ManyToOne('Organization', { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;
}
