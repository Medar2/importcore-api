import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SchemaNames } from '../../../common/constants/schema.constants';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { TariffHeading } from '../../tariff-headings/entities/tariff-heading.entity';

/** Producto importable con metricas de empaque para calculo CBM (BR-002). */
@Entity({ name: 'products', schema: SchemaNames.IMPORTCORE })
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 60 })
  sku: string;

  @Column({ type: 'varchar', length: 300 })
  description: string;

  @ManyToOne(() => Vendor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor | null;

  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendorId: string | null;

  @ManyToOne(() => TariffHeading, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tariff_heading_id' })
  tariffHeading: TariffHeading | null;

  @Column({ name: 'tariff_heading_id', type: 'uuid', nullable: true })
  tariffHeadingId: string | null;

  @Column({ name: 'units_per_box', type: 'int' })
  unitsPerBox: number;

  @Column({ name: 'boxes_per_pallet', type: 'int', nullable: true })
  boxesPerPallet: number | null;

  /** Dimensiones de caja empaque en metros. */
  @Column({ name: 'box_length_m', type: 'decimal', precision: 10, scale: 4 })
  boxLengthM: string;

  @Column({ name: 'box_width_m', type: 'decimal', precision: 10, scale: 4 })
  boxWidthM: string;

  @Column({ name: 'box_height_m', type: 'decimal', precision: 10, scale: 4 })
  boxHeightM: string;

  /** Peso bruto por caja (kg) para prorrateo WEIGHT. */
  @Column({ name: 'box_gross_weight_kg', type: 'decimal', precision: 10, scale: 4, nullable: true })
  boxGrossWeightKg: string | null;

  /** Precio unitario FOB tipico en USD. */
  @Column({ name: 'unit_fob_price_usd', type: 'decimal', precision: 14, scale: 4, nullable: true })
  unitFobPriceUsd: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
