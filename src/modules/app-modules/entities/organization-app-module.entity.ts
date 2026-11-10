import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { AppModule } from './app-module.entity';

/**
 * Scope sin organización (superadmin / global).
 * Se usa como organization_id cuando el usuario autenticado no pertenece
 * a una organización, de modo que el toggle aplique como valor por defecto.
 */
export const GLOBAL_MODULE_SCOPE_ID = '00000000-0000-0000-0000-000000000000';

@Entity({ name: 'organization_app_module', schema: SchemaNames.CONFIG })
@Unique(['organizationId', 'moduleId'])
export class OrganizationAppModule extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'module_id', type: 'uuid' })
  moduleId: string;

  @ManyToOne(() => AppModule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: AppModule;

  @Column({ default: true })
  enabled: boolean;
}
