import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';

@Entity({ name: 'app_module', schema: SchemaNames.CONFIG })
export class AppModule extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ length: 50, default: 'general' })
  category: string;

  @Column({ name: 'route_prefix', type: 'varchar', length: 100, nullable: true })
  routePrefix: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /** Estado por defecto para organizaciones sin override */
  @Column({ name: 'enabled_by_default', default: true })
  enabledByDefault: boolean;
}
