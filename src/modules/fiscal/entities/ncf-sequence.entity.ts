import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import type { ECfType } from '../domain/dgii-catalogs';

/**
 * Rango de e-NCF autorizado por la DGII para un tipo de comprobante.
 * Solo un rango activo por tipo; la asignación es atómica (ver repositorio).
 */
@Entity({ name: 'ncf_sequences', schema: SchemaNames.IMPORTCORE })
@Index(['ecfType'], { unique: true, where: '"is_active" = true' })
export class NcfSequence extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ecf_type', type: 'varchar', length: 2 })
  ecfType: ECfType;

  /** Último secuencial asignado (0 = ninguno). */
  @Column({ name: 'current_number', type: 'bigint', default: 0 })
  currentNumber: string;

  @Column({ name: 'end_number', type: 'bigint' })
  endNumber: string;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
