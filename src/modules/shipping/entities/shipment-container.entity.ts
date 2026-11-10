import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import type { ContainerType } from '../../landed-cost/domain/calculators/container-capacity';

export type ContainerStatus =
  | 'PLANNED'
  | 'LOADED'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'RETURNED';

/** Contenedor / embarque con tracking ETD-ETA-ATA y demurrage (M4). */
@Entity({ name: 'containers', schema: SchemaNames.IMPORTCORE })
export class ShipmentContainer extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'container_number', type: 'varchar', length: 20 })
  containerNumber: string;

  @Column({ name: 'container_type', type: 'varchar', length: 10 })
  containerType: ContainerType;

  @Column({ type: 'varchar', length: 20, default: 'PLANNED' })
  status: ContainerStatus;

  @Column({ name: 'seal_number', type: 'varchar', length: 30, nullable: true })
  sealNumber: string | null;

  @Column({ name: 'bl_number', type: 'varchar', length: 50, nullable: true })
  blNumber: string | null;

  /** Fechas criticas del ciclo logistico. */
  @Column({ name: 'etd', type: 'date', nullable: true })
  etd: string | null;

  @Column({ name: 'eta', type: 'date', nullable: true })
  eta: string | null;

  @Column({ name: 'ata', type: 'date', nullable: true })
  ata: string | null;

  /** Dias libres de demurrage en puerto antes de generar costo. */
  @Column({ name: 'demurrage_free_days', type: 'int', default: 4 })
  demurrageFreeDays: number;

  /** Tarifa diaria de demurrage USD. */
  @Column({ name: 'demurrage_daily_rate_usd', type: 'decimal', precision: 10, scale: 2, default: '0' })
  demurrageDailyRateUsd: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
