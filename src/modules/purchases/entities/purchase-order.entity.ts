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
import { Order } from '../../orders/entities/order.entity';

export type PurchaseStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'SENT'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'CANCELLED';

/** Orden de compra al proveedor (CxP, Fase 2). */
@Entity({ name: 'purchase_orders', schema: SchemaNames.IMPORTCORE })
export class PurchaseOrder extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'po_number', type: 'varchar', length: 30 })
  poNumber: string;

  @ManyToOne(() => Vendor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  /** Pedido de venta asociado, si la compra es para un pedido especifico. */
  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: PurchaseStatus;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'total_usd', type: 'decimal', precision: 14, scale: 4, default: '0' })
  totalUsd: string;

  @Column({ name: 'items_snapshot', type: 'jsonb', nullable: true })
  itemsSnapshot: unknown;

  @Column({ name: 'expected_date', type: 'date', nullable: true })
  expectedDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
